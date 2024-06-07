'use-strict';

const filterResponse = require('./filterResponses');
const mapResponses = require('./mapResponsesWithUrl');

module.exports = {
  getFilteredResponse: filterResponse.getFilteredResponse,
  mapResponsesWithURL: mapResponses.mapResponsesWithURL,
};
