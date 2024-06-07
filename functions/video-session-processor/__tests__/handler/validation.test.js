'use-strict';

const test = require('ava');

const {isValidEventTrigger} = require('../../handler/validation');

test('"isValidEventTrigger" correctly validates valid event', (t) => {
  const testEvent = {
    after: {
      exists: true,
    },
  };

  const validationResponse = isValidEventTrigger(testEvent);

  t.true(validationResponse);
});

test('"isValidEventTrigger" correctly invalidates invalid event', (t) => {
  const testEvent = {};

  const validationResponse = isValidEventTrigger(testEvent);

  t.false(validationResponse);
});
