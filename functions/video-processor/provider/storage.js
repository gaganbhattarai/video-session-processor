'use strict';

const https = require('https');
const {Storage} = require('@google-cloud/storage');

/**
 * Stream upload file from HTTPS to a GCS Bucket
 *
 * @async
 * @param {string} fileUrl URL of the file to download
 * @param {string} bucketName Cloud Bucket name
 * @param {string} fileName File name to save as
 * @param {string} newFilePath Path for file in the bucket
 *
 * @return {Promise<void>}
 */
async function streamFileToGCS(fileUrl, bucketName, fileName, newFilePath) {
  // Create a GCS client
  const storage = new Storage();

  // Get a reference to the bucket
  const bucket = storage.bucket(bucketName);

  // Create a reference to a file object
  const file = bucket.file(newFilePath + fileName);

  const stream = file.createWriteStream();

  await new Promise((resolve, reject) => {
    https.get(fileUrl, (res) => {
      res.pipe(stream).on('finish', resolve).on('error', reject);
    });
  });
}

module.exports.streamFileToGCS = streamFileToGCS;
