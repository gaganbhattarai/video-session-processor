'use-strict';

const config = require('../../config');
const {getFilteredResponse} = require('../response');
const {getLogger} = require('../../providers/logging');
const {getStorage} = require('../../providers/firebase');
const {mergeVideoResponses} = require('./mergeVideoResponses');
const {generatePreviewURL} = require('../../providers/storage');
const {generateSessionChapters} = require('./generateSessionChapters');

const logger = getLogger(__filename);

const bucketRef = getStorage().bucket();

const BUCKET_NAME = bucketRef.name;
const BUCKET_PATH = `gs://${BUCKET_NAME}/`;

const SESSIONS_DIRECTORY = config.get('firebase.storage.sessionsDirectory');

const HTTP_SESSION_STORAGE_PATH = `${config.get(
  'cloud.bucket.httpsBaseURL'
)}/${BUCKET_NAME}/${SESSIONS_DIRECTORY}`;

/**
 * Asynchronously generates a new session based on video responses with URLs and other parameters
 *
 * @async
 * @param {Array<Object>} videoResponsesWithUrl An array of video response objects, each containing a URL attribute
 * @param {string} responsePath The path within the GCS bucket where response files will be stored
 * @param {string} bucketName The name of the Google Cloud Storage (GCS) bucket
 * @param {string} outputFileName The name of the output file for the generated session
 * @param {Object} eventData Additional event data related to the session generation
 *
 * @return {Promise<string>} A promise that resolves with the URL of the generated session file in GCS or rejects if there is an error
 */
async function generateNewSessionSection(
  videoResponsesWithUrl,
  responsePath,
  bucketName,
  outputFileName,
  eventData
) {
  const videoAnswerChapters = await generateSessionChapters(
    videoResponsesWithUrl,
    bucketName,
    responsePath
  );
  logger.info('Response chapter generation operation completed.');

  const status = await mergeVideoResponses(
    videoResponsesWithUrl,
    `${BUCKET_PATH}${eventData.tenantId}/${SESSIONS_DIRECTORY}/`,
    outputFileName
  );
  logger.info(`Video responses merged, status: ${status}`);

  // Generate preview URL of the merged video response
  const previewUrl = await generatePreviewURL(
    bucketName,
    `${eventData.tenantId}/${SESSIONS_DIRECTORY}`,
    outputFileName
  );
  logger.info(`Preview URL generated: ${previewUrl}`);

  const data = {
    chapters: videoAnswerChapters,
    mediaUrl: previewUrl,
    storageMediaUrlPath: `${HTTP_SESSION_STORAGE_PATH}/${outputFileName}.mp4`,
    ...eventData,
  };

  return data;
}

/**
 * Generates data for a session section
 *
 * @async
 * @param {Object<string, any>} data The data for the session section
 * @param {string} documentId The ID of the document
 * @param {string} responseId The ID of the response
 * @param {string} responsePath The path within the GCS bucket where response files will be stored
 * @param {string} organizationId Tenant ID of the response
 *
 * @return {Promise<any>} A promise that resolves to the generated session section data
 */
async function generateSessionSectionData(
  data,
  documentId,
  responseId,
  responsePath,
  organizationId
) {
  const storagePath = BUCKET_PATH + responsePath;

  logger.info(`Number of answers =============> ${data.answers?.length}`);
  logger.info(`SectionID =============> ${data.sectionId}`);

  // Set up the configuration objects for filtering the response
  const filterOptions = {
    attributeName: 'answerType',
    attributeValue: config.get('response.videoAnswerType'),
  };
  const includeURLinResponse = true;
  const includeURLOptions = {
    filename: 'videoFilename',
    storagePath: storagePath,
    urlAttributeName: 'videoUrl',
  };

  const videoAnswersWithUrl = getFilteredResponse(
    data.answers,
    filterOptions,
    includeURLinResponse,
    includeURLOptions
  );

  if (videoAnswersWithUrl === null) {
    throw Error('No Video Responses found!');
  }

  const outputFileName = `${documentId}_${responseId}_${data.sectionId}`;
  const eventSectionData = {
    sectionId: data.sectionId,
    sectionName: data.sectionName,
    subtitle: data.sectionSubtitle,
    tenantId: organizationId,
  };

  // Generate the section-wise response chapters
  const sectionData = await generateNewSessionSection(
    videoAnswersWithUrl,
    responsePath,
    BUCKET_NAME,
    outputFileName,
    eventSectionData
  );

  logger.info(`Session section: ${data.sectionId} processed.`);
  return sectionData;
}

const exportedForTesting = {
  generateNewSessionSection,
};
module.exports = {
  exportedForTesting,
  generateSessionSectionData,
};
