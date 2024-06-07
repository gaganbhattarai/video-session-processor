'use-strict';

const os = require('os');
const path = require('path');

const {
  generateThumbnailImages: saveThumbnailImgUsingFFmpeg,
} = require('../../providers/videoProcessing');
const {getLogger} = require('../../providers/logging');
const {downloadGCSFile} = require('../../providers/storage');

const logger = getLogger(__filename);

/**
 * Asynchronously generates a thumbnail image for a media file in a Google Cloud Storage (GCS) bucket
 *
 * @param {string} bucketName The name of the GCS bucket
 * @param {string} responsePath The path within the GCS bucket where thumbnail images will be stored
 * @param {string} mediaFilename The name of the media file for which a thumbnail will be generated
 *
 * @return {Promise<string>} A promise that resolves with the URL of the generated thumbnail image in GCS or rejects if there is an error.
 */
async function generateThumbnailImage(bucketName, responsePath, mediaFilename) {
  const filePath = mediaFilename;
  logger.info(`filePath: =======> ${filePath}`);

  const tempLocalPath = path.join(os.tmpdir(), path.basename(filePath));
  logger.info(`tempLocalPath: =======> ${tempLocalPath}`);

  // First download the media file from cloud storage
  try {
    await downloadGCSFile(bucketName, responsePath + filePath, {
      destination: tempLocalPath,
    });
    logger.info(`File downloaded successfully to ${tempLocalPath}`);
  } catch (err) {
    logger.warn('Error while downloading file!');
    throw err;
  }

  // Then, generate the name and temp path for the thumbnail file
  const splitName = mediaFilename.split('.');
  const thumbnailFilename = `${splitName[0]}_thumbnail.jpg`;
  const localThumbnailImgFullPath = path.join(os.tmpdir(), thumbnailFilename);
  logger.info(
    `localThumbnailImgFullPath =======> ${localThumbnailImgFullPath}`
  );

  // Generate thumbnail image from the media file and save locally
  try {
    await saveThumbnailImgUsingFFmpeg(tempLocalPath, localThumbnailImgFullPath);
  } catch (err) {
    logger.warn(`Error while generating thumbnail: ${err}`);
    throw err;
  }

  return localThumbnailImgFullPath;
}

module.exports = {
  generateThumbnailImage,
};
