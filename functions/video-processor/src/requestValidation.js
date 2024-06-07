'use strict';

const config = require('../config');
const typedefs = require('../types/typedefs'); // eslint-disable-line no-unused-vars

const {getSecretValue} = require('../provider/secretManager');
const {fetchSingleDocumentMatchingCondition} = require('../provider/firestore');

/**
 * Check the validity of the request
 *
 * @param {typedefs.Request} req Request sent to the endpoint
 *
 * @return {Boolean} True if request is valid otherwise False
 */
function isValidRequest(req) {
  return Boolean(req?.body?.contact);
}

/**
 * Check validity of the request body content
 *
 * @param {typedefs.RequestBody} requestBody Request Body content
 *
 * @return {Boolean} True if request body is valid otherwise False
 */
function hasValidRequestBody(requestBody) {
  const {
    contact: {
      name,
      email,
      status,
      variables: {
        contact_user_id: userId,
        section_id: sectionId,
        section_name: sectionName,
        series_id: seriesId,
      } = {},
    } = {},
  } = requestBody;

  return !(
    !(name && email && userId && sectionId && sectionName && seriesId) ||
    status !== config.get('request.completedStatus')
  );
}

/**
 * Validate authenticated requests
 *
 * @async
 * @param {typedefs.Request} req The request object
 * @param {String} authHeaderName The name of the custom authentication header
 *
 * @return {Promise<Boolean>} True if request contains valid authentication header, False otherwise
 */
async function isAuthenticated(
  req,
  authHeaderName = config.get('request.authHeader.name')
) {
  const headerFlag =
    Boolean(req?.headers) && Boolean(req.headers[authHeaderName]);

  if (headerFlag === false) {
    return false;
  }

  const authSignature = await getSecretValue(
    config.get('cloud.secret.authSignatureName')
  );
  const headerValue = req.headers[authHeaderName];

  return headerValue === authSignature;
}

async function validateUserOrganization(
  email,
  organizationId
) {
    const { tenantId } = fetchSingleDocumentMatchingCondition(
      'users',
      [{field: 'email', operator: '==', value: email}]
    )

    if (Array.isArray(tenantId) && tenantId.includes(organizationId)) {
      return true;
    }
    return tenantId === organizationId;
}

module.exports = {
  isValidRequest,
  isAuthenticated,
  hasValidRequestBody,
  validateUserOrganization,
};
