'use-strict';

const test = require('ava');

test('"response" module should have expected functions', (t) => {
  const responseModule = require('../../../src/response');

  t.deepEqual(Object.keys(responseModule), [
    'getFilteredResponse',
    'mapResponsesWithURL',
  ]);
});
