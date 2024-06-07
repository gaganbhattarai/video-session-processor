'use-strict';

const {getLogger} = require('../../providers/logging');
const {mapResponsesWithURL} = require('./mapResponsesWithUrl');

const logger = getLogger(__filename);

/**
 * Filters an array of responses based on a specified response type attribute and value
 *
 * @param {Array<Object>} responses An array of response objects
 * @param {string} attributeName The attribute name in each response object representing the response type
 * @param {string} attributeValue The desired response type to filter responses by
 *
 * @return {Array<Object>} An array containing only the responses matching the specified response type.
 */
function filterResponses(responses, attributeName, attributeValue) {
  return responses.filter((res) => res[attributeName] === attributeValue);
}

/**
 * Retrieves a filtered response from an array of responses based on provided filter options
 *
 * @param {Array<Object>} responses An array of response objects
 * @param {Object} filterOptions An object containing properties to filter responses
 * @param {string} filterOptions.attributeName The attribute name to filter responses by
 * @param {string} filterOptions.attributeValue The desired attribute value to filter responses by
 * @param {boolean} [includeURLinResponse=false] Whether to include the URL attribute in the response
 * @param {Object} [includeOptions={}] Additional options for including attributes in the response
 *
 * @return {Array<Object>|null} The filtered response object or null if no matching response is found.
 */
function getFilteredResponse(
  responses,
  filterOptions,
  includeURLinResponse = false,
  includeOptions = {}
) {
  const filteredResponses = filterResponses(
    responses,
    filterOptions.attributeName,
    filterOptions.attributeValue
  );
  if (filteredResponses.length === 0) {
    logger.warn(`No ${filterOptions.responseType} responses found`);
    return null;
  }
  logger.info(`filteredResponses.length: =======> ${filteredResponses.length}`);

  if (includeURLinResponse === false) {
    return filteredResponses;
  }

  const filteredResponsesWithUrl = mapResponsesWithURL(
    filteredResponses,
    includeOptions.filename,
    includeOptions.storagePath,
    includeOptions.urlAttributeName
  );

  return filteredResponsesWithUrl;
}

const exportedForTesting = {
  filterResponses,
};

module.exports = {
  exportedForTesting,
  getFilteredResponse,
};
