'use-strict';

const functions = require('firebase-functions');

const {
  onWriteHandler: patientResponseOnWriteHandler,
} = require('./handler/onWrite');
const config = require('./config');
const {getLogger} = require('./providers/logging');

const ORGANIZATION_COLLECTION = config.get(
  'firebase.firestore.organizationCollection'
);
const PATIENT_RESPONSE_COLLECTION = config.get(
  'firebase.firestore.patientResponseCollection'
);
const SESSION_ANSWERS_SUB_COLLECTION = config.get(
  'firebase.firestore.sectionAnswersSubCollection'
);
const FUNCTION_NAME = config.get('firebase.function.name');

// Initialize the logger object
const logger = getLogger(FUNCTION_NAME);

exports.onFirestoreChange = functions.firestore
  .document(
    `${ORGANIZATION_COLLECTION}/{organizationId}/${PATIENT_RESPONSE_COLLECTION}/{responseDocId}/${SESSION_ANSWERS_SUB_COLLECTION}/{documentId}`
  )
  .onWrite(async (change, context) => {
    try {
      await patientResponseOnWriteHandler(change, context);
      logger.info(`'${FUNCTION_NAME}' processing completed.`);
    } catch (err) {
      logger.error(err);
    }
    return null;
  });
