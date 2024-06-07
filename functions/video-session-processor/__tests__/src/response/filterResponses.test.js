'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const loggerMock = {
  getLogger: sinon.stub().returns({
    warn: sinon.stub().returns(Promise.resolve({})),
    info: sinon.stub().returns(Promise.resolve({})),
  }),
};

const filterResponses = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../../src/response/filterResponses.js', {
    '../../providers/logging': {
      getLogger: loggerMock.getLogger,
    },
  });

test.afterEach.always(() => {
  sinon.restore();
});

test('"filterResponses" filters the data with the provided type', (t) => {
  const responses = [
    {key: '1', type: 'video'},
    {key: '2', type: 'audio'},
    {key: '3', type: 'video'},
  ];

  const filteredResponse = filterResponses.exportedForTesting.filterResponses(
    responses,
    'type',
    'video'
  );
  t.deepEqual([responses[0], responses[2]], filteredResponse);
  t.is(filteredResponse.length, 2);
});

test('"getFilteredResponse" filters the data with the provided type', (t) => {
  const responses = [
    {key: '1', type: 'video'},
    {key: '2', type: 'audio'},
    {key: '3', type: 'video'},
  ];

  const filterOptions = {
    attributeName: 'type',
    attributeValue: 'video',
  };
  const filteredResponse = filterResponses.getFilteredResponse(
    responses,
    filterOptions
  );
  t.deepEqual([responses[0], responses[2]], filteredResponse);
  t.is(filteredResponse.length, 2);
  sinon.resetHistory();
});

test('"getFilteredResponse" returns error with no', (t) => {
  const responses = [
    {key: '1', type: 'audio'},
    {key: '2', type: 'audio'},
    {key: '3', type: 'audio'},
  ];

  const filterOptions = {
    attributeName: 'type',
    attributeValue: 'video',
  };
  const filteredResponse = filterResponses.getFilteredResponse(
    responses,
    filterOptions
  );
  t.is(filteredResponse, null);
  t.true(
    loggerMock
      .getLogger()
      .warn.calledOnceWithExactly(
        `No ${filterOptions.responseType} responses found`
      )
  );
  sinon.resetHistory();
});

test('"getFilteredResponse" returns response with URL', (t) => {
  const responses = [
    {key: '1', type: 'video'},
    {key: '2', type: 'audio'},
    {key: '3', type: 'video'},
  ];

  const expectedResponses = [
    {key: '1', type: 'video', url: 'gs://123/1'},
    {key: '3', type: 'video', url: 'gs://123/3'},
  ];

  const filterOptions = {
    attributeName: 'type',
    attributeValue: 'video',
  };
  const filteredResponse = filterResponses.getFilteredResponse(
    responses,
    filterOptions,
    true,
    {
      filename: 'key',
      storagePath: 'gs://123/',
      urlAttributeName: 'url',
    }
  );
  t.deepEqual(filteredResponse, expectedResponses);
  t.true(loggerMock.getLogger().warn.callCount === 0);
  sinon.resetHistory();
});
