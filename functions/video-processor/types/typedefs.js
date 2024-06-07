'use strict';

/**
 * @typedef {Object} FormVariable
 * @property {string} key
 * @property {string} type
 */

/**
 * @typedef {Object} FormQuestion
 * @property {string} question_id
 * @property {string} form_id
 * @property {string} media_id
 * @property {string} media_url
 * @property {string} media_type
 * @property {number} media_duration
 * @property {string} label
 * @property {string} gif
 * @property {string} share_id
 * @property {string} share_url
 * @property {string} thumbnail
 * @property {string} transcode_status
 * @property {string} transcribe_status
 * @property {string} transcription
 * @property {TranscriptionData[]} transcription_data
 * @property {string} type
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Form
 * @property {string} form_id
 * @property {string} author_id
 * @property {string} organization_id
 * @property {string} status
 * @property {string} title
 * @property {FormQuestion[]} questions
 * @property {FormVariable[]} variables
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} ContactVariable
 * @property {string} series_id
 * @property {string} contact_user_id
 * @property {string} section_id
 * @property {string} section_name
 * @property {string} next_section_id
 * @property {number|null} subtitle
 */

/**
 * @typedef {Object} TranscriptionWord
 * @property {string} word
 * @property {number} end_time
 * @property {number} start_time
 */

/**
 * @typedef {Object} TranscriptionData
 * @property {TranscriptionWord[] || []} words
 * @property {number} confidence
 * @property {string} transcript
 */

/**
 * @typedef {Object} ContactAnswer
 * @property {string} answer_id
 * @property {string} question_id
 * @property {string} media_id
 * @property {string} media_url
 * @property {number} media_duration
 * @property {string} gif
 * @property {boolean} is_public
 * @property {string} share_id
 * @property {string} share_url
 * @property {string} thumbnail
 * @property {string} transcode_status
 * @property {string} transcribe_status
 * @property {string} transcription
 * @property {TranscriptionData[]} transcription_data
 * @property {string} type
 * @property {string} created_at
 */

/**
 * @typedef {Object} Contact
 * @property {string} contact_id
 * @property {string} organization_id
 * @property {string} respondent_id
 * @property {string} name
 * @property {string} email
 * @property {number|null} phone_number
 * @property {string} thumbnail
 * @property {string} platform
 * @property {string} status
 * @property {ContactAnswer[]} answers
 * @property {ContactVariable} variable
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} RequestBody
 * @property {string} event_id
 * @property {string} event_type
 * @property {string} interaction_id
 * @property {Contact} contact
 * @property {Form} form
 */

/**
 * @typedef {Object} Request
 * @property {RequestBody} body
 * @property {Object} headers
 */

/**
 * @typedef {Object} Respondent
 * @property {string} userId
 * @property {string} name
 * @property {string} email
 * @property {string} phoneNumber
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ProcessedAnswer
 * @property {string} answerId
 * @property {string} mediaUrl
 * @property {string} videoFilename
 * @property {string} videoStorageFilePath
 * @property {string} answerType
 * @property {TranscriptionWord[]|[]} transcribedWords
 * @property {number} transcribedConfidence
 * @property {string} transcript
 */

/**
 * @typedef {Object} ProcessedRequest
 * @property {string} eventId
 * @property {string} interactionId
 * @property {string} userId
 * @property {string} name
 * @property {string} email
 * @property {string} phoneNumber
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {TransformedAnswer[]} answers
 */

/**
 * @typedef {Object} TransformedAnswer
 * @property {string} questionId
 * @property {string} questionTitle
 * @property {string} questionLabel
 * @property {string} answerId
 * @property {string} answerType
 * @property {string} mediaUrl
 * @property {string} videoFilename
 * @property {string} videoStorageFilePath
 * @property {TranscriptionWord[]|[]} transcribedWords
 * @property {number} transcribedConfidence
 * @property {string} transcript
 * @property {string} createdAt
 * @property {string} updatedAt
 */

exports.unused = {};
