'use strict';

/**
 * @typedef {Number} Encoding
 */

/**
 * @enum {Encoding}
 */
/* eslint-disable no-unused-vars */
const TYPES = {
  ENCODING_UNSPECIFIED: 0,
  JSON: 1,
  BINARY: 2,
};
/* eslint-enable no-unused-vars */

/**
 * @typedef {Object} PubSubSchemaSettings
 * @property {String} schema
 * @property {Encoding} encoding
 * @property {String} firstRevisionId
 * @property {String} lastRevisionId
 */

/**
 * @typedef {Object} SessionSubcriberMessageAttribute
 * @property {String} googclient_schemaencoding
 * @property {String} googclient_schemarevisionid
 */

/**
 * @typedef {Object} SessionSubcriberMessage
 * @property {String} data
 * @property {SubscriberMessageAttribute} attributes
 */

/**
 * @typedef {Object} SessionPublisherResponse
 * @property {String} sectionName
 * @property {String} sectionDescription
 * @property {Array<ResponseAnswer>} answers
 */

/**
 * @typedef {Object} SessionPublisherResponseAnswer
 * @property {String} question
 * @property {String} answer
 */

/**
 * @typedef {Object} SessionPublisherData
 * @property {String} referenceID
 * @property {Array<PublisherResponse>}
 */

/**
 * @typedef {Object} SessionSectionChapter
 * @property {String} answerId
 * @property {String} questionTitle
 * @property {Object} time
 * @property {String} transcript
 */

/**
 * @typedef {Object} SessionSection
 * @property {Array<SessionSectionChapter>} chapters
 * @property {String} mediaUrl
 * @property {String} sectionId
 * @property {String} sectionName
 * @property {String} storageMediaUrlPath
 * @property {String} subtitle
 */

exports.unused = {};
