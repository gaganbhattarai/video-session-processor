const path = require('path');

const ffmpeg = require('fluent-ffmpeg');
const {File} = require('@google-cloud/storage'); // eslint-disable-line no-unused-vars

const {getLogger} = require('./logging');

const logger = getLogger(__filename);

/**
 * Get the duration of the video using FFmpeg's ffprobe
 *
 * @param {ReadableStream|File} file A File object/reference or a ReadableStream representing the multimedia file
 *
 * @return {Promise<Number>} A Promise that resolves to the duration of the multimedia file in seconds
 * @throws {Error} Raises if error during ffprobe execution
 */
const getMediaDuration = (file) =>
  new Promise((resolve, reject) => {
    ffmpeg(file.createReadStream()).ffprobe((err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.format.duration);
      }
    });
  });

/**
 * Generates thumbnail images from a media file and saves them to a specified path
 *
 * @param {string} mediaFilePath The path to the source media file from which thumbnails will be generated
 * @param {string} thumbnailImagePath The path where the generated thumbnail images will be saved
 *
 * @return {Promise<void>} A promise that resolves when thumbnail generation is complete or rejects if there is an error
 */
const generateThumbnailImages = (mediaFilePath, thumbnailImagePath) =>
  new Promise((resolve, reject) => {
    ffmpeg(mediaFilePath)
      .on('filenames', (filenames) => {
        logger.info(`Will generate ${filenames.join(', ')}`);
      })
      .on('end', () => {
        logger.info('Screenshots taken');
        resolve();
      })
      .on('error', (err) => {
        logger.error(`Error taking screenshots: ${err}`);
        reject(err);
      })
      .screenshots({
        count: 1,
        folder: path.dirname(thumbnailImagePath),
        filename: path.basename(thumbnailImagePath),
      });
  });

module.exports = {
  getMediaDuration,
  generateThumbnailImages,
};
