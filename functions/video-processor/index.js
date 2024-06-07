'use strict';

// import from a specific subpackage
const {onRequest} = require('firebase-functions/v2/https');

const config = require('./config');
const {getLogger} = require('./provider/logging');
const {processResponse} = require('./src/videoResponseProcessing');

const APP_ENV = config.get('env');
const FUNCTION_NAME = config.get('firebase.function.name');

const logger = getLogger(FUNCTION_NAME);

if (APP_ENV === 'dev') {
  exports.processResponse = processResponse;
}

exports.processVideoAskResponse = onRequest(async (request, response) => {
  logger.info(`${FUNCTION_NAME} function invoked`);

  const processedRequest = await processResponse(request);
  if (!processedRequest) {
    logger.error(`Error with processing function ${FUNCTION_NAME}`);
    response.status(500).send('Error in video response processing!');
    return;
  }
  logger.info(`${FUNCTION_NAME} function done processing`);
  response.send('Video response processed successfully!');
});
