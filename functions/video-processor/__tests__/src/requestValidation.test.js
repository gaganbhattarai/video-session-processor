'use-strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const {
  isValidRequest,
  hasValidRequestBody,
} = require('../../src/requestValidation');

const testRequest = require('../fixtures/validRequest');

const requestValidationMock = {
  SecretManager: {
    getSecretValue: sinon.stub().resolves('valid-signature'),
  },
};

const {isAuthenticated} = proxyquire('../../src/requestValidation.js', {
  '../provider/secretManager': requestValidationMock.SecretManager,
});

let invalidRequest;

test.beforeEach('Reset the invalidRequest object', () => {
  invalidRequest = JSON.parse(JSON.stringify(testRequest));
});

test.serial('"isValidRequest" returns true for valid request', (t) => {
  const r = isValidRequest(testRequest.request);
  t.is(r, true);
});

test.serial(
  '"isValidRequest" returns false for missing body in request',
  (t) => {
    invalidRequest.request.body = {};
    const r = isValidRequest(invalidRequest.request);
    t.is(r, false);
  }
);

test.serial(
  '"isValidRequest" returns false for missing contact in body',
  (t) => {
    invalidRequest.request.body.contact = null;
    const r = isValidRequest(invalidRequest.request);
    t.is(r, false);
  }
);

test.serial('"hasValidRequestBody" returns true for valid request', (t) => {
  const r = hasValidRequestBody(testRequest.request.body);

  t.is(r, true);
});

test.serial(
  '"hasValidRequestBody" returns false for invalid request body',
  (t) => {
    invalidRequest.request.body = {};
    const r = hasValidRequestBody(invalidRequest.request.body);
    t.is(r, false);
  }
);

test.serial(
  '"hasValidRequestBody" returns false for missing contact name',
  (t) => {
    invalidRequest.request.body.contact.name = null;
    const r = hasValidRequestBody(invalidRequest.request.body);
    t.false(r);
  }
);

test.serial(
  '"hasValidRequestBody" returns false for missing contact email',
  (t) => {
    invalidRequest.request.body.contact.email = null;
    const r = hasValidRequestBody(invalidRequest.request.body);
    t.false(r);
  }
);

test.serial('"hasValidRequestBody" returns false for missing status', (t) => {
  invalidRequest.request.body.contact.status = null;
  const r = hasValidRequestBody(invalidRequest.request.body);
  t.false(r);
});

test.serial('"hasValidRequestBody" returns false for missing user_id', (t) => {
  invalidRequest.request.body.contact.variables.contact_user_id = null;
  const r = hasValidRequestBody(invalidRequest.request.body);
  t.false(r);
});

test.serial(
  '"hasValidRequestBody" returns false for missing section_id',
  (t) => {
    invalidRequest.request.body.contact.variables.section_id = undefined;
    const r = hasValidRequestBody(invalidRequest.request.body);
    t.false(r);
  }
);

test.serial(
  '"hasValidRequestBody" returns false for missing section_name',
  (t) => {
    invalidRequest.request.body.contact.variables.series_id = undefined;
    const r = hasValidRequestBody(invalidRequest.request.body);
    t.false(r);
  }
);

test.serial(
  '"hasValidRequestBody" returns false for missing series_id',
  (t) => {
    invalidRequest.request.body.contact.variables.section_name = undefined;
    const r = hasValidRequestBody(invalidRequest.request.body);
    t.false(r);
  }
);

test.serial(
  '"isAuthenticated" returns true for valid request header',
  async (t) => {
    const validRequest = {
      headers: {
        'x-auth-signature': 'valid-signature',
      },
    };
    const r = await isAuthenticated(validRequest);
    t.is(r, true);
  }
);

test.serial(
  '"isAuthenticated" returns false for invalid request header',
  async (t) => {
    let invalidRequest = {
      headers: {
        'x-auth-signature': 'invalid-signature',
      },
    };
    const r = await isAuthenticated(invalidRequest);
    t.is(r, false);

    invalidRequest = {};
    t.is(await isAuthenticated(invalidRequest), false);
  }
);

test.serial(
  '"validateUserOrganization" returns true for valid user organization',
  async (t) => {
    const requestValidation = proxyquire('../../src/requestValidation.js', {
      '../provider/firestore': {
        fetchSingleDocumentMatchingCondition: sinon
          .stub()
          .returns({tenantId: ['testOrganizationId', 'testOrganizationId']}),
      },
    });

    const email = 'test@email.com';
    const orgId = 'testOrganizationId';

    const isValid = await requestValidation.validateUserOrganization(
      email,
      orgId
    );

    t.true(isValid);
  }
);

test.serial(
  '"validateUserOrganization" returns false for invalid user organization',
  async (t) => {
    const requestValidation = proxyquire('../../src/requestValidation.js', {
      '../provider/firestore': {
        fetchSingleDocumentMatchingCondition: sinon
          .stub()
          .returns({tenantId: ['testOrganizationId', 'testOrganizationId3']}),
      },
    });

    const email = 'test@email.com';
    const orgId = 'testOrganizationId2';

    const isValid = await requestValidation.validateUserOrganization(
      email,
      orgId
    );

    t.false(isValid);
  }
);
