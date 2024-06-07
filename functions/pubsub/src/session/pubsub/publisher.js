'use-strict';

const {generateResponseObject} = require('./helper');

/**
 * Generates Pub/Sub publisher data based on a reference ID and an array of responses
 *
 * @param {String} referenceID The reference ID associated with the data.
 * @param {Array<typedefs.SessionSection>} responses An array of session section response objects
 *
 * @return {typedefs.SessionPublisherData} The generated publisher data
 */
function generateData(referenceID, responses) {
  const responseInRequiredFormat = responses.map((response) =>
    generateResponseObject(response)
  );

  const data = {
    referenceId: referenceID,
    responses: responseInRequiredFormat,
  };
  return data;
}

module.exports = {
  generateData,
};
