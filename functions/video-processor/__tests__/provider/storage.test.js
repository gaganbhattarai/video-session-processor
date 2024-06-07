'use strict';

const stream = require('stream');

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const googleCloudStorageMock = {
  Storage: sinon.stub().returns({
    bucket: sinon.stub().returns({
      file: sinon.stub().returns({
        createWriteStream: sinon.stub().returns({
          write: sinon.stub(),
          end: sinon.stub(),
          once: sinon.stub(),
          emit: sinon.stub(),
          removeListener: sinon.stub(),
          listenerCount: sinon.stub(),
          on: sinon.stub().callsFake((event, callback) => {
            return callback();
          }),
        }),
      }),
    }),
  }),
};

const httpsMock = {
  get: sinon.stub().callsFake((url, callback) => {
    const mockResponse = `{"data": 123}`;
    // Using a built-in PassThrough stream to emit needed data.
    const mockStream = new stream.PassThrough();
    mockStream.push(mockResponse);
    mockStream.end();

    return callback(mockStream);
  }),
};

test.beforeEach(async (t) => {
  // Importing the module with proxyquire to inject the mocks
  const {streamFileToGCS} = proxyquire('../../provider/storage.js', {
    '@google-cloud/storage': googleCloudStorageMock,
    'https': httpsMock,
  });

  // Call the function
  const fileUrl = 'https://example.com/file.txt';
  const bucketName = 'your-gcs-bucket';
  const fileName = 'testfile.txt';
  const newFilePath = 'uploads/';

  await streamFileToGCS(fileUrl, bucketName, fileName, newFilePath);
});

test.afterEach(() => {
  // Restore the logger functions
  sinon.restore();
});

/* eslint-disable new-cap */
test('streamFileToGCS should stream file to GCS bucket', (t) => {
  // Assert that https.get was called with the correct URL
  t.is(httpsMock.get.callCount, 1);

  // Assert that GCS client methods were called as expected
  // console.log('@@', googleCloudStorageMock.Storage().bucket().file.callCount);
  t.true(googleCloudStorageMock.Storage().bucket.calledOnce);
  t.true(
    googleCloudStorageMock
      .Storage()
      .bucket.calledOnceWithExactly('your-gcs-bucket')
  );

  t.true(googleCloudStorageMock.Storage().bucket().file.calledOnce);
  t.true(
    googleCloudStorageMock
      .Storage()
      .bucket()
      .file.calledOnceWithExactly('uploads/testfile.txt')
  );
});
/* eslint-enable new-cap */
