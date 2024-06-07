'use strict';

const fs = require('fs');
const https = require('https');

const uuid = require('uuid-v4');
const {Bucket, File, Storage} = require('@google-cloud/storage'); // eslint-disable-line no-unused-vars

const config = require('../config');
const {getLogger} = require('./logging');

const logger = getLogger(__filename);

/**
 * Return a reference to a GCS bucket
 *
 * @param {String} bucketName Name of the GCS bucket
 *
 * @return {Bucket} Reference to the bucket
 */
function getBucketReference(bucketName) {
  const storage = new Storage();

  return storage.bucket(bucketName);
}

/**
 * Return a reference to an object/file in GCS bucket
 *
 * @param {String} bucketName Name of the Google Cloud Storage bucket
 * @param {String} bucketPath Path to the file within the bucket
 *
 * @return {File} Google Cloud Storage file reference
 */
function getBucketFileReference(bucketName, bucketPath) {
  const bucketRef = getBucketReference(bucketName);
  const fileRef = bucketRef.file(bucketPath);
  return fileRef;
}

/**
 * Sets metadata for a file in the specified Google Cloud Storage bucket
 *
 * @async
 * @param {String} bucketName The name of the Google Cloud Storage bucket
 * @param {String} filePath The path to the file within the bucket
 * @param {Object} metadata The metadata to be set for the file
 *
 * @return {Promise<void>} A Promise that resolves once the file metadata is successfully set
 */
async function setFileMetadata(bucketName, filePath, metadata) {
  const fileRef = getBucketFileReference(bucketName, filePath);
  return await fileRef.setMetadata(metadata);
}

/**
 * Asynchronously streams a file from a given URL to a Google Cloud Storage (GCS) bucket
 *
 * @async
 * @param {String} fileUrl The URL of the file to be streamed
 * @param {String} bucketName The name of the GCS bucket
 * @param {String} fileName The name of the file in GCS
 * @param {String} newFilePath The path within the GCS bucket where the file will be stored
 *
 * @return {Promise<void>} A promise that resolves when the streaming is finished or rejects if there is an error
 *
 */
async function streamFileToGCS(fileUrl, bucketName, fileName, newFilePath) {
  // Create a reference to a file object
  const file = getBucketFileReference(bucketName, newFilePath + fileName);

  const stream = file.createWriteStream();

  await new Promise((resolve, reject) => {
    https.get(fileUrl, (res) => {
      res.pipe(stream).on('finish', resolve).on('error', reject);
    });
  });
}

/**
 * Asynchronously streams a local file to a Google Cloud Storage (GCS) bucket
 *
 * @async
 * @param {String} filePath Local path of the file to be streamed
 * @param {String} bucketName Name of the GCS bucket
 * @param {String} bucketPath Path within the GCS bucket where the file will be stored
 * @param {String} fileName Name of the file in GCS
 * @param {Object} [metadata={}] Optional metadata to associate with the GCS file
 *
 * @return {Promise<void>} Promise that resolves when the streaming is finished or rejects if there is an error
 */
async function streamLocalFileToGCS(
  filePath,
  bucketName,
  bucketPath,
  fileName,
  metadata = {}
) {
  // Create a reference to a file object
  const file = getBucketFileReference(bucketName, bucketPath + fileName);

  const stream = file.createWriteStream({
    metadata: metadata,
  });

  const readStream = fs.createReadStream(filePath);

  await new Promise((resolve, reject) => {
    readStream.pipe(stream).on('finish', resolve).on('error', reject);
  });
}

/**
 * Asynchronously downloads a file from Google Cloud Storage (GCS) to a local destination
 *
 * @async
 * @param {String} bucketName The name of the GCS bucket
 * @param {String} filePath The path of the file within the GCS bucket
 * @param {Object} [options={}] Optional download options
 * @param {String} [options.localDestination] The local file path where the GCS file will be saved. If not provided, the file will be saved in the current working directory with the same name
 * @param {boolean} [options.createReadStreamOptions] Options to pass to createReadStream method when downloading the file
 
* @return {Promise<void>} A promise that resolves when the file download is completed or rejects if there is an error.
*/
async function downloadGCSFile(bucketName, filePath, options = {}) {
  const file = getBucketFileReference(bucketName, filePath);
  await file.download(options);
}

/**
 * Get the preview URL for file in the bucket
 *
 * @param {String} bucketName Name of the GCS bucket
 * @param {String} fullFilePath Full path of the file
 * @param {String} uniqueID Unique ID for authorization
 *
 * @return {String} Firebase Storage encoded URL to access data
 */
function getPreviewURL(bucketName, fullFilePath, uniqueID) {
  const imgUrl = `${config.get(
    'firebase.storage.previewURLRoot'
  )}/v0/b/${bucketName}/o/${encodeURIComponent(
    fullFilePath
  )}?alt=media&token=${uniqueID}`;
  return imgUrl;
}

/**
 * Generate a preview URL for a video file stored in a Google Cloud Storage bucket
 *
 * @async
 * @param {String} bucketName The name of the storage bucket
 * @param {String} directory The directory where the video file is stored
 * @param {String} outputFileName The name of the video file
 *
 * @return {Promise<String>} A Promise that resolves to the generated preview URL
 * @throws {Error} If there is an error during the generation or retrieval of the preview URL
 *
 */
async function generatePreviewURL(bucketName, directory, outputFileName) {
  const uniqueUID = uuid();
  logger.info(`uniqueUID =======> ${uniqueUID}`);

  // Generate preview URL for the session (file uploaded through transcoder API)
  const filePath = `${directory}/${outputFileName}.mp4`;

  // Update the access token for the file
  await setFileMetadata(bucketName, filePath, {
    metadata: {
      firebaseStorageDownloadTokens: uniqueUID,
    },
  });

  // Fetch the actual URL to use for preview
  const previewUrl = getPreviewURL(bucketName, filePath, uniqueUID);
  logger.info(`Preview Video URL =======> ${previewUrl}`);
  return previewUrl;
}

module.exports = {
  getPreviewURL,
  downloadGCSFile,
  setFileMetadata,
  streamFileToGCS,
  generatePreviewURL,
  streamLocalFileToGCS,
  getBucketFileReference,
};
