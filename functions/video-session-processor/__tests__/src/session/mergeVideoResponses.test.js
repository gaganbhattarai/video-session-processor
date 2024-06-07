'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const status = 'SUCCEEDED';

const loggerMock = {
  getLogger: sinon.stub().returns({
    warn: sinon.stub().returns(Promise.resolve({})),
    info: sinon.stub().returns(Promise.resolve({})),
  }),
};

const transcoderMock = {
  mergeVideo: sinon.stub().resolves(status),
  generateInputObjectList: sinon.stub().returns([]),
  generateEditAtomObjectList: sinon.stub().returns([]),
};

const {mergeVideoResponses} = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../../src/session/mergeVideoResponses.js', {
    '../../providers/logging': {
      getLogger: loggerMock.getLogger,
    },
    '../../providers/transcoder': transcoderMock,
  });

test.afterEach.always(() => {
  sinon.restore();
});

test('"mergeVideoResponses" calls the required functions to merge video responses', async (t) => {
  const videoResponsesWithURL = [
    {key: '1', type: 'video', url: 'gs://123/1'},
    {key: '3', type: 'video', url: 'gs://123/3'},
  ];

  const responseStatus = await mergeVideoResponses(
    videoResponsesWithURL,
    'bucket-uri',
    'outputFilename'
  );

  t.is(status, responseStatus);
  t.true(
    transcoderMock.generateInputObjectList.calledImmediatelyBefore(
      transcoderMock.generateEditAtomObjectList
    )
  );
  t.true(
    transcoderMock.generateInputObjectList.calledOnceWithExactly(
      videoResponsesWithURL
    )
  );
  t.true(transcoderMock.generateEditAtomObjectList.callCount === 1);
  t.true(
    transcoderMock.generateEditAtomObjectList.calledImmediatelyAfter(
      transcoderMock.generateInputObjectList
    )
  );

  t.true(transcoderMock.mergeVideo.calledOnce);
  t.true(
    loggerMock
      .getLogger()
      .info.calledOnceWithExactly(`Video response merge status: ${status}`)
  );
});
