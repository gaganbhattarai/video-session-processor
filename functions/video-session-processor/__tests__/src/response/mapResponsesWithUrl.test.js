'use strict';

const test = require('ava');

const {
  mapResponsesWithURL,
} = require('../../../src/response/mapResponsesWithUrl');

test('"mapResponsesWithURL" maps the data with required URL', (t) => {
  const responses = [
    {key: '1', type: 'video'},
    {key: '2', type: 'audio'},
  ];

  const expectedResponses = [
    {key: '1', type: 'video', url: 'gs://test/1'},
    {key: '2', type: 'audio', url: 'gs://test/2'},
  ];

  const filteredResponse = mapResponsesWithURL(
    responses,
    'key',
    'gs://test/',
    'url'
  );
  t.deepEqual(expectedResponses, filteredResponse);
});
