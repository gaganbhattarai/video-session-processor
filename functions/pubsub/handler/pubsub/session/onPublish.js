'use-strict';

const {Message} = require('@google-cloud/pubsub'); // eslint-disable-line no-unused-vars

const {
  processMessage: processPublishedMessage,
} = require('../../../providers/pubsub');
const config = require('../../../config');
const {
  getDocumentReference,
  getCollectionReference,
  addDocumentToCollectionWithRef,
} = require('../../../providers/firestore');

const ORGANIZATION_COLLECTION = config.get(
  'firebase.firestore.organizationCollection'
);
const SUBSCRIBER_TOPIC = config.get('cloud.pubsubService.subscriberTopic');
const SESSIONS_COLLECTION = config.get('firebase.firestore.sessionsCollection');
const SESSIONS_SUMMARY_COLLECTION = config.get(
  'firebase.firestore.sessionSummaryCollection'
);

/**
 * Handler function for Google Cloud Function triggered on publish to Pub/Sub topic.
 * This function processes message published to specified Pub/Sub topic.
 *
 * @async
 * @param {Message} message The message published to the Pub/Sub topic
 * @param {Object} context Context of the Pub/Sub topic
 *
 * @return {PromiseLike<any> | any} A Promise resolving to null (this is a background function)
 */
exports.onPublishHandler = async (message, context) => {
  const messageContent = await processPublishedMessage(
    SUBSCRIBER_TOPIC,
    message
  );

  const generatedOutput = {
    summary: messageContent.summary,
    progressNote: messageContent.progressNote,
  };

  const [tenantId, docId] = messageContent.referenceId.split('###');

  const tenantDocRef = getDocumentReference(ORGANIZATION_COLLECTION, tenantId);

  // Get document reference and collection reference
  const documentRef = getDocumentReference(
    SESSIONS_COLLECTION,
    docId,
    tenantDocRef
  );

  const collectionRef = getCollectionReference(
    SESSIONS_SUMMARY_COLLECTION,
    documentRef
  );

  // Add data to the subcollection along with timestamp values
  await addDocumentToCollectionWithRef(collectionRef, generatedOutput, true);

  return null;
};
