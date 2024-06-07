'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const videoResponsesWithUrl = require('../../fixtures/videoResponsesWithUrl');

const loggerMock = {
  getLogger: sinon.stub().returns({
    warn: sinon.stub().returns(Promise.resolve({})),
    info: sinon.stub().returns(Promise.resolve({})),
  }),
};

const videoProcessingMock = {
  getMediaDuration: sinon.stub().resolves(2),
};

const storageMock = {
  getBucketFileReference: sinon.stub().returns({}),
};

const sessionChapters = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../../src/session/generateSessionChapters.js', {
    '../../providers/logging': {
      getLogger: loggerMock.getLogger,
    },
    '../../providers/storage': storageMock,
    '../../providers/videoProcessing': videoProcessingMock,
  });

test.afterEach.always(() => {
  loggerMock.getLogger().info.resetHistory();
  sinon.restore();
});

test('"formatNumberToSetPlaces" formats number to set places', (t) => {
  const response = sessionChapters.exportedForTesting.formatNumberToSetPlaces(
    1.2395,
    2
  );

  t.is(response, 1.24);
});

test('"generateResponseChapters" generates the correct response', async (t) => {
  const response = videoResponsesWithUrl;

  const expectedResponse = [
    {
      answerId: '123',
      transcript: 'test',
      questionTitle: 'test',
      time: {endTime: 2, startTime: 0},
    },
    {
      answerId: '1234',
      transcript: 'test2',
      questionTitle: 'test2',
      time: {endTime: 4, startTime: 2.5},
    },
    {
      answerId: '12345',
      transcript: 'test3',
      questionTitle: 'test3',
      time: {endTime: 6, startTime: 4.5},
    },
  ];
  const result = await sessionChapters.generateSessionChapters(
    response,
    'test',
    'test'
  );

  t.deepEqual(result, expectedResponse);

  t.true(storageMock.getBucketFileReference.calledThrice);
  t.true(videoProcessingMock.getMediaDuration.calledThrice);
});
