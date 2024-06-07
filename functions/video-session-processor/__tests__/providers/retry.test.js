'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

test.afterEach.always(() => {
  sinon.reset();
});

test.serial('"sleep" resolves after the specified time', async (t) => {
  const clock = sinon.useFakeTimers();

  const {sleep} = proxyquire('../../providers/retry.js', {
    '@sinonjs/commons': {
      useFakeTimers: sinon.useFakeTimers.bind(sinon),
    },
  });

  const sleepPromise = sleep(1000);

  // Fast-forward time by 1000 milliseconds
  clock.tick(1000);

  // Ensure the promise is resolved after 1000 milliseconds
  await t.notThrowsAsync(async () => await sleepPromise);

  clock.restore();
});

test.serial(
  '"sleep" resolves after the specified time using async/await',
  async (t) => {
    const clock = sinon.useFakeTimers();

    const {sleep} = proxyquire('../../providers/retry.js', {
      '@sinonjs/commons': {
        useFakeTimers: sinon.useFakeTimers.bind(sinon),
      },
    });

    const sleepPromise = sleep(2000);

    // Fast-forward time by 2000 milliseconds using async/await
    await clock.tickAsync(2000);

    // Ensure the promise is resolved after 2000 milliseconds
    await t.notThrowsAsync(async () => await sleepPromise);

    clock.restore();
  }
);

// Use 'rewire' to mock internal private functions ('sleep' function)
const rewire = require('rewire');

// const {withRetries} = proxyquire('../../providers/retry.js', {});
const retry = rewire('../../providers/retry.js');

test.serial('"withRetries" resolves on successful attempt', async (t) => {
  retry.__with__({
    sleep: sinon.stub().resolves({}),
  })(async () => {
    const func = sinon.stub().resolves('Success');
    const maxRetries = 3;

    const retryFunction = retry.withRetries({func, maxRetries});

    const result = await retryFunction('arg1', 'arg2');

    t.is(result, 'Success');
    t.true(func.calledOnceWithExactly('arg1', 'arg2'));
  });
});

test.serial('"withRetries" rejects after maxRetries attempts', async (t) => {
  retry.__with__({
    sleep: sinon.stub().returns(Promise.resolve({})),
  })(async () => {
    const func = sinon.stub().rejects('Failed');

    const maxRetries = 3;
    const retryFunction = retry.withRetries({func, maxRetries});

    await t.rejects(await retryFunction('arg1', 'arg2'), {
      instanceOf: Error,
      message: 'Failed',
    });
  });
});

test.serial(
  '"withRetries" rejects immediately if function rejects and maxRetries attempts is negative',
  async (t) => {
    retry.__with__({
      sleep: sinon.stub().returns(Promise.resolve({})),
    })(async () => {
      const func = sinon.stub().rejects('Failed');
      const maxRetries = -1;
      const retryFunction = retry.withRetries({func, maxRetries});

      await t.throwsAsync(await retryFunction('arg1', 'arg2'), {
        instanceOf: Error,
        message: 'Max retries reached, but no successful attempt.',
      });

      t.true(func.calledOnce); // One initial attempt only
    });
  }
);

test.serial('"withRetries" handles errors during attempts', async (t) => {
  retry.__with__({
    sleep: sinon.stub().returns(Promise.resolve({})),
  })(async () => {
    const func = sinon.stub();
    func.onFirstCall().rejects(new Error('First attempt failed'));
    func.onSecondCall().resolves('Success');

    const maxRetries = 2;
    const retry = rewire('../../providers/retry.js', {});

    const retryFunction = retry.withRetries({func, maxRetries});

    const result = await retryFunction('arg1', 'arg2');

    t.is(result, 'Success');
    t.true(func.calledTwice);
  });
});
