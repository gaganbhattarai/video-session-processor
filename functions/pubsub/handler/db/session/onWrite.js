'use-strict';

const FirebaseFunctions = require('firebase-functions'); // eslint-disable-line no-unused-vars
const deepEqual = require('deep-equal');

const config = require('../../../config');
const {
  haveSameContents,
  generateData: generatePublisherData,
} = require('../../../src/session/pubsub');
const {
  getDocumentData,
  getCollectionReference,
  fetchDocumentsUsingColRef,
  getDocumentReference,
} = require('../../../providers/firestore');
const {isValidEventTrigger} = require('../validation');
const {getLogger} = require('../../../providers/logging');
const {publishMessage} = require('../../../providers/pubsub');

const ORGANIZATION_COLLECTION = config.get(
  'firebase.firestore.organizationCollection'
);
const QUESTIONNAIRE_COLLECTION = config.get(
  'firebase.firestore.questionnaireCollection'
);
const PUBLISHER_TOPIC = config.get('cloud.pubsubService.publisherTopic');

const logger = getLogger(__filename);

/**
 * Handler function for Google Cloud Function triggered on write events to Firestore collection.
 * This function processes data when a document is written/updated to specified Firestore collection.
 *
 * @async
 * @param {FirebaseFunctions.Change<FirebaseFirestore.DocumentSnapshot>} change Snapshot of the document's state before and after the event
 * @param {FirebaseFunctions.EventContext<ParamsOf<Path>>} context The event metadata
 * @param {Object} context.params An object containing the values of the wildcards in the path parameter provided to the method for a trigger
 * @param {String} context.params.documentID The ID of the document in Firestore collection
 *
 * @throws {Error} Throws an error if event validation fails or no valid responses are found
 *
 * @return {PromiseLike<any> | any} A Promise resolving to null (this is a background function)
 */
exports.onWriteHandler = async (change, context) => {
  const dataValidationErrorMessage = 'No new data to process!';

  if (!isValidEventTrigger(change)) {
    logger.warn(dataValidationErrorMessage);
    throw Error('Event validation error!');
  }

  const {sections: newSections} = change.after.data() || {};
  const {sections: oldSections = []} = change?.before?.data() || {};

  if (deepEqual(newSections, oldSections)) {
    logger.warn('Sections data unchanged!');
    throw Error(dataValidationErrorMessage);
  }

  const {organizationID: tenantId, documentID: sessionDocId} = context.params;

  const referenceId = `${tenantId}###${sessionDocId}`;

  const sessionSnapshot = change?.after;
  const {responseRef: patientResponseRef, sections} = sessionSnapshot.data();

  const tenantDocRef = getDocumentReference(ORGANIZATION_COLLECTION, tenantId);

  // Fetch the response document using the document path
  const patientResponseDocumentData = await getDocumentData(patientResponseRef);

  // Get the required id from the fetched data
  const {seriesId} = patientResponseDocumentData;

  // Filter out the required questionnaire data
  const questionnaireCollectionRef = getCollectionReference(
    QUESTIONNAIRE_COLLECTION,
    tenantDocRef
  );
  const questionnaireDocSnapshots = await fetchDocumentsUsingColRef(
    questionnaireCollectionRef,
    [
      {
        field: 'series_id',
        operator: '==',
        value: seriesId,
      },
    ],
    1
  );

  // Get all the questions data from the filtered record
  const {questions = []} = questionnaireDocSnapshots[0].data();

  // Get the list of sections ids for the question collection
  const expectedSectionIDs = questions.map((question) => question.sectionId);

  // Get the list of section ids in the session
  const actualSectionIDs = sections.map((section) => section.sectionId);

  // If the sections in the question collection and sections in the session do not match
  // Raise error to flag required sections not present in the response
  if (!haveSameContents(expectedSectionIDs, actualSectionIDs)) {
    const errorMessage = 'Response does not have all required sections.';
    logger.error(
      `${errorMessage}\nExpected: ${expectedSectionIDs.length}. Actual: ${actualSectionIDs.length}`
    );

    throw Error(`${errorMessage}`);
  }

  // Generate the data with correct format to be published through the Publisher
  // and publish the data to the required Pub/Sub topic
  const data = generatePublisherData(referenceId, sections);
  const messageId = await publishMessage(PUBLISHER_TOPIC, data);

  return messageId;
};
