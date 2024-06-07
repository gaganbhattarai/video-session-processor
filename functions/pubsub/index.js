'use-strict';

const functions = require('firebase-functions');

const config = require('./config');
const {
  onWriteHandler: sessionOnWriteHandler,
} = require('./handler/db/session/onWrite');
const {
  onPublishHandler: sessionOnPublishHandler,
} = require('./handler/pubsub/session/onPublish');
const {getLogger} = require('./providers/logging');

const FUNCTION_NAME = config.get('firebase.function.name');

const ORGANIZATION_COLLECTION = config.get(
  'firebase.firestore.organizationCollection'
);
const SUBSCRIBER_TOPIC = config.get('cloud.pubsubService.subscriberTopic');
const SESSIONS_COLLECTION = config.get('firebase.firestore.sessionsCollection');

// Initialize the logger object
const logger = getLogger(FUNCTION_NAME);

exports.dbSessionOnWrite = functions.firestore
  .document(
    `${ORGANIZATION_COLLECTION}/{organizationID}/${SESSIONS_COLLECTION}/{documentID}`
  )
  .onWrite(async (change, context) => {
    try {
      const publishedMessageID = await sessionOnWriteHandler(change, context);
      logger.info(`'${FUNCTION_NAME}' processing completed.`);
      logger.info(
        `Sessions data processed and published to Pub/Sub topic with ID: ${publishedMessageID}`
      );
    } catch (err) {
      logger.error(err);
    }
    return null;
  });

exports.pubsubSessionOnPublish = functions.pubsub
  .topic(SUBSCRIBER_TOPIC)
  .onPublish(async (message, context) => {
    try {
      await sessionOnPublishHandler(message, context);
      logger.info(`'${FUNCTION_NAME}' processing completed.`);
      logger.info(
        `Data processed from ${SUBSCRIBER_TOPIC} topic, and updated in Firestore.`
      );
    } catch (err) {
      logger.error(err);
      throw err;
    }
    return null;
  });
