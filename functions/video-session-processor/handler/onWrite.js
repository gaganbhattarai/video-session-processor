'use-strict';

const path = require('path');

const FirebaseFunctions = require('firebase-functions'); // eslint-disable-line no-unused-vars

const {
  generateThumbnailImage,
  generateSessionSectionData,
} = require('../src/session');
const config = require('../config');
const {
  arrayUnion,
  getDocumentData,
  serverTimestamp,
  getDocumentReference,
  saveFirestoreDocument,
  updateDocumentWithRef,
  getCollectionReference,
  fetchDocumentsUsingColRef,
} = require('../providers/firestore');
const {
  uploadThumbnail,
  saveThumbnailToDocumentWithRetry,
} = require('../providers/thumbnailStore');
const {getLogger} = require('../providers/logging');
const {getStorage} = require('../providers/firebase');
const {isValidEventTrigger} = require('./validation');

const bucketRef = getStorage().bucket();

const BUCKET_NAME = bucketRef.name;
const BUCKET_PATH = `gs://${BUCKET_NAME}/`;
const HTTP_BUCKET_PATH = `${config.get(
  'cloud.bucket.httpsBaseURL'
)}/${BUCKET_NAME}`;

const ORGANIZATION_COLLECTION = config.get(
  'firebase.firestore.organizationCollection'
);
const PATIENT_RESPONSE_DIRECTORY = config.get(
  'firebase.storage.responseDirectory'
);
const PATIENT_RESPONSE_COLLECTION = config.get(
  'firebase.firestore.patientResponseCollection'
);

const THUMBNAIL_DIR = config.get('firebase.storage.thumbnailDirectory');
const SESSIONS_DIRECTORY = config.get('firebase.storage.sessionsDirectory');
const SESSIONS_COLLECTION = config.get('firebase.firestore.sessionsCollection');

const logger = getLogger(__filename);

/**
 * Handler function for Google Cloud Function triggered on write events to Firestore collection.
 * This function processes data when a document is written/updated to Firestore collection.
 *
 * @async
 * @param {FirebaseFunctions.Change<FirebaseFirestore.DocumentSnapshot>} change Snapshot of the document's state before and after the event
 * @param {FirebaseFunctions.EventContext<ParamsOf<Path>>} context The event metadata
 * @param {Object} context.params An object containing the values of the wildcards in the path parameter provided to the method for a trigger
 * @param {string} context.params.documentId The ID of the document in Firestore collection
 *
 * @throws {Error} Throws an error if event validation fails or no valid responses are found
 *
 * @return {PromiseLike<any> | any} A Promise resolving to null (this is a background function)
 */
exports.onWriteHandler = async (change, context) => {
  if (!isValidEventTrigger(change)) {
    logger.warn('No new data to process!');
    throw Error('Event validation error!');
  }

  // Fetch the reqiured document ids from the triggered event
  const {organizationId, responseDocId, documentId} = context.params;

  const organizationDocRef = getDocumentReference(
    ORGANIZATION_COLLECTION,
    organizationId
  );

  const responseCollectionRef = getCollectionReference(
    PATIENT_RESPONSE_COLLECTION,
    organizationDocRef
  );
  // Fetch the reference of the document from the parent collection
  const patientResponseDocRef = getDocumentReference(
    responseCollectionRef,
    responseDocId
  );

  const {
    seriesId,
    userId,
    name,
    email,
    phone,
    questionnaireDraftRef: {id: questionnaireDraftId} = {},
  } = await getDocumentData(patientResponseDocRef);

  // Get the new / updated section answers
  const sectionAnswerSnapshot = change.after;

  if (!sectionAnswerSnapshot) {
    throw Error('Error! No section answers!');
  }

  const eventData = {
    name,
    email,
    phone,
  };

  logger.info(`questionnaireDraftId =======> ${questionnaireDraftId}`);
  logger.info(`userId =======> ${userId}`);

  // Use questionnnaireDraftId or the eventId for the responseId
  const responseId = questionnaireDraftId || seriesId;
  const responsePath = `${organizationId}/${PATIENT_RESPONSE_DIRECTORY}/${responseId}/${userId}/`;
  const storagePath = BUCKET_PATH + responsePath;

  logger.info(
    `Storage path ${
      questionnaireDraftId ? 'with' : 'without'
    } question event id: =======> ${storagePath}`
  );

  const sectionAnswerData = sectionAnswerSnapshot.data();
  const sessionSection = await generateSessionSectionData(
    sectionAnswerData,
    documentId,
    responseId,
    responsePath,
    organizationId
  );

  const sessionCollectionRef = getCollectionReference(
    SESSIONS_COLLECTION,
    organizationDocRef
  );
  const sessionDocSnapshot = await fetchDocumentsUsingColRef(
    sessionCollectionRef,
    [
      {
        field: 'responseRefID',
        operator: '==',
        value: patientResponseDocRef.id,
      },
    ]
  );

  if (sessionDocSnapshot !== null) {
    const sessionDocRef = sessionDocSnapshot[0].ref;
    const updatedSessionData = {
      sections: arrayUnion(sessionSection),
      updatedAt: serverTimestamp(),
    };

    await updateDocumentWithRef(sessionDocRef, updatedSessionData);

    logger.info(
      `Session with id: ${sessionDocRef.id} in ${sessionDocRef.parent.id} updated successfully.`
    );
    return null;
  }

  const sessionData = {
    status: config.get('response.session.status.new'),
    patient: {
      name: eventData.name,
      email: eventData.email,
      phone: eventData.phone,
    },
    sections: Array(sessionSection),
    responseRef: patientResponseDocRef,
    responseRefID: patientResponseDocRef.id,
    isDeleted: false,
  };

  // Save the sessions data to the Firestore document
  // Add timestamps (createdAt, updatedAt) flag -> true
  const sessionsRef = await saveFirestoreDocument(
    SESSIONS_COLLECTION,
    sessionData,
    true,
    organizationDocRef
  );
  logger.info(`New session created successfully: =====> ${sessionsRef.id}`);

  // Select the video file from the latest response processed in above iteration
  // Generate the thumbnail for the session using the video response
  // And save it to the corresponding 'session' document
  const videoFilename = path.basename(sessionSection.storageMediaUrlPath);
  const localThumbnailImgFullPath = await generateThumbnailImage(
    BUCKET_NAME,
    `${organizationId}/${SESSIONS_DIRECTORY}/`,
    videoFilename
  );

  // Use the unique id generated during the thumbnail upload
  // to allow only authorized access using that id / token
  const uniqueID = await uploadThumbnail(
    localThumbnailImgFullPath,
    BUCKET_NAME,
    `${organizationId}/${THUMBNAIL_DIR}/`
  );

  await saveThumbnailToDocumentWithRetry(
    uniqueID,
    path.basename(localThumbnailImgFullPath),
    `${organizationId}/${THUMBNAIL_DIR}/`,
    sessionsRef,
    HTTP_BUCKET_PATH
  );
  logger.info('Thumbnail url generated and saved to document.');

  // Don't return anything as this is a background function
  return null;
};
