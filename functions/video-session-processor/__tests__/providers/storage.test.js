'use strict';

const stream = require('stream');

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const fsMock = {
  createReadStream: sinon.stub().returns({
    pipe: sinon.stub().returns({
      on: sinon.stub().callsFake((event, callback) => {
        return callback();
      }),
    }),
  }),
};

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
        download: sinon.stub().returns(Promise.resolve({})),
        setMetadata: sinon.stub().returns(Promise.resolve('Metadata set')),
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

const loggerMock = {
  getLogger: sinon.stub().returns({
    debug: sinon.stub().returns(Promise.resolve({})),
    info: sinon.stub().returns(Promise.resolve({})),
    warn: sinon.stub().returns(Promise.resolve({})),
    error: sinon.stub().returns(Promise.resolve({})),
  }),
};

const uuidMock = sinon.stub().returns('testid');

const {
  getPreviewURL,
  downloadGCSFile,
  setFileMetadata,
  streamFileToGCS,
  generatePreviewURL,
  streamLocalFileToGCS,
  getBucketFileReference,
} = proxyquire('../../providers/storage.js', {
  'fs': fsMock,
  'https': httpsMock,
  'uuid-v4': uuidMock,
  '@google-cloud/storage': googleCloudStorageMock,
  './logging': loggerMock,
});
/* eslint-disable new-cap */

test.afterEach.always(() => {
  // Reset the history for subsequent test cases
  sinon.resetHistory();
});

test.after(() => {
  // Restore original functions after all test cases finish
  sinon.restore();
});

test('"getBucketFileReference" returns a Storage bucket file reference', (t) => {
  const testBucket = 'testBucket';
  const testFile = 'testFile';
  const fileRef = getBucketFileReference(testBucket, testFile);

  t.truthy(fileRef);

  t.true(
    googleCloudStorageMock.Storage().bucket.calledOnceWithExactly(testBucket)
  );
  t.true(
    googleCloudStorageMock
      .Storage()
      .bucket()
      .file.calledOnceWithExactly(testFile)
  );
  // For non serial tests, the afterEach hook does not work on time
  // so resetting the history after each test case
  sinon.resetHistory();
});

test('"setFileMetadata" calls the required method with file Reference', async (t) => {
  const testBucket = 'testBucket';
  const testFile = 'testFile';
  const metadata = {
    metadata: {name: testFile},
  };

  const response = await setFileMetadata(testBucket, testFile, metadata);

  t.is(response, 'Metadata set');
  t.true(
    googleCloudStorageMock.Storage().bucket.calledOnceWithExactly(testBucket)
  );
  t.true(
    googleCloudStorageMock
      .Storage()
      .bucket()
      .file.calledOnceWithExactly(testFile)
  );
  t.true(
    googleCloudStorageMock
      .Storage()
      .bucket()
      .file()
      .setMetadata.calledOnceWithExactly(metadata)
  );

  sinon.resetHistory();
});

test.serial('"streamFileToGCS" streams file to GCS bucket', async (t) => {
  const fileUrl = 'https://example.com/file.txt';
  const bucketName = 'your-gcs-bucket';
  const fileName = 'testfile.txt';
  const newFilePath = 'uploads/';

  await streamFileToGCS(fileUrl, bucketName, fileName, newFilePath);

  t.is(httpsMock.get.callCount, 1);

  // Assert that GCS client methods were called as expected
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

  sinon.resetHistory();
});

test.serial(
  '"downloadGCSFile" gets the file reference and initiates download',
  async (t) => {
    const testBucket = 'testBucket';
    const testFile = 'test/path/to/file';
    const options = {id: 'test'};

    await downloadGCSFile(testBucket, testFile, options);

    t.true(
      googleCloudStorageMock
        .Storage()
        .bucket()
        .file.calledOnceWithExactly(testFile)
    );

    t.true(
      googleCloudStorageMock
        .Storage()
        .bucket()
        .file()
        .download.calledOnceWithExactly(options)
    );

    // Call the function without 'options' parameter
    await downloadGCSFile(testBucket, testFile);
    t.true(
      googleCloudStorageMock.Storage().bucket().file().download.calledWith({})
    );
    sinon.resetHistory();
  }
);

test.serial('"getPreviewURL" returns encoded URL', (t) => {
  const testBucket = 'testBucket';
  const testFile = 'test/path/to/file';
  const id = 'testId';

  const expectedURL =
    'https://firebasestorage.googleapis.com/v0/b/testBucket/o/test%2Fpath%2Fto%2Ffile?alt=media&token=testId';

  const previewURL = getPreviewURL(testBucket, testFile, id);

  t.is(previewURL, expectedURL);

  sinon.resetHistory();
});

test.serial(
  '"generatePreviewURL" generates URL and sets file metadata',
  async (t) => {
    const testBucket = 'testBucket';
    const testDirectory = 'test/path';
    const testFile = 'testFile';

    const expectedURL =
      'https://firebasestorage.googleapis.com/v0/b/testBucket/o/test%2Fpath%2FtestFile.mp4?alt=media&token=testid';

    const previewURL = await generatePreviewURL(
      testBucket,
      testDirectory,
      testFile
    );

    t.is(previewURL, expectedURL);
    t.true(uuidMock.calledOnce);
    // t.true(
    //   uuidMock.calledBefore(
    //     googleCloudStorageMock.Storage().bucket().file().setFileMetadata
    //   )
    // );
    t.true(
      googleCloudStorageMock
        .Storage()
        .bucket()
        .file()
        .setMetadata.calledOnceWithExactly({
          metadata: {
            firebaseStorageDownloadTokens: 'testid',
          },
        })
    );

    sinon.resetHistory();
  }
);

test.serial(
  '"streamLocalFileToGCS" streams local file to GCS bucket',
  async (t) => {
    const filePath = 'local/path/to/file.txt';
    const bucketName = 'testBucket';
    const newFilePath = 'uploads/';
    const fileName = 'testfile.txt';
    const metadata = {
      firebaseStorageDownloadTokens: 'testid',
    };

    await streamLocalFileToGCS(
      filePath,
      bucketName,
      newFilePath,
      fileName,
      metadata
    );

    t.true(
      googleCloudStorageMock
        .Storage()
        .bucket()
        .file.calledOnceWithExactly(newFilePath + fileName)
    );

    t.true(
      googleCloudStorageMock
        .Storage()
        .bucket()
        .file()
        .createWriteStream.calledOnceWithExactly({metadata: metadata})
    );

    t.is(fsMock.createReadStream.callCount, 1);

    sinon.resetHistory();

    await streamLocalFileToGCS(filePath, bucketName, newFilePath, fileName);

    t.true(
      googleCloudStorageMock
        .Storage()
        .bucket()
        .file()
        .createWriteStream.calledOnceWithExactly({metadata: {}})
    );

    sinon.resetHistory();
  }
);

/* eslint-enable new-cap */
