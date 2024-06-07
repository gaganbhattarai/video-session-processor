'use strict';

const config = require('../config');
const typedefs = require('../types/typedefs'); // eslint-disable-line no-unused-vars
const {getLogger} = require('../provider/logging');
const {streamFileToGCS} = require('../provider/storage');
const {
  getDocumentReference,
  saveFirestoreDocument,
  getCollectionReference,
  getSubCollectionReference,
  fetchSingleDocumentByCollectionRef,
  fetchSingleDocumentMatchingCondition,
} = require('../provider/firestore');
const {
  isValidRequest,
  isAuthenticated,
  hasValidRequestBody,
  validateUserOrganization,
} = require('./requestValidation');

const FUNCTION_NAME = config.get('firebase.function.name');
const STORAGE_BUCKET = config.get('cloud.bucket.name');
const QUESTIONNAIRE_DRAFT_COLLECTION = config.get(
  'firebase.firestore.questionnaireDraftCollection'
);
const RESPONDENT_STATUS_COLLECTION = config.get(
  'firebase.firestore.patientWiseStatusCollection'
);
const PATIENT_RESPONSE_COLLECTION = config.get(
  'firebase.firestore.responseCollection'
);
const SECTION_ANSWERS_COLLECTION = config.get(
  'firebase.firestore.sectionAnswersCollection'
);
const COMPLETED_SECTION_STATUS = config.get(
  'request.respondent.status.completed'
);
const AVAILABLE_SECTION_STATUS = config.get(
  'request.respondent.status.available'
);
const ORGANIZATION_COLLECTION = config.get(
  'firebase.firestore.organizationCollection'
);

const logger = getLogger(FUNCTION_NAME);

/**
 * Check if the answer is of valid type (and has corresponding question)
 *
 * @param {string} questionId
 * @param {Object.<string, typedefs.ProcessedAnswer>} answersAsDict Answer object with questionId as key
 * @param {string} answerType
 *
 * @return {Boolean} True if answer is valid otherwise False
 */
function hasValidAnswer(questionId, answersAsDict, answerType) {
  return (
    questionId in answersAsDict &&
    answersAsDict[questionId].answerType === answerType
  );
}

/**
 * Process the video response sent through HTTP request
 *
 * @async
 * @param {typedefs.ContactAnswer} videoAnswer
 * @param {string} bucketName Cloud Bucket name for uploads
 * @param {string} newFilePath Path to save data
 *
 * @return {Promise<[string, typedefs.ProcessedAnswer]|null>} List of processesd answers with corresponding questionId
 */
async function processVideoAnswer(videoAnswer, bucketName, newFilePath) {
  let videoStorageFilePath;

  const {
    answer_id: answerId,
    media_url: mediaUrl,
    question_id: questionId,
    type: answerType,
    transcription_data: answerTranscriptionData = [
      {words: undefined, confidence: undefined, transcript: undefined},
    ],
  } = videoAnswer;

  const videoFilename = `${answerId}.mp4`;

  // TODO Separate out to new function
  if (mediaUrl !== undefined) {
    await streamFileToGCS(mediaUrl, bucketName, videoFilename, newFilePath);
    logger.debug(
      `File ${videoFilename} from ${mediaUrl} uploaded to ${bucketName}`
    );
    videoStorageFilePath = `https://storage.cloud.google.com/${bucketName}/${newFilePath}${videoFilename}`;
  }

  const {
    words: transcribedWords,
    confidence: transcribedConfidence,
    transcript,
  } = answerTranscriptionData[0];

  return [
    questionId,
    {
      answerId,
      mediaUrl,
      videoFilename,
      videoStorageFilePath,
      answerType,
      transcribedWords,
      transcribedConfidence,
      transcript,
    },
  ];
}

/**
 * Get the question title from the request
 *
 * @param {String|any} questionTitle Title of the question in the request
 * @param {String|any} questionLabel Label of the question
 * @param {String|any} questionTranscription Trancription of the question
 *
 * @return {String} Returns a string value for the question title
 */
function getQuestionTitle(questionTitle, questionLabel, questionTranscription) {
  const QUESTION_LABEL_REPLACE = config.get(
    'request.question.label_word_to_replace'
  );
  const MAX_NO_OF_WORDS = config.get('request.question.max_num_of_words');

  const isString = (value) => {
    return value && typeof value === 'string';
  };

  if (isString(questionTitle) && questionTitle?.trim()) {
    return questionTitle;
  }
  if (isString(questionLabel)) {
    return questionLabel.replace(QUESTION_LABEL_REPLACE, '').trim();
  }
  if (isString(questionTranscription)) {
    const words = questionTranscription.split(' ');
    const title =
      words.length >= MAX_NO_OF_WORDS
        ? words.slice(0, MAX_NO_OF_WORDS).join(' ')
        : words.join(' ');
    return title;
  }
  return '';
}

/**
 * Generate answer object which has the required format
 *
 * @param {typedefs.FormQuestion[]} questions
 * @param {Object.<string, typedefs.ProcessedAnswer>} answerDict
 *
 * @return {typedefs.TransformedAnswer[]} Answer object with the required format
 */
function generateTransformedAnswerObjectList(questions, answerDict) {
  const answers = questions.map((question) => {
    const {
      question_id: questionId,
      title,
      transcription: questionTranscription,
      label: questionLabel,
    } = question;

    const questionTitle = getQuestionTitle(
      title,
      questionLabel,
      questionTranscription
    );

    return {
      questionId,
      questionTitle,
      questionLabel,
      ...answerDict[questionId],
    };
  });
  return answers;
}

/**
 * Generate custom ID for the section status Firestore sub collection
 *
 * @param {String} userId User ID of the respondent
 * @param {String} sectionId Section ID of the response
 *
 * @return {String} ID for section status sub collection
 */
function generateSectionStatusID(userId, sectionId) {
  return `${userId}_${sectionId}`;
}

/**
 * Update the Question response status for a user's response
 *
 * @async
 * @param {String} questionCollection The Firestore Question collection name
 * @param {String} respondentStatusCollection The respondent status sub collection name
 * @param {String} seriesId Response Series ID
 * @param {String} sectionStatusId Response section status ID
 * @param {String} status New response status
 * @param {FirebaseFirestore.CollectionReference} parentCollectionRef Collection reference of parent (if exists)
 *
 * @return {Promise<null>}
 */
async function updateRespondentQuestionStatus(
  questionCollection,
  respondentStatusCollection,
  seriesId,
  sectionStatusId,
  status,
  parentCollectionRef = null
) {
  // Fetch the parent collection data matching the required series id
  const questionDocDataSnapshot = await fetchSingleDocumentMatchingCondition(
    questionCollection,
    [{field: 'series_id', operator: '==', value: seriesId}],
    parentCollectionRef
  );
  // Fetch the respondent (patient) status sub collection reference
  // from the parent collection data
  const respondentStatusRef = getSubCollectionReference(
    respondentStatusCollection,
    questionDocDataSnapshot
  );

  // Fetch the respondent data from the status collection
  // for the particular id
  const respondentStatusDataSnapshot = await fetchSingleDocumentByCollectionRef(
    respondentStatusRef,
    [{field: 'id', operator: '==', value: sectionStatusId}]
  );

  await respondentStatusDataSnapshot.ref.update({
    sectionStatus: status,
  });

  return null;
}

/**
 * Update the data in response collection and corresponding section response sub collection
 *
 * @async
 * @param {String} responseCollection Name of response firebase collection
 * @param {String} sectionResponseCollection Name of section response firebase collection
 * @param {String} userId The user id of the respondent
 * @param {String} seriesId The response series ID
 * @param {Object} processedRequest Processed request object
 * @param {Object} processedSectionRequest Processed section request object
 * @param {FirebaseFirestore.CollectionReference} parentCollectionRef Collection reference of the parent (if exists)
 *
 * @return {Promise<null>}
 */
async function updateResponseData(
  responseCollection,
  sectionResponseCollection,
  userId,
  seriesId,
  processedRequest,
  processedSectionRequest,
  parentCollectionRef = null
) {
  const responseDocDataSnapshot = await fetchSingleDocumentMatchingCondition(
    responseCollection,
    [
      {field: 'userId', operator: '==', value: userId},
      {field: 'seriesId', operator: '==', value: seriesId},
    ],
    parentCollectionRef
  );

  const responseDataRef =
    responseDocDataSnapshot === null
      ? await saveFirestoreDocument(
          processedRequest,
          responseCollection,
          true,
          parentCollectionRef?.parent
        )
      : responseDocDataSnapshot.ref;

  const sectionResponseRef = await saveFirestoreDocument(
    processedSectionRequest,
    sectionResponseCollection,
    false,
    responseDataRef
  );
  logger.info(
    `New document saved in ${sectionResponseCollection} with ID: ${sectionResponseRef.id}`
  );

  return null;
}

/**
 * Process the request from HTTPS request
 *
 * @async
 * @param {typedefs.Request} req Reqest sent through HTTPS
 *
 * @return {Promise<typedefs.ProcessedRequest>} Processed request object
 */
async function processResponse(req) {
  if (
    !(
      isValidRequest(req) &&
      hasValidRequestBody(req.body) &&
      (await isAuthenticated(req))
    )
  ) {
    logger.warn('Invalid request!!');
    return null;
  }

  // Use object destructuring with default values (undefined)
  // to extract values from the request body
  const {
    interaction_id: interactionId,
    contact: {
      name,
      email,
      status,
      phone_number: phoneNumber,
      variables: {
        contact_user_id: userId,
        section_id: sectionId,
        section_name: sectionName,
        series_id: seriesId,
        section_status: sectionStatus,
        next_section_id: nextSectionId,
        subtitle: sectionSubtitle,
        tenant_id: tenantId,
      },
      answers,
    },
    form: {questions} = {},
  } = req.body;

  logger.info(`VideoAsk Response Status =============> ${status}`);

  if (!validateUserOrganization(email, tenantId)) {
    logger.error('Permission error!!');
    return null;
  }

  const respondent = {
    userId,
    name,
    email,
    phoneNumber,
    seriesId,
    status: config.get('request.respondent.status.draft'),
  };

  const newFilePath = `${tenantId}/${config.get(
    'firebase.storage.responseDirectory'
  )}/${seriesId}/${userId}/`;

  let answersAsDict;

  // TODO Separate out to new function
  // Use Promise.all along with await
  // to resolve all the promises pending in the map function
  // before moving on to the next step
  try {
    const processedAnswers = await Promise.all(
      answers.map(
        async (answer) =>
          await processVideoAnswer(answer, STORAGE_BUCKET, newFilePath)
      )
    );

    // Create object type using [key, object_value] type data from the previous function
    answersAsDict = Object.fromEntries(processedAnswers);
  } catch (error) {
    logger.error(error);
    return null;
  }

  const filteredQuestions = questions.filter(({question_id: questionId}) =>
    hasValidAnswer(
      questionId,
      answersAsDict,
      config.get('request.videoAnswerType')
    )
  );

  const transformedAnswers = generateTransformedAnswerObjectList(
    filteredQuestions,
    answersAsDict
  );

  logger.debug(
    `Transformed answers =============> ${JSON.stringify(transformedAnswers)}'`
  );

  // Construct the processed request object
  const processedRequest = {
    interactionId,
    ...respondent,
  };

  logger.debug(
    `Processed request =============> ${JSON.stringify(processedRequest)}'`
  );

  // Construct the processed section request object
  const processedSectionRequest = {
    answers: transformedAnswers,
    sectionId,
    sectionName,
    sectionStatus,
    sectionSubtitle,
  };

  // Generate the custom ID for section status sub collection
  const sectionStatusId = generateSectionStatusID(userId, sectionId);
  logger.debug(
    `Section Status ID =============> ${JSON.stringify(sectionStatusId)}'`
  );

  const tenantDocRef = getDocumentReference(ORGANIZATION_COLLECTION, tenantId);
  const questionnaireColRef = getCollectionReference(
    QUESTIONNAIRE_DRAFT_COLLECTION,
    tenantDocRef
  );

  if (!tenantDocRef) {
    logger.error('Error retrieving organization details!');
    return null;
  }

  try {
    await updateRespondentQuestionStatus(
      QUESTIONNAIRE_DRAFT_COLLECTION,
      RESPONDENT_STATUS_COLLECTION,
      seriesId,
      sectionStatusId,
      COMPLETED_SECTION_STATUS,
      questionnaireColRef
    );

    // If next section id exists and is valid, update the status to available
    if (nextSectionId && nextSectionId !== sectionId) {
      const newSectionId = generateSectionStatusID(userId, nextSectionId);

      await updateRespondentQuestionStatus(
        QUESTIONNAIRE_DRAFT_COLLECTION,
        RESPONDENT_STATUS_COLLECTION,
        seriesId,
        newSectionId,
        AVAILABLE_SECTION_STATUS,
        questionnaireColRef
      );
    }

    const responseCollectionRef = getCollectionReference(
      RESPONDENT_STATUS_COLLECTION,
      tenantDocRef
    );

    await updateResponseData(
      PATIENT_RESPONSE_COLLECTION,
      SECTION_ANSWERS_COLLECTION,
      userId,
      seriesId,
      processedRequest,
      processedSectionRequest,
      responseCollectionRef
    );
  } catch (error) {
    logger.error(error);
    return null;
  }

  return processedRequest;
}

const exportedForTesting = {
  hasValidAnswer,
  getQuestionTitle,
  updateResponseData,
  processVideoAnswer,
  generateSectionStatusID,
  updateRespondentQuestionStatus,
  generateTransformedAnswerObjectList,
};

module.exports = {
  exportedForTesting,
  processResponse,
};
