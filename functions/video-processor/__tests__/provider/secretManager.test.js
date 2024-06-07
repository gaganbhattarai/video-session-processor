'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const validSecretValue = 'test-secret-value';

const googleCloudSecretManagerMock = {
  SecretManagerServiceClient: sinon.stub().returns({
    accessSecretVersion: sinon.stub().resolves([
      {
        payload: {
          data: {
            toString: sinon.stub().returns(validSecretValue),
          },
        },
      },
    ]),
  }),
};

// Importing the module with proxyquire to inject the mocks
const secretManagerProvider = proxyquire('../../provider/secretManager.js', {
  '@google-cloud/secret-manager': googleCloudSecretManagerMock,
});

test.after(() => {
  sinon.reset();
});

test.afterEach.always(() => {
  sinon.resetHistory();
});

test.serial(
  '"getSecretValue" returns the value from a stored secret',
  async (t) => {
    const secretName = 'test-secret';
    const secretVersion = 'latest';
    const projectNumber = 'test-project-number';

    const response = await secretManagerProvider.getSecretValue(
      secretName,
      secretVersion,
      projectNumber
    );
    t.is(response, validSecretValue);
    t.true(
      /* eslint-disable new-cap */
      googleCloudSecretManagerMock.SecretManagerServiceClient()
        .accessSecretVersion.calledOnce
    );
    t.true(
      /* eslint-disable new-cap */
      googleCloudSecretManagerMock
        .SecretManagerServiceClient()
        .accessSecretVersion.calledOnceWith({
          name: `projects/${projectNumber}/secrets/${secretName}/versions/${secretVersion}`,
        })
    );
  }
);

test.serial(
  '"getSecretValue" returns the value from a stored secret using default values for arguments',
  async (t) => {
    const secretName = 'test-secret';

    const config = require('../../config');

    const expectedProjectNumber = config.get('cloud.project.number');
    const expectedSecretVersion = 'latest';

    const response = await secretManagerProvider.getSecretValue(secretName);
    t.is(response, validSecretValue);
    t.true(
      googleCloudSecretManagerMock.SecretManagerServiceClient()
        .accessSecretVersion.calledOnce
    );
    t.true(
      googleCloudSecretManagerMock
        .SecretManagerServiceClient()
        .accessSecretVersion.calledOnceWith({
          name: `projects/${expectedProjectNumber}/secrets/${secretName}/versions/${expectedSecretVersion}`,
        })
    );
  }
);
