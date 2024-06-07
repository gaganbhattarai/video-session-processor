'use-strict';

const newSession = require('./generateNewSession');
const thumbnailImage = require('./generateThumbnailImage');

module.exports = {
  generateThumbnailImage: thumbnailImage.generateThumbnailImage,
  generateSessionSectionData: newSession.generateSessionSectionData,
};
