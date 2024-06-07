'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

let oldConsole;
let consoleLogSpy;
let consoleErrorSpy;

const googleCloudLoggingMock = {
  Logging: sinon.stub().returns({
    log: sinon.stub().returns({
      entry: sinon.stub().returns({}),
      write: sinon.stub().resolves({}),
    }),
  }),
};

// Importing the module with proxyquire to inject the mocks
const {getLogger} = proxyquire('../../providers/logging.js', {
  '@google-cloud/logging': googleCloudLoggingMock,
});

test.before(async (t) => {
  // Call the function
  t.context.logger = await getLogger('test');
});

test.beforeEach(() => {
  // Stub the logger functions
  // sinon.stub(loggerMock.getLogger(), 'debug');
  oldConsole = console;
  consoleLogSpy = sinon.spy(console, 'log');
  consoleErrorSpy = sinon.spy(console, 'error');
});

test.afterEach(() => {
  // Restore the functions
  // sinon.restore();
  console = oldConsole; // eslint-disable-line no-global-assign
  sinon.restore();
});

test.serial('Log debug messages', (t) => {
  t.context.logger.debug('test');

  t.is(consoleLogSpy.callCount, 1);
  /* eslint-disable new-cap */
  t.is(googleCloudLoggingMock.Logging().log().entry.callCount, 1);
  t.is(googleCloudLoggingMock.Logging().log().write.callCount, 1);

  /* eslint-enable new-cap */
});

test.serial('Log info messages', (t) => {
  t.context.logger.info('test');

  /* eslint-disable new-cap */
  t.is(googleCloudLoggingMock.Logging().log().entry.callCount, 2);
  t.is(googleCloudLoggingMock.Logging().log().write.callCount, 2);
  /* eslint-enable new-cap */
});

test.serial('Log warn messages', (t) => {
  t.context.logger.warn('test');

  /* eslint-disable new-cap */
  t.is(googleCloudLoggingMock.Logging().log().entry.callCount, 3);
  t.is(googleCloudLoggingMock.Logging().log().write.callCount, 3);
  /* eslint-enable new-cap */
});

test.serial('Log error messages', (t) => {
  t.context.logger.error('test');

  t.is(consoleErrorSpy.callCount, 1);

  /* eslint-disable new-cap */
  t.is(googleCloudLoggingMock.Logging().log().entry.callCount, 4);
  t.is(googleCloudLoggingMock.Logging().log().write.callCount, 4);
  /* eslint-enable new-cap */
});
