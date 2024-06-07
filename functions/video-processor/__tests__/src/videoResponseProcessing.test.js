'use-strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const rewire = require('rewire');

const config = require('../../config');
const validRequest = require('../fixtures/validRequest');

const QUESTIONNAIRE_DRAFT_COLLECTION = config.get(
  'firebase.firestore.questionnaireDraftCollection'
);
const RESPONDENT_STATUS_COLLECTION = config.get(
  'firebase.firestore.patientWiseStatusCollection'
);
const COMPLETED_SECTION_STATUS = config.get(
  'request.respondent.status.completed'
);
const PATIENT_RESPONSE_COLLECTION = config.get(
  'firebase.firestore.responseCollection'
);
const SECTION_ANSWERS_COLLECTION = config.get(
  'firebase.firestore.sectionAnswersCollection'
);

const AVAILABLE_SECTION_STATUS = config.get(
  'request.respondent.status.available'
);

const subCollectionRef = 'subCollectionRef';
const collectionRef = 'collectionRef';
const bucketName = 'test-bucket';
const filePath = 'test/uploads/';
const answerType = 'video';
const questionCollection = 'questionCollection';
const respondentStatusCollection = 'respondentStatusCollection';
const seriesId = 'seriesId';
const sectionStatusId = 'sectionStatusId';
const status = 'status';
const responseCollection = 'responseCollection';
const sectionResponseCollection = 'sectionResponseCollection';
const userId = 'userId';

const loggerMock = {
  getLogger: sinon.stub().returns({
    debug: sinon.stub(),
    error: sinon.stub(),
    info: sinon.stub(),
    warn: sinon.stub(),
  }),
};

const streamFileToGCSMock = {
  streamFileToGCS: sinon.stub().resolves({}),
};

const firestoreMock = {
  saveFirestoreDocument: sinon.stub().resolves({id: 'newDocId'}),
  getCollectionReference: sinon.stub().returns(collectionRef),
  getSubCollectionReference: sinon.stub().returns(subCollectionRef),
  fetchDocumentsMatchingCondition: sinon.stub().resolves({
    ref: {
      update: sinon.stub().returns({}),
    },
  }),
  fetchSingleDocumentMatchingCondition: sinon.stub().resolves({
    ref: {
      update: sinon.stub().returns({}),
    },
  }),
  fetchSingleDocumentByCollectionRef: sinon.stub().resolves({
    ref: {
      update: sinon.stub().returns({}),
    },
  }),
};

// Importing the module with proxyquire to inject the mocks
// eslint-disable-next-line
const videoResponseProcessing = proxyquire(
  '../../src/videoResponseProcessing',
  {
    '../provider/logging': loggerMock,
    '../provider/storage': streamFileToGCSMock,
    '../provider/firestore': firestoreMock,
  }
);

test.after(() => {
  sinon.reset();
});

test.afterEach.always(() => {
  sinon.resetHistory();
});

test.serial(
  '"processVideoAnswer" processes the video answer into required format',
  async (t) => {
    const answer = validRequest.request.body.contact.answers[0];

    const expectedResponse = [
      answer.question_id,
      {
        answerId: answer.answer_id,
        mediaUrl: answer.media_url,
        videoFilename: `${answer.answer_id}.mp4`,
        videoStorageFilePath: `https://storage.cloud.google.com/${bucketName}/${filePath}${answer.answer_id}.mp4`,
        answerType: answer.type,
        transcribedWords: answer.transcription_data[0].words,
        transcribedConfidence: answer.transcription_data[0].confidence,
        transcript: answer.transcription_data[0].transcript,
      },
    ];
    const processedAnswer =
      await videoResponseProcessing.exportedForTesting.processVideoAnswer(
        answer,
        bucketName,
        filePath
      );

    t.true(
      streamFileToGCSMock.streamFileToGCS.calledOnce,
      '"streamFiletoGCS is called only once'
    );
    t.is(
      loggerMock.getLogger().debug.calledOnce,
      true,
      'logger.debug is called only once'
    );
    t.deepEqual(processedAnswer, expectedResponse);

    // Change the answer (request) to test for undefined 'transcription_data' case

    // Copy the answer object into new variable and change particular attribute only
    const newAnswer = {...answer};
    newAnswer['transcription_data'] = undefined;

    // New expected response has 'undefined' for the transcription data
    const newExpectedResponse = [
      answer.question_id,
      {
        answerId: answer.answer_id,
        mediaUrl: answer.media_url,
        videoFilename: `${answer.answer_id}.mp4`,
        videoStorageFilePath: `https://storage.cloud.google.com/${bucketName}/${filePath}${answer.answer_id}.mp4`,
        answerType: answer.type,
        transcribedWords: undefined,
        transcribedConfidence: undefined,
        transcript: undefined,
      },
    ];

    const newProcessedAnswer =
      await videoResponseProcessing.exportedForTesting.processVideoAnswer(
        newAnswer,
        bucketName,
        filePath
      );

    t.deepEqual(newExpectedResponse, newProcessedAnswer);
  }
);

test.serial(
  '"processVideoAnswer" processes the video answer into required format when mediaUrl is undefined',
  async (t) => {
    const answer = {...validRequest.request.body.contact.answers[0]};
    answer.media_url = undefined;

    const processedAnswer =
      await videoResponseProcessing.exportedForTesting.processVideoAnswer(
        answer,
        bucketName,
        filePath
      );

    t.is(streamFileToGCSMock.streamFileToGCS.callCount, 0);
    t.is(loggerMock.getLogger().debug.callCount, 0);

    t.is(processedAnswer.videoStorageFilePath, undefined);
  }
);

test.serial('"hasValidAnswer" identifies a valid answer', async (t) => {
  const answerType = 'video';
  const answers = validRequest.request.body.contact.answers;
  const questionIdWithAnswer =
    validRequest.request.body.contact.answers[0].question_id;

  // TODO
  const processedAnswers = await Promise.all(
    answers.map((answer) =>
      videoResponseProcessing.exportedForTesting.processVideoAnswer(
        answer,
        bucketName,
        filePath
      )
    )
  );
  const answersAsDict = Object.fromEntries(processedAnswers);

  const answerValidity =
    videoResponseProcessing.exportedForTesting.hasValidAnswer(
      questionIdWithAnswer,
      answersAsDict,
      answerType
    );

  t.is(answerValidity, true);
});

test.serial('"hasValidAnswer" identifies an invalid answer', async (t) => {
  const answerType = 'video';
  const answers = validRequest.request.body.contact.answers;
  const questionIdWithoutAnswer = 'invalid_id';

  // TODO
  const processedAnswers = await Promise.all(
    answers.map((answer) =>
      videoResponseProcessing.exportedForTesting.processVideoAnswer(
        answer,
        bucketName,
        filePath
      )
    )
  );

  const answersAsDict = Object.fromEntries(processedAnswers);

  const answerValidity =
    videoResponseProcessing.exportedForTesting.hasValidAnswer(
      questionIdWithoutAnswer,
      answersAsDict,
      answerType
    );

  t.is(answerValidity, false);
});

test.serial(
  '"hasValidAnswer" identifies an invalid answer response type',
  async (t) => {
    const answerType = 'non-existing-type';

    const answers = validRequest.request.body.contact.answers;

    const questionIdWithAnswer =
      validRequest.request.body.contact.answers[0].question_id;

    // TODO
    const processedAnswers = await Promise.all(
      answers.map((answer) =>
        videoResponseProcessing.exportedForTesting.processVideoAnswer(
          answer,
          bucketName,
          filePath
        )
      )
    );

    const answersAsDict = Object.fromEntries(processedAnswers);

    const answerValidity =
      videoResponseProcessing.exportedForTesting.hasValidAnswer(
        questionIdWithAnswer,
        answersAsDict,
        answerType
      );

    t.is(answerValidity, false);
  }
);

test.serial(
  '"generateTransformedAnswerObjectList" returns answer objects in correct form',
  async (t) => {
    const answers = validRequest.request.body.contact.answers;

    const {
      form: {questions},
    } = validRequest.request.body;

    const expectedAnswersObjectList = [
      {
        questionId: answers[0].question_id,
        questionTitle: questions[0].label.replace('(transcribed)', '').trim(),
        questionLabel: questions[0].label,
        answerId: answers[0].answer_id,
        mediaUrl: answers[0].media_url,
        videoFilename: `${answers[0].answer_id}.mp4`,
        videoStorageFilePath: answers[0].media_url
          ? `https://storage.cloud.google.com/${bucketName}/${filePath}${answers[0].answer_id}.mp4`
          : undefined,
        answerType: answers[0].type,
        transcribedWords: answers[0].transcription_data[0].words,
        transcribedConfidence: answers[0].transcription_data[0].confidence,
        transcript: answers[0].transcription_data[0].transcript,
      },
    ];

    // Get all the processed answers
    const processedAnswers = await Promise.all(
      answers.map((answer) =>
        videoResponseProcessing.exportedForTesting.processVideoAnswer(
          answer,
          bucketName,
          filePath
        )
      )
    );

    // Get the answerss as a Dict Object
    const answersAsDict = Object.fromEntries(processedAnswers);

    // Get the filtered question objects (one with valid answers)
    const filteredQuestions = questions.filter(({question_id: questionId}) =>
      videoResponseProcessing.exportedForTesting.hasValidAnswer(
        questionId,
        answersAsDict,
        answerType
      )
    );

    const generatedAnswerObjectList =
      /* eslint-disable max-len */
      videoResponseProcessing.exportedForTesting.generateTransformedAnswerObjectList(
        /* eslint-enable max-len */
        filteredQuestions,
        answersAsDict
      );

    t.deepEqual(generatedAnswerObjectList, expectedAnswersObjectList);
  }
);

test.serial(
  '"generateSectionStatusID" returns valid section status id',
  (t) => {
    const userId = 'userABC';
    const sectionId = 'sectionXYZ';
    const expectedResponse = 'userABC_sectionXYZ';

    const actualResponse =
      videoResponseProcessing.exportedForTesting.generateSectionStatusID(
        userId,
        sectionId
      );
    t.is(actualResponse, expectedResponse);
  }
);

test.serial(
  '"updateRespondentQuestionStatus" process the request correctly',
  async (t) => {
    const response =
      /* eslint-disable max-len */
      await videoResponseProcessing.exportedForTesting.updateRespondentQuestionStatus(
        /* eslint-enable max-len */
        questionCollection,
        respondentStatusCollection,
        seriesId,
        sectionStatusId,
        status
      );

    t.is(response, null);
    t.true(firestoreMock.fetchSingleDocumentMatchingCondition.calledOnce);
    t.true(
      firestoreMock.fetchSingleDocumentMatchingCondition.calledWith(
        questionCollection,
        [{field: 'series_id', operator: '==', value: seriesId}]
      )
    );
    t.true(
      firestoreMock.fetchSingleDocumentByCollectionRef.calledWith(
        'subCollectionRef',
        [{field: 'id', operator: '==', value: sectionStatusId}]
      )
    );
    // t.true(
    //   firestoreMock.fetchSingleDocumentMatchingCondition().ref.update.calledOnce
    // );
  }
);

test.serial(
  '"updateResponseData" processes the request correctly',
  async (t) => {
    const processedRequest = {};
    const processedSectionRequest = {};

    const response =
      /* eslint-disable max-len */
      await videoResponseProcessing.exportedForTesting.updateResponseData(
        /* eslint-enable max-len */
        responseCollection,
        sectionResponseCollection,
        userId,
        seriesId,
        processedRequest,
        processedSectionRequest
      );

    t.is(response, null);
    t.true(firestoreMock.fetchSingleDocumentMatchingCondition.calledOnce);
    t.true(firestoreMock.saveFirestoreDocument.calledOnce);
    t.true(
      loggerMock
        .getLogger()
        .info.calledOnceWith(
          `New document saved in ${sectionResponseCollection} with ID: newDocId`
        )
    );
  }
);

test.serial(
  '"updateResponseData" saves the response document (when it does not exist) before saving to the section response subcollection',
  async (t) => {
    // Create new mock for firestore to return empty
    const newFirestoreMock = firestoreMock;
    newFirestoreMock['fetchSingleDocumentMatchingCondition'] = sinon
      .stub()
      .resolves(null);

    const videoResponseProcessing = proxyquire(
      '../../src/videoResponseProcessing',
      {
        '../provider/logging': loggerMock,
        '../provider/storage': streamFileToGCSMock,
        '../provider/firestore': newFirestoreMock,
      }
    );

    const processedRequest = {};
    const processedSectionRequest = {};

    const response =
      /* eslint-disable max-len */
      await videoResponseProcessing.exportedForTesting.updateResponseData(
        /* eslint-enable max-len */
        responseCollection,
        sectionResponseCollection,
        userId,
        seriesId,
        processedRequest,
        processedSectionRequest
      );

    t.is(response, null);
    t.true(firestoreMock.fetchSingleDocumentMatchingCondition.calledOnce);
    t.true(firestoreMock.saveFirestoreDocument.calledTwice);
    t.true(
      loggerMock
        .getLogger()
        .info.calledOnceWith(
          `New document saved in ${sectionResponseCollection} with ID: newDocId`
        )
    );
  }
);

test.serial(
  '"processResponse" returns null for invalid requests',
  async (t) => {
    const request = {...validRequest.request};

    // Invalidate the request by updating contact name to null
    request.body.contact.name = null;
    const response = await videoResponseProcessing.processResponse(request);

    // Response should be null
    t.assert(response === null);

    // Invalidate request body
    request.body = {};

    // Send invalid request
    const anotherResponse = await videoResponseProcessing.processResponse(
      request
    );
    t.assert(anotherResponse === null);
  }
);

test.serial(
  '"processResponse" processes the response and returns the answer objects',
  async (t) => {
    const videoResponseProcessingRewired = rewire(
      '../../src/videoResponseProcessing.js'
    );

    const request = {...validRequest.request};
    const testTransformedAnswerObjectList = [
      {
        questionId: 'questionId',
        questionTitle: 'questionTitle',
        questionLabel: 'questionLabel',
        answerId: 'answerId',
        mediaUrl: 'testUrl',
        videoFilename: 'test.mp4',
        videoStorageFilePath: 'testPath',
        answerType: 'video',
        transcribedWords: [[{word: 'test', start_time: 0, end_time: 1.5}]],
        transcribedConfidence: 0.99,
        transcript: 'test',
      },
    ];

    const processVideoAnswerMock = sinon
      .stub()
      .onCall(0)
      .resolves([
        'questionId',
        {
          answerId: 'answerId',
          mediaUrl: 'mediaUrl',
          videoFilename: 'test.mp4',
          videoStorageFilePath: 'testPath',
          answerType: 'video',
          transcribedWords: [{word: 'test', start_time: 0, end_time: 9}],
          transcribedConfidence: 0.99,
          transcript: 'test',
        },
      ])
      .onCall(1)
      .resolves([
        'questionId2',
        {
          answerId: 'answerId2',
          mediaUrl: 'mediaUrl2',
          videoFilename: 'test2.mp4',
          videoStorageFilePath: 'testPath2',
          answerType: 'video',
          transcribedWords: [{word: 'test2', start_time: 9, end_time: 10.5}],
          transcribedConfidence: 0.99,
          transcript: 'test2',
        },
      ]);

    const testSectionStatusId = 'userId_sectionId';

    videoResponseProcessingRewired.__set__({
      isValidRequest: sinon.stub().returns(true),
      hasValidRequestBody: sinon.stub().returns(true),
      isAuthenticated: sinon.stub().resolves(true),
      processVideoAnswer: processVideoAnswerMock,
      hasValidAnswer: sinon.stub().returns(true),
      generateTransformedAnswerObjectList: sinon
        .stub()
        .returns(testTransformedAnswerObjectList),
      generateSectionStatusID: sinon.stub().returns(testSectionStatusId),
      updateRespondentQuestionStatus: sinon.stub().resolves(null),
      updateResponseData: sinon.stub().resolves(null),
      getDocumentReference: sinon.stub().returns({id: 'newDocId'}),
      getCollectionReference: sinon.stub().returns({id: 'newColId'}),
      logger: {
        debug: sinon.stub(),
        error: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
      },
    });

    const actualProcessedRequest =
      await videoResponseProcessingRewired.processResponse(request);

    t.true(processVideoAnswerMock.calledTwice);
    t.true(
      videoResponseProcessingRewired.__get__(
        'generateTransformedAnswerObjectList'
      ).calledOnce
    );
    t.true(
      videoResponseProcessingRewired.__get__('getDocumentReference').calledOnce
    );
    t.true(
      videoResponseProcessingRewired.__get__('getCollectionReference')
        .calledTwice
    );
    t.true(
      videoResponseProcessingRewired.__get__('updateRespondentQuestionStatus')
        .calledTwice
    );
    t.true(
      videoResponseProcessingRewired.__get__('generateSectionStatusID')
        .calledTwice
    );
    t.true(
      videoResponseProcessingRewired.__get__('updateResponseData').calledOnce
    );

    const respondent = {
      userId: request.body.contact.variables.contact_user_id,
      name: request.body.contact.name,
      email: request.body.contact.email,
      phoneNumber: request.body.contact.phone_number,
      seriesId: request.body.contact.variables.series_id,
      status: 'Draft',
    };

    const generatedProcessedRequest = {
      interactionId: request.body.interaction_id,
      ...respondent,
    };

    const processedSectionRequest = {
      answers: testTransformedAnswerObjectList,
      sectionId: request.body.contact.variables.section_id,
      sectionName: request.body.contact.variables.section_name,
      sectionStatus: request.body.contact.variables.section_status,
      sectionSubtitle: request.body.contact.variables.subtitle,
    };
    const userId = respondent.userId;
    const seriesId = respondent.seriesId;

    t.deepEqual(generatedProcessedRequest, actualProcessedRequest);
    t.true(
      videoResponseProcessingRewired
        .__get__('updateResponseData')
        .calledWith(
          PATIENT_RESPONSE_COLLECTION,
          SECTION_ANSWERS_COLLECTION,
          userId,
          seriesId,
          actualProcessedRequest,
          processedSectionRequest
        )
    );

    t.true(
      videoResponseProcessingRewired
        .__get__('updateRespondentQuestionStatus')
        .calledWith(
          QUESTIONNAIRE_DRAFT_COLLECTION,
          RESPONDENT_STATUS_COLLECTION,
          respondent.seriesId,
          testSectionStatusId,
          COMPLETED_SECTION_STATUS
        )
    );

    t.true(
      videoResponseProcessingRewired
        .__get__('updateRespondentQuestionStatus')
        .calledWith(
          QUESTIONNAIRE_DRAFT_COLLECTION,
          RESPONDENT_STATUS_COLLECTION,
          respondent.seriesId,
          testSectionStatusId,
          AVAILABLE_SECTION_STATUS
        )
    );

    sinon.resetHistory();

    // Create new request with undefined next_section_id
    const newRequest = {...validRequest.request};
    newRequest.body.contact.variables.next_section_id = undefined;

    await videoResponseProcessingRewired.processResponse(request);

    t.true(processVideoAnswerMock.calledTwice);
    t.true(
      videoResponseProcessingRewired.__get__(
        'generateTransformedAnswerObjectList'
      ).calledOnce
    );

    // Now this function should only be called once
    t.true(
      videoResponseProcessingRewired.__get__('updateRespondentQuestionStatus')
        .calledOnce
    );
    // This function should only be called once as well
    t.true(
      videoResponseProcessingRewired.__get__('generateSectionStatusID')
        .calledOnce
    );
    t.true(
      videoResponseProcessingRewired.__get__('updateResponseData').calledOnce
    );
  }
);

test.serial(
  '"processResponse" returns null in case of error in "processVideoAnswer"',
  async (t) => {
    const request = validRequest.request;

    const videoResponseProcessingRewired = rewire(
      '../../src/videoResponseProcessing.js'
    );
    videoResponseProcessingRewired.__set__({
      isValidRequest: sinon.stub().returns(true),
      hasValidRequestBody: sinon.stub().returns(true),
      isAuthenticated: sinon.stub().resolves(true),
      processVideoAnswer: sinon.stub().rejects('Processing error'),
      hasValidAnswer: sinon.stub().returns(true),
      logger: {
        debug: sinon.stub(),
        error: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
      },
    });

    const response = await videoResponseProcessingRewired.processResponse(
      request
    );

    t.is(response, null);
    t.true(videoResponseProcessingRewired.__get__('logger.error').calledOnce);
    t.true(
      videoResponseProcessingRewired.__get__('processVideoAnswer').calledTwice
    );
  }
);

test.serial(
  '"processResponse" returns null in case of error in "updateRespondentQuestionStatus"',
  async (t) => {
    const request = validRequest.request;

    const videoResponseProcessingRewired = rewire(
      '../../src/videoResponseProcessing.js'
    );

    const testTransformedAnswerObjectList = [
      {
        questionId: 'questionId',
        questionTitle: 'questionTitle',
        questionLabel: 'questionLabel',
        answerId: 'answerId',
        mediaUrl: 'testUrl',
        videoFilename: 'test.mp4',
        videoStorageFilePath: 'testPath',
        answerType: 'video',
        transcribedWords: [[{word: 'test', start_time: 0, end_time: 1.5}]],
        transcribedConfidence: 0.99,
        transcript: 'test',
      },
    ];

    const processVideoAnswerMock = sinon
      .stub()
      .onCall(0)
      .resolves([
        'questionId',
        {
          answerId: 'answerId',
          mediaUrl: 'mediaUrl',
          videoFilename: 'test.mp4',
          videoStorageFilePath: 'testPath',
          answerType: 'video',
          transcribedWords: [{word: 'test', start_time: 0, end_time: 9}],
          transcribedConfidence: 0.99,
          transcript: 'test',
        },
      ])
      .onCall(1)
      .resolves([
        'questionId2',
        {
          answerId: 'answerId2',
          mediaUrl: 'mediaUrl2',
          videoFilename: 'test2.mp4',
          videoStorageFilePath: 'testPath2',
          answerType: 'video',
          transcribedWords: [{word: 'test2', start_time: 9, end_time: 10.5}],
          transcribedConfidence: 0.99,
          transcript: 'test2',
        },
      ]);

    const testSectionStatusId = 'userId_sectionId';

    videoResponseProcessingRewired.__set__({
      isValidRequest: sinon.stub().returns(true),
      hasValidRequestBody: sinon.stub().returns(true),
      isAuthenticated: sinon.stub().resolves(true),
      processVideoAnswer: processVideoAnswerMock,
      hasValidAnswer: sinon.stub().returns(true),
      generateTransformedAnswerObjectList: sinon
        .stub()
        .returns(testTransformedAnswerObjectList),
      generateSectionStatusID: sinon.stub().returns(testSectionStatusId),
      updateRespondentQuestionStatus: sinon.stub().rejects({}),
      updateResponseData: sinon.stub().rejects({}),
      getDocumentReference: sinon.stub().returns({id: 'newDocId'}),
      getCollectionReference: sinon.stub().returns({id: 'newColId'}),
      logger: {
        debug: sinon.stub(),
        error: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
      },
    });

    const actualProcessedRequest =
      await videoResponseProcessingRewired.processResponse(request);

    t.is(actualProcessedRequest, null);
    t.true(processVideoAnswerMock.calledTwice);
    t.true(
      videoResponseProcessingRewired.__get__(
        'generateTransformedAnswerObjectList'
      ).calledOnce
    );
    t.true(
      videoResponseProcessingRewired.__get__('updateRespondentQuestionStatus')
        .calledOnce
    );

    const respondent = {
      userId: request.body.contact.variables.contact_user_id,
      name: request.body.contact.name,
      email: request.body.contact.email,
      phoneNumber: request.body.contact.phone_number,
      seriesId: request.body.contact.variables.series_id,
      status: 'Draft',
    };

    t.true(
      videoResponseProcessingRewired
        .__get__('updateRespondentQuestionStatus')
        .calledWith(
          QUESTIONNAIRE_DRAFT_COLLECTION,
          RESPONDENT_STATUS_COLLECTION,
          respondent.seriesId,
          testSectionStatusId,
          COMPLETED_SECTION_STATUS
        )
    );
  }
);

test.serial(
  '"processResponse" returns null in case of invalid organization (tenant)',
  async (t) => {
    const request = validRequest.request;

    const videoResponseProcessingRewired = rewire(
      '../../src/videoResponseProcessing.js'
    );
    videoResponseProcessingRewired.__set__({
      isValidRequest: sinon.stub().returns(true),
      hasValidRequestBody: sinon.stub().returns(true),
      isAuthenticated: sinon.stub().resolves(true),
      processVideoAnswer: sinon.stub().rejects('Processing error'),
      hasValidAnswer: sinon.stub().returns(true),
      validateUserOrganization: sinon.stub().returns(false),
      logger: {
        debug: sinon.stub(),
        error: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
      },
    });

    const response = await videoResponseProcessingRewired.processResponse(
      request
    );

    t.is(response, null);
    t.true(videoResponseProcessingRewired.__get__('logger.error').calledOnce);
    t.true(
      videoResponseProcessingRewired.__get__('validateUserOrganization')
        .calledOnce
    );
  }
);

test.serial(
  '"processResponse" returns null in case of error in retrieving organization details',
  async (t) => {
    const request = validRequest.request;

    const videoResponseProcessingRewired = rewire(
      '../../src/videoResponseProcessing.js'
    );

    const testTransformedAnswerObjectList = [
      {
        questionId: 'questionId',
        questionTitle: 'questionTitle',
        questionLabel: 'questionLabel',
        answerId: 'answerId',
        mediaUrl: 'testUrl',
        videoFilename: 'test.mp4',
        videoStorageFilePath: 'testPath',
        answerType: 'video',
        transcribedWords: [[{word: 'test', start_time: 0, end_time: 1.5}]],
        transcribedConfidence: 0.99,
        transcript: 'test',
      },
    ];

    const processVideoAnswerMock = sinon
      .stub()
      .onCall(0)
      .resolves([
        'questionId',
        {
          answerId: 'answerId',
          mediaUrl: 'mediaUrl',
          videoFilename: 'test.mp4',
          videoStorageFilePath: 'testPath',
          answerType: 'video',
          transcribedWords: [{word: 'test', start_time: 0, end_time: 9}],
          transcribedConfidence: 0.99,
          transcript: 'test',
        },
      ])
      .onCall(1)
      .resolves([
        'questionId2',
        {
          answerId: 'answerId2',
          mediaUrl: 'mediaUrl2',
          videoFilename: 'test2.mp4',
          videoStorageFilePath: 'testPath2',
          answerType: 'video',
          transcribedWords: [{word: 'test2', start_time: 9, end_time: 10.5}],
          transcribedConfidence: 0.99,
          transcript: 'test2',
        },
      ]);

    const testSectionStatusId = 'userId_sectionId';

    videoResponseProcessingRewired.__set__({
      isValidRequest: sinon.stub().returns(true),
      hasValidRequestBody: sinon.stub().returns(true),
      isAuthenticated: sinon.stub().resolves(true),
      processVideoAnswer: processVideoAnswerMock,
      hasValidAnswer: sinon.stub().returns(true),
      generateTransformedAnswerObjectList: sinon
        .stub()
        .returns(testTransformedAnswerObjectList),
      generateSectionStatusID: sinon.stub().returns(testSectionStatusId),
      updateRespondentQuestionStatus: sinon.stub().rejects({}),
      updateResponseData: sinon.stub().rejects({}),
      getDocumentReference: sinon.stub().returns(null),
      getCollectionReference: sinon.stub().returns({id: 'newColId'}),
      logger: {
        debug: sinon.stub(),
        error: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
      },
    });

    const actualProcessedRequest =
      await videoResponseProcessingRewired.processResponse(request);

    t.is(actualProcessedRequest, null);
    t.true(processVideoAnswerMock.calledTwice);
    t.true(
      videoResponseProcessingRewired.__get__(
        'generateTransformedAnswerObjectList'
      ).calledOnce
    );
    t.true(
      videoResponseProcessingRewired.__get__('getDocumentReference').calledOnce
    );
    t.true(
      videoResponseProcessingRewired
        .__get__('logger.error')
        .calledOnceWith('Error retrieving organization details!')
    );
  }
);

test('"getQuestionTitle" returns question title when the title is present', (t) => {
  const questionTitle = 'Test question title';
  const questionLabel = 'Test question label';
  const questionTranscription = 'Test question transcription';

  const videoResponseProcessing = require('../../src/videoResponseProcessing.js');

  const actualQuestionTitle =
    videoResponseProcessing.exportedForTesting.getQuestionTitle(
      questionTitle,
      questionLabel,
      questionTranscription
    );

  t.true(actualQuestionTitle === questionTitle);
});

test('"getQuestionTitle" returns question title from the question label when title is missing', (t) => {
  const questionTitle = undefined;
  const questionLabel = 'Test question label (transcribed)';
  const questionTranscription = 'Test question transcription';

  const videoResponseProcessing = require('../../src/videoResponseProcessing.js');

  const actualQuestionTitle =
    videoResponseProcessing.exportedForTesting.getQuestionTitle(
      questionTitle,
      questionLabel,
      questionTranscription
    );

  t.is(actualQuestionTitle, 'Test question label');
});

test.serial(
  '"getQuestionTitle" returns question title from the transcription when title, and label are missing',
  (t) => {
    const questionTitle = '';
    const questionLabel = '';
    let questionTranscription = 'Test a question transcription';

    const videoResponseProcessing = require('../../src/videoResponseProcessing.js');

    let actualQuestionTitle =
      videoResponseProcessing.exportedForTesting.getQuestionTitle(
        questionTitle,
        questionLabel,
        questionTranscription
      );

    t.is(actualQuestionTitle, questionTranscription);

    // Test for a long transcription record, title should only have the first five words
    questionTranscription = 'Test a very long long question transcription';

    actualQuestionTitle =
      videoResponseProcessing.exportedForTesting.getQuestionTitle(
        questionTitle,
        questionLabel,
        questionTranscription
      );

    t.is(actualQuestionTitle, 'Test a very long long');
  }
);

test.serial(
  '"getQuestionTitle" returns empty if title, label, and transcription are all missing',
  (t) => {
    const questionTitle = undefined;
    const questionLabel = '';
    const questionTranscription = null;

    const videoResponseProcessing = require('../../src/videoResponseProcessing.js');

    const actualQuestionTitle =
      videoResponseProcessing.exportedForTesting.getQuestionTitle(
        questionTitle,
        questionLabel,
        questionTranscription
      );

    t.is(actualQuestionTitle, '');
  }
);
