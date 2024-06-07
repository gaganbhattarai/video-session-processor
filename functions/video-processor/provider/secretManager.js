'use strict';

const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

const config = require('../config');

const PROJECT_NUMBER = config.get('cloud.project.number');

const secrets = new SecretManagerServiceClient();

/**
 * Get a secret value from the secret manager
 *
 * @async
 * @param {String} name The name of the secret
 * @param {String} versionToFetch Version of the secret to fetch
 * @param {String} projectNumber GCP project number
 *
 * @return {Promise<String>} The secret value
 */
async function getSecretValue(
  name,
  versionToFetch = 'latest',
  projectNumber = PROJECT_NUMBER
) {
  const [version] = await secrets.accessSecretVersion({
    name: `projects/${projectNumber}/secrets/${name}/versions/${versionToFetch}`,
  });

  const payload = version.payload?.data?.toString();
  return payload;
}

module.exports = {
  getSecretValue,
};
