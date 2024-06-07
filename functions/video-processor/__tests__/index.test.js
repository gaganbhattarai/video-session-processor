'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const testRequest = require('./fixtures/validRequest');

const responseMock = {
  status: sinon.stub().returns({
    send: sinon.stub(),
  }),
  send: sinon.stub().returns('Done'),
};

const loggerMock = {
  getLogger: sinon.stub().returns({
    debug: sinon.stub(),
    error: sinon.stub(),
    info: sinon.stub(),
  }),
};

const processResponseMock = {
  processResponse: sinon.stub().returns(Promise.resolve({})),
};

test.after(() => {
  sinon.reset();
});

test.serial(
  '"processVideoAskResponse" function processes the response',
  async (t) => {
    const {processVideoAskResponse} = proxyquire('../index', {
      // 'firebase-functions/v2/https': firebaseFunctionsHttpsTriggerMock,
      './provider/logging': loggerMock,
      './src/videoResponseProcessing': processResponseMock,
    });
    await processVideoAskResponse(testRequest.request, responseMock);

    // Logger is initialized once
    t.is(loggerMock.getLogger.callCount, 1);

    // log.info is invoked twice
    t.is(loggerMock.getLogger().info.callCount, 2);

    // processResponse is invoked once
    t.is(processResponseMock.processResponse.callCount, 1);

    // response.send is called once
    t.assert(responseMock.send.callCount === 1);
  }
);

test.serial('Logs error condition and sends proper response', async (t) => {
  // Stub the function to return error
  processResponseMock.processResponse = sinon.stub().resolves(null);

  const {processVideoAskResponse} = proxyquire('../index', {
    // 'firebase-functions/v2/https': firebaseFunctionsHttpsTriggerMock,
    './provider/logging': loggerMock,
    './src/videoResponseProcessing': processResponseMock,
  });
  await processVideoAskResponse(testRequest.request, responseMock);

  // Proper response status is raised and response sent
  t.true(responseMock.status.calledOnceWithExactly(500));
  t.true(
    responseMock
      .status()
      .send.calledOnceWithExactly('Error in video response processing!')
  );
});

test.serial('Exports required functions in the development env', (t) => {
  process.env.APP_ENV = 'dev';
  const processVideoAskResponseModule = proxyquire('../index', {
    './provider/logging': loggerMock,
    './src/videoResponseProcessing': processResponseMock,
  });

  // Get the list of exports from the module
  const actualExports = Object.keys(processVideoAskResponseModule);

  const expectedExports = ['processResponse', 'processVideoAskResponse'];

  // In 'dev' env, two modules should be exported
  t.deepEqual(expectedExports, actualExports);
});

test.serial('Exports only the main function in other environment', (t) => {
  process.env.APP_ENV = 'prod';

  // Remove the import
  delete require.cache[require.resolve('../config')];
  const processVideoAskResponseModuleProd = require('../index');

  const expectedExports = ['processVideoAskResponse'];
  const actualExports = Object.keys(processVideoAskResponseModuleProd);

  t.deepEqual(expectedExports, actualExports);
  t.is(expectedExports.length, 1);
});
