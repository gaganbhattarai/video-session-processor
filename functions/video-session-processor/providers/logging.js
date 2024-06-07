'use strict';

const {Logging} = require('@google-cloud/logging');

const config = require('../config');

const APP_ENV = config.get('env');
const REGION = config.get('firebase.function.region');
const PROJECT_ID = config.get('cloud.project.id');
const FUNCTION_NAME = config.get('firebase.function.name');

// Creates a client
const logging = new Logging({projectId: PROJECT_ID});

function getLogger(
  logName = FUNCTION_NAME,
  resourceType = 'cloud_function',
  resourceRegion = REGION,
  functionName = FUNCTION_NAME
) {
  const logger = logging.log(logName);

  async function write(message, severity = 'DEBUG') {
    // The metadata associated with the entry
    const metadata = {
      resource: {
        type: resourceType,
        labels: {function_name: functionName, region: resourceRegion},
      },
      severity,
    };

    // Prepares a log entry
    const entry = logger.entry(metadata, message);

    if (APP_ENV !== 'prod') {
      if (severity !== 'ERROR') {
        console.log(message);
      } else {
        console.error(message);
      }
    }
    // Writes the log entry
    await logger.write(entry);
  }

  return {
    debug: async (msg) => write(msg, 'DEBUG'),
    info: async (msg) => write(msg, 'INFO'),
    warn: async (msg) => write(msg, 'WARNING'),
    error: async (msg) => write(msg, 'ERROR'),
  };
}

module.exports = {getLogger};
