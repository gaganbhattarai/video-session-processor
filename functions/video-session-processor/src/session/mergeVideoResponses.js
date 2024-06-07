'use-strict';

const {
  mergeVideo,
  generateInputObjectList,
  generateEditAtomObjectList,
} = require('../../providers/transcoder');
const {getLogger} = require('../../providers/logging');

const logger = getLogger(__filename);

/**
 * Asynchronously merges video responses into a single video file in a Google Cloud Storage (GCS) bucket
 *
 * @async
 * @param {Array<Object>} videoResponsesWithUrl An array of video response objects, each containing a URL attribute
 * @param {string} bucketUri The URI of the GCS bucket where the video files are stored
 * @param {string} outputFileName The name of the output file for the merged video
 *
 * @return {Promise<string>} A promise that resolves with the URL of the merged video file in GCS or rejects if there is an error
 */
async function mergeVideoResponses(
  videoResponsesWithUrl,
  bucketUri,
  outputFileName
) {
  const videoAnswersWithUrl = videoResponsesWithUrl;

  const transcoderInputObjectList =
    generateInputObjectList(videoAnswersWithUrl);

  const transcoderEditAtomObjectList =
    generateEditAtomObjectList(videoAnswersWithUrl);

  // Define the request object for the transcoder job
  const outputShowUri = bucketUri;

  const status = await mergeVideo(
    outputShowUri,
    transcoderInputObjectList,
    transcoderEditAtomObjectList,
    outputFileName
  );
  logger.info(`Video response merge status: ${status}`);
  return status;
}

module.exports.mergeVideoResponses = mergeVideoResponses;
