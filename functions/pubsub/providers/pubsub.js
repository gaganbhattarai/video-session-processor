'use-strict';

const avro = require('avro-js');
const {PubSub, Encodings, Schema} = require('@google-cloud/pubsub');

const config = require('../config');
const {getLogger} = require('./logging');
const typedefs = require('../types/typedefs'); // eslint-disable-line no-unused-vars

const FUNCTION_NAME = config.get('firebase.function.name');

const logger = getLogger(__filename);

const pubSubClient = new PubSub();

/**
 * Retrieves the metadata for the schema of a given topic
 *
 * @async
 * @param {String} topicNameOrId - The name or ID of the Pub/Sub topic
 *
 * @return {Promise<typedefs.PubSubSchemaSettings|null>} The metadata for the schema of the topic
 *
 * @throws {String} If the topic doesn't have a schema, an error message is thrown
 */
async function getTopicSchemaMetadata(topicNameOrId) {
  const topic = pubSubClient.topic(topicNameOrId);
  const [topicMetadata] = await topic.getMetadata();

  const topicSchemaMetadata = topicMetadata?.schemaSettings;

  if (!topicSchemaMetadata) {
    const errorMessage = `Topic ${topicNameOrId} doesn't have a schema.`;
    logger.error(errorMessage);
    throw Error(errorMessage);
  }
  return topicSchemaMetadata;
}

/**
 * Retrieves the definition of a schema by its name
 *
 * @async
 * @param {String} schemaName The name of the schema
 *
 * @return {Promise<String|null>} The definition of the schema, or null if the schema is not found
 */
async function getSchemaDefinition(schemaName) {
  const schema = pubSubClient.schema(schemaName);
  const schemaDefinition = (await schema.get()).definition;

  return schemaDefinition;
}

/**
 * Encodes a message using a specific encoding and schema definition
 *
 * @param {String} encoding The encoding type to use for the message
 * @param {String} schemaDefinition The definition of the schema to encode the data
 * @param {Object} data Data to be encoded
 *
 * @return {Buffer} The encoded message
 *
 * @throws {String} If error encountered on encoding process
 */
function encodeMessage(encoding, schemaDefinition, data) {
  const type = avro.parse(schemaDefinition);

  let dataBuffer;
  switch (encoding) {
    case Encodings.Binary:
      dataBuffer = type.toBuffer(data);
      break;
    case Encodings.Json:
      dataBuffer = Buffer.from(type.toString(data));
      break;
    default:
      logger.error(`Unknown schema encoding: ${encoding}`);
      break;
  }
  if (!dataBuffer) {
    const errorMessage = `Invalid encoding ${encoding}.`;
    logger.error(errorMessage);
    throw Error(errorMessage);
  }
  return dataBuffer;
}

/**
 * Decodes a message using a specific encoding and schema definition
 *
 * @param {String} encoding The encoding type used for the message
 * @param {String} schemaDefinition The definition of the schema used to encode the data
 * @param {String|Buffer} message The encoded message to decode
 *
 * @return {Object} The decoded message
 *
 * @throws {String} If error encountered on decoding process
 */
function decodeMessage(encoding, schemaDefinition, message) {
  const type = avro.parse(schemaDefinition);

  let result;
  switch (encoding) {
    case Encodings.Binary:
      result = type.fromBuffer(message);
      break;
    case Encodings.Json:
      result = JSON.parse(Buffer.from(message, 'base64').toString());
      break;
    default:
      logger.error(`Unknown schema encoding: ${encoding}`);
      break;
  }
  if (!result) {
    const errorMessage = `Invalid encoding ${encoding}.`;
    logger.error(errorMessage);
    throw Error(errorMessage);
  }
  return result;
}

/**
 * Process a published message from a specified topic
 *
 * @async
 * @param {String} topicNameOrId The name or ID of the topic of the message
 * @param {typedefs.SessionSubcriberMessage} message The message to be pulled from the topic
 *
 * @return {Promise<Object|null>} A promise that resolves once the message has been successfully pulled
 */
async function processMessage(topicNameOrId, message) {
  const topicSchemaMetadata = await getTopicSchemaMetadata(topicNameOrId);

  const schemaName = topicSchemaMetadata.schema;
  const schemaDefinition = await getSchemaDefinition(schemaName);

  const schemaMetadata = Schema.metadataFromMessage(message.attributes);

  const decodedMessage = decodeMessage(
    schemaMetadata.encoding,
    schemaDefinition,
    message.data
  );
  logger.info(`Message from topic ${topicNameOrId} processed successfully.`);

  return decodedMessage;
}

/**
 * Publish a message to a Pub/Sub topic with custom attributes
 *
 * @async
 * @param {String} topicNameOrId The Pub/Sub topic name or id
 * @param {Object<Any>} data Data object to be published
 * @param {Object<String, Any>} attributes Custom attribute configuration object
 *
 * @return {Promise<String>} MessageId of the published data
 */
async function publishMessage(
  topicNameOrId,
  data,
  attributes = {
    origin: FUNCTION_NAME,
  }
) {
  const topic = pubSubClient.topic(topicNameOrId);

  const topicSchemaMetadata = await getTopicSchemaMetadata(topicNameOrId);

  const schemaEncoding = topicSchemaMetadata.encoding;
  const schemaName = topicSchemaMetadata.schema;
  const schemaDefinition = await getSchemaDefinition(schemaName);

  const encodedMessage = encodeMessage(schemaEncoding, schemaDefinition, data);

  const messageId = await topic.publishMessage({
    data: encodedMessage,
    attributes,
  });

  logger.info(`Message ${messageId} published to topic ${topicNameOrId}`);

  return messageId;
}

const exportedForTesting = {
  decodeMessage,
  encodeMessage,
  getSchemaDefinition,
  getTopicSchemaMetadata,
};

module.exports = {
  processMessage,
  publishMessage,
  exportedForTesting,
};
