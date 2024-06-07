const path = require('path');

const uuid = require('uuid-v4');

const config = require('../config');
const {getLogger} = require('./logging');
const {withRetries} = require('./retry');
const {updateDocumentWithRef} = require('./firestore');
const {getPreviewURL, streamLocalFileToGCS} = require('./storage');

const MAX_RETRIES = 2;

const BUCKET_NAME = config.get('cloud.bucket.name');

const logger = getLogger(__filename);

/**
 * Saves a thumbnail to a document in a database collection
 *
 * @async
 * @param {String} uniqueID Unique identifier associated with the thumbnail
 * @param {String} filename Name of the thumbnail file
 * @param {String} filePath File path
 * @param {FirebaseFirestore.DocumentReference} documentRef Firestore document reference
 * @param {String} httpStoragePath HTTP path or URL where the thumbnail is stored
 *
 * @return {Promise<void>} Promise that resolves when the thumbnail is saved to the document or rejects if there is an error
 */
async function saveThumbnailToDocument(
  uniqueID,
  filename,
  filePath,
  documentRef,
  httpStoragePath
) {
  const fullFilePath = `${filePath}${filename}`;

  const imgUrl = getPreviewURL(BUCKET_NAME, fullFilePath, uniqueID);
  logger.info(`Preview URL =======> ${imgUrl}`);

  const data = {
    thumbnailImage: imgUrl,
    storageThumbnailImagePath: `${httpStoragePath}/${fullFilePath}`,
  };

  await updateDocumentWithRef(documentRef, data);
}

/**
 * Asynchronously saves a thumbnail to a document in a database collection with retry logic
 *
 * @async
 * @param {String} uniqueID The unique identifier associated with the thumbnail
 * @param {String} filename The name of the thumbnail file
 * @param {String} collectionName The name of the database collection where the document is stored
 * @param {String} docID The identifier of the document where the thumbnail will be saved
 * @param {String} httpStoragePath The HTTP path or URL where the thumbnail is stored
 * @param {FirebaseFirestore.DocumentReference} parentDocRef Document reference of the parent
 *
 * @return {Promise<void>} A promise that resolves when the thumbnail is saved to the document or rejects if there is an error after maximum retries
 */
const saveThumbnailToDocumentWithRetry = withRetries({
  func: saveThumbnailToDocument,
  maxRetries: MAX_RETRIES,
});

/**
 * Asynchronously uploads a thumbnail from a local path to a Google Cloud Storage (GCS) bucket
 *
 * @async
 * @param {String} localImgFullPath Full local path of the thumbnail image
 * @param {String} bucketName Name of the GCS bucket to upload the image
 * @param {String} bucketPath Path of the object in the bucket
 *
 * @return {Promise<string>} Promise that resolves with the GCS URL of the uploaded thumbnail or rejects if there is an error
 */
async function uploadThumbnail(localImgFullPath, bucketName, bucketPath) {
  // Generate a unique file name for the image
  const uniqueID = uuid();

  const uploadFilename = path.basename(localImgFullPath);

  // Upload the image to Firebase Storage
  try {
    await streamLocalFileToGCS(
      localImgFullPath,
      bucketName,
      bucketPath,
      uploadFilename,
      {
        contentType: 'image/jpeg',
        metadata: {
          firebaseStorageDownloadTokens: uniqueID,
        },
      }
    );
    logger.info('Thumbnail image uploaded successfully.');
    return uniqueID;
  } catch (err) {
    logger.error(`Error uploading image: ${err}`);
    throw err;
  }
}

module.exports = {
  uploadThumbnail,
  saveThumbnailToDocumentWithRetry,
};
