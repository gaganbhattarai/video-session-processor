'use strict';

const {getLogger} = require('./logging');

const {TranscoderServiceClient} = require('@google-cloud/video-transcoder').v1;

const {sleep} = require('./retry');
const config = require('../config');

const transcoderServiceClient = new TranscoderServiceClient();

const MAX_RETRY = 15;
const RETRY_DELAY = 500;
const REGION = config.get('cloud.project.region');
const GCLOUD_PROJECT = config.get('cloud.project.name');

const transcoderServiceJobStatus = config.get(
  'cloud.transcoderService.jobStatus'
);

const logger = getLogger(__filename);

/**
 * Generate a key for an input object based on the given index
 *
 * @param {Number} index The index to be used in generating the key
 *
 * @return {String} The generated key for the input object
 */
const generateInputObjectKey = (index) => `input${index + 1}`;

/**
 * Generate a list of input object keys based on the given index list
 *
 * @param {Number[]} indexList The list of indices to be used in generating keys
 *
 * @return {String[]} The generated list of input object keys
 */
const generateInputObjectKeyList = (indexList) =>
  indexList.map((index) => generateInputObjectKey(index));

/**
 * Generate a key for an edit atom object based on the given index
 *
 * @param {Number} index The index to be used in generating the key
 *
 * @return {String} The generated key for the edit atom object
 */
const generateEditAtomObjectKey = (index) => `atom${index + 1}`;

/**
 * Generate an input object based on the provided video response and index
 *
 * @param {Object} response The video response object
 * @param {Number} index The index to be used in generating the input object
 *
 * @return {Object} The generated input object
 */
const generateInputObject = (response, index) => {
  return {
    key: generateInputObjectKey(index),
    uri: response.videoUrl,
  };
};

/**
 * Generate a list of input objects based on the provided list of video responses
 *
 * @param {Object[]} responses The list of video response objects
 *
 * @return {Object[]} The generated list of input objects
 */
const generateInputObjectList = (responses) => {
  return responses.map((response, index) =>
    generateInputObject(response, index)
  );
};

/**
 * Generate an edit atom object based on the provided index, input list, and optional time offsets
 *
 * @param {Number} index The index to be used in generating the edit atom object
 * @param {Object[]} inputList The list of input objects to be associated with the edit atom
 * @param {Number|null} startTimeOffset Optional start time offset in seconds
 * @param {Number|null} endTimeOffset Optional end time offset in seconds
 *
 * @return {Object} The generated edit atom object
 */
const generateEditAtomObject = (
  index,
  inputList,
  startTimeOffset = null,
  endTimeOffset = null
) => {
  let editAtom = {
    key: generateEditAtomObjectKey(index),
    inputs: inputList,
  };

  if (startTimeOffset) {
    editAtom = {...editAtom, startTimeOffset: startTimeOffset};
  }

  if (endTimeOffset) {
    editAtom = {...editAtom, endTimeOffset: endTimeOffset};
  }
  return editAtom;
};

/**
 * Generate a list of edit atom objects based on the provided list of video responses
 *
 * @param {Object[]} responses The list of video response objects
 *
 * @return {Object[]} The generated list of edit atom objects
 */
const generateEditAtomObjectList = (responses) => {
  return responses.map((_, index) =>
    generateEditAtomObject(index, generateInputObjectKeyList([index]))
  );
};

/**
 * Generates a request object for a video transcoder operation
 *
 * @param {string} outputURI The URI or path where the transcoded video output will be stored
 * @param {Array<Object>} transcoderInputObjectList List of input objects specifying the source video files and configurations
 * @param {Array<Object>} transcoderEditAtomObjectList List of edit atom objects defining the editing operations to be applied
 * @param {string} outputFileName The name of the output video file
 *
 * @return {Object} A transcoder request object containing information about the transcoding operation.
 */
const generateTranscoderRequestObject = (
  outputURI,
  transcoderInputObjectList,
  transcoderEditAtomObjectList,
  outputFileName
) => {
  const requestLocationPath = transcoderServiceClient.locationPath(
    GCLOUD_PROJECT,
    REGION
  );

  const elementaryStreams = [
    {
      key: 'video-stream0',
      videoStream: {
        h264: {
          frameRate: 60,
          widthPixels: 640,
          heightPixels: 360,
          bitrateBps: 550000,
        },
      },
    },
    {
      key: 'audio-stream0',
      audioStream: {
        codec: 'aac',
        bitrateBps: 64000,
      },
    },
  ];

  const muxStreams = [
    {
      key: outputFileName,
      container: 'mp4',
      elementaryStreams: ['video-stream0', 'audio-stream0'],
    },
  ];

  const request = {
    parent: requestLocationPath,
    job: {
      outputUri: outputURI,
      config: {
        inputs: transcoderInputObjectList,
        editList: transcoderEditAtomObjectList,
        elementaryStreams: elementaryStreams,
        muxStreams: muxStreams,
      },
    },
  };

  return request;
};

/**
 * Merge input videos using Google Cloud Transcoder service
 *
 * @async
 * @param {String} outputShowUri The output URI for the merged video
 * @param {Object[]} transcoderInputObjectList The list of input objects for the transcoder job
 * @param {Object[]} transcoderEditAtomObjectList The list of edit atom objects for the transcoder job
 * @param {String} outputFileName The name of the output file after merging
 *
 * @return {Promise<String>} A Promise that resolves to the result of the transcoder job
 * @throws {Error} If an error occurs during the transcoder job or validation
 *
 */
async function mergeVideo(
  outputShowUri,
  transcoderInputObjectList,
  transcoderEditAtomObjectList,
  outputFileName
) {
  const request = generateTranscoderRequestObject(
    outputShowUri,
    transcoderInputObjectList,
    transcoderEditAtomObjectList,
    outputFileName
  );

  // Set the desired timeout duration in milliseconds
  const timeoutDurationMs = config.get(
    'cloud.transcoderService.timeoutDuration.ms'
  ); // default 5 minutes

  // Set the timeout duration for the API call
  const requestOptions = {
    timeout: timeoutDurationMs,
  };

  const [response] = await transcoderServiceClient.createJob(
    request,
    requestOptions
  );
  logger.info(`Response =======> ${JSON.stringify(response)}`);

  const urlParts = response.name.split('/');
  const jobId = urlParts[urlParts.length - 1];

  logger.info(`JobId =======> ${jobId}`);

  const res = await validateJobStatus(jobId);

  logger.info('TranscoderService job completed successfully!');

  return res;
}

/**
 * Validate the status of a Google Cloud Transcoder service job and wait for completion
 *
 * @async
 * @param {String} jobId The ID of the transcoder job to validate
 * @param {Number} [maxRetries=MAX_RETRY] The maximum number of retries before giving up
 * @param {Number} [currentRetry=0] The current retry attempt
 * @throws {string|Error} Throws an error if the job status is failed or an unexpected value
 *
 * @return {Promise<String>} A Promise that resolves to the final status of the transcoder job
 * @throws {String} If the job status is 'failed' or an unknown status is encountered
 * @throws {Error} Throws an error if the maximum number of retries is exceeded
 *
 */
async function validateJobStatus(
  jobId,
  maxRetries = MAX_RETRY,
  currentRetry = 0
) {
  if (currentRetry > maxRetries) {
    throw new Error(`Exceeded max number of retries for job ${jobId}`);
  }

  const status = await getJobStatus(jobId);

  const delayDuration =
    2 ** currentRetry * RETRY_DELAY +
    Math.floor(Math.random() * (RETRY_DELAY / 100)) * 1000;

  switch (status) {
    case transcoderServiceJobStatus.success:
      return status;
    case transcoderServiceJobStatus.running:
    case transcoderServiceJobStatus.pending:
      logger.info(
        `Waiting for ${delayDuration} milliseconds before checking job status again...`
      );
      await sleep(delayDuration);
      return validateJobStatus(jobId, maxRetries, currentRetry + 1);
    case transcoderServiceJobStatus.failed:
    default:
      throw new Error(status);
  }
}

/**
 * Get the status of a Google Cloud Transcoder service job
 *
 * @async
 * @param {String} jobId The ID of the transcoder job to retrieve the status for
 *
 * @return {Promise<String>} A Promise that resolves to the current status of the transcoder job
 * @throws {Error} If there is an error while retrieving the job status
 *
 */
async function getJobStatus(jobId) {
  const request = {
    name: transcoderServiceClient.jobPath(GCLOUD_PROJECT, REGION, jobId),
  };
  const [response] = await transcoderServiceClient.getJob(request);
  logger.info(`Job state: ${response.state}`);
  logger.info(`Job Id: ${jobId}`);
  logger.info(`Job Error: ${response.error?.message}`);

  return String(response.state);
}

const exportedForTesting = {
  getJobStatus,
  validateJobStatus,
  generateInputObject,
  generateEditAtomObject,
  generateInputObjectKey,
  generateInputObjectKeyList,
  generateInputObjectList,
  generateEditAtomObjectKey,
  generateEditAtomObjectList,
  generateTranscoderRequestObject,
};

module.exports = {
  mergeVideo,
  exportedForTesting,
  generateInputObjectList,
  generateEditAtomObjectList,
};
