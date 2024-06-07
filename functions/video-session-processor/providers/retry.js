'use-strict';

/**
 * Asynchronously sleep for a specified duration
 *
 * @param {Number} milliseconds The duration to sleep in milliseconds
 *
 * @return {Promise<void>} A Promise that resolves after the specified duration
 *
 * @example
 * // Usage example:
 * const sleepDuration = 1000; // 1 second
 * await sleep(sleepDuration);
 * console.log('Sleep complete!');
 */
function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Wrap a function with retry logic, allowing a specified number of retry attempts
 *
 * @param {Object} options Options for the retry mechanism
 * @param {Function} options.func The function to be retried
 * @param {Number} options.maxRetries The maximum number of retry attempts
 *
 * @return {Function} A wrapped function with retry logic
 *
 * @throws {Error} If all retry attempts fail
 *
 * @example
 * // Usage example:
 * const maxRetries = 3;
 * const retryableFunction = withRetries({ func: yourFunction, maxRetries });
 *
 * try {
 *   const result = await retryableFunction(arg1, arg2, ...);
 *   console.log('Function result:', result);
 * } catch (error) {
 *   console.error('Error executing function with retries:', error.message);
 * }
 */
/* eslint-disable no-await-in-loop*/
const withRetries =
  ({func, maxRetries}) =>
  async (...args) => {
    const RETRY_DELAY = 500;
    let retryCount = 0;
    do {
      try {
        return await func(...args);
      } catch (error) {
        const isLastAttempt = retryCount === maxRetries;
        if (isLastAttempt) {
          return Promise.reject(error);
        }
      }

      const randomTime = Math.floor(Math.random() * RETRY_DELAY);
      const delay = 2 ** retryCount * RETRY_DELAY + randomTime;

      // Wait for (an exponentially increasing) delay period before retrying again
      await sleep(delay);
    } while (retryCount++ < maxRetries);
    throw new Error('Max retries reached, but no successful attempt.');
  };
/* eslint-enable no-await-in-loop*/

module.exports = {
  sleep,
  withRetries,
};
