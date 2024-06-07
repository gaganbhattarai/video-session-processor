'use-strict';

/**
 * Maps an array of responses with URLs based on provided attributes for filename and storage path
 *
 * @param {Array<Object>} responses An array of response objects
 * @param {string} responseFilenameAttribute The attribute name containing the filename in each response object
 * @param {string} storagePath The base storage path or URL where the files are stored
 * @param {string} urlAttributeName The attribute name to store the generated URL in each response object
 *
 * @return {Array<Object>} An array of response objects with added URLs based on the provided attributes
 */
function mapResponsesWithURL(
  responses,
  responseFilenameAttribute,
  storagePath,
  urlAttributeName
) {
  return responses.map((response) => {
    const url = storagePath + response[responseFilenameAttribute];
    return {
      ...response,
      [urlAttributeName]: url,
    };
  });
}

module.exports.mapResponsesWithURL = mapResponsesWithURL;
