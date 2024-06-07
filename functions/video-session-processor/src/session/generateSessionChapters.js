'use-strict';

const {getLogger} = require('../../providers/logging');
const {getBucketFileReference} = require('../../providers/storage');
const {getMediaDuration} = require('../../providers/videoProcessing');

const logger = getLogger(__filename);

/**
 * Format a number to a specified number of decimal places
 *
 * @param {Number} number The number to be formatted
 * @param {Number} places The number of decimal places to format
 *
 * @return {String} The formatted number as a string
 */
const formatNumberToSetPlaces = (number, places) =>
  Number(Number(number).toFixed(places));

/**
 * Generate a list of chapter objects based on the provided list of video responses
 *
 * @async
 * @param {Object[]} response The list of video response objects
 * @param {String} bucketName The name of the storage bucket
 * @param {String} filePath The file path where the videos are stored
 *
 * @return {Promise<Object[]|null>} A Promise that resolves to the list of chapter objects, or null if an error occurs
 */
async function generateResponseChapters(response, bucketName, filePath) {
  let endTime;
  let startTime;
  let prevEndTime;

  const videoResponseChapterList = [];

  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < response.length; i++) {
    const res = response[i];
    const fullFilePath = filePath + res.videoFilename;
    const file = getBucketFileReference(bucketName, fullFilePath);

    const duration = await getMediaDuration(file);
    logger.info(`Duration of ${res.mediaUrl}: ${duration} seconds`);

    if (i === 0) {
      startTime = 0;
      endTime = duration;
    } else {
      prevEndTime = videoResponseChapterList[i - 1].time.endTime;
      startTime = prevEndTime + 0.5;
      endTime = duration + prevEndTime;
    }

    videoResponseChapterList.push({
      answerId: res.answerId,
      transcript: res.transcript,
      questionTitle: res.questionTitle,
      time: {
        endTime: formatNumberToSetPlaces(endTime, 2),
        startTime: formatNumberToSetPlaces(startTime, 2),
      },
    });
    logger.info(`InsertChapter : ${videoResponseChapterList.length}`);
  }
  /* eslint-enable no-await-in-loop */

  return videoResponseChapterList;
}

const exportedForTesting = {
  formatNumberToSetPlaces,
};

module.exports = {
  exportedForTesting,
  generateSessionChapters: generateResponseChapters,
};
