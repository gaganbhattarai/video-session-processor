'use-strict';

const test = require('ava');

test('"session" module should have expected functions', (t) => {
  const sessionModule = require('../../../src/session');

  t.deepEqual(Object.keys(sessionModule), [
    'generateThumbnailImage',
    'generateSessionSectionData',
  ]);
});
