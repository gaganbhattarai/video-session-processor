'use-strict';

const test = require('ava');

test('"session.pubsub" module exports expected functions', (t) => {
  const sessionModule = require('../../../../src/session/pubsub');

  t.deepEqual(Object.keys(sessionModule), ['generateData', 'haveSameContents']);
});
