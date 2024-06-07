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

const videoProcessingMock = {
  generateThumbnailImages: sinon.stub().resolves({}),
};

const storageMock = {
  downloadGCSFile: sinon.stub().resolves({}),
};

const {generateThumbnailImage} = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../../src/session/generateThumbnailImage.js', {
    '../../providers/logging': {
      getLogger: loggerMock.getLogger,
    },
    '../../providers/storage': storageMock,
    '../../providers/videoProcessing': videoProcessingMock,
  });

test.afterEach.always(() => {
  loggerMock.getLogger().info.resetHistory();
  sinon.restore();
});

test.serial(
  '"generateThumbnailImage" calls the required functions to generate and save thumbnails',
  async (t) => {
    const os = require('os');
    const path = require('path');

    const bucket = 'test-bucket';
    const responsePath = 'test/path/';
    const mediaFilename = 'test.mp4';

    const responseStatus = await generateThumbnailImage(
      bucket,
      responsePath,
      mediaFilename
    );

    t.is(responseStatus, path.join(os.tmpdir(), 'test_thumbnail.jpg'));
    t.true(storageMock.downloadGCSFile.callCount === 1);
    t.true(videoProcessingMock.generateThumbnailImages.callCount === 1);
  }
);

test('"generateThumbnailImage" generates error in case of issue with storage/file download', async (t) => {
  const storageMock = {
    downloadGCSFile: sinon.stub().rejects(new Error('File download error!')),
  };

  const {generateThumbnailImage} = proxyquire
    .noCallThru()
    .noPreserveCache()
    .load('../../../src/session/generateThumbnailImage.js', {
      '../../providers/logging': {
        getLogger: loggerMock.getLogger,
      },
      '../../providers/storage': storageMock,
      '../../providers/videoProcessing': videoProcessingMock,
    });

  const bucket = 'test-bucket';
  const responsePath = 'test/path/';
  const mediaFilename = 'test.mp4';

  await t.throwsAsync(
    async () =>
      await generateThumbnailImage(bucket, responsePath, mediaFilename),
    {
      instanceOf: Error,
      message: 'File download error!',
    }
  );
});

test('"generateThumbnailImage" generates error in case of issue with thumbnail generation', async (t) => {
  const videoProcessingMock = {
    generateThumbnailImages: sinon
      .stub()
      .rejects(new Error('Thumbnail generation error!')),
  };

  const {generateThumbnailImage} = proxyquire
    .noCallThru()
    .noPreserveCache()
    .load('../../../src/session/generateThumbnailImage.js', {
      '../../providers/logging': {
        getLogger: loggerMock.getLogger,
      },
      '../../providers/storage': storageMock,
      '../../providers/videoProcessing': videoProcessingMock,
    });

  const bucket = 'test-bucket';
  const responsePath = 'test/path/';
  const mediaFilename = 'test.mp4';

  await t.throwsAsync(
    async () =>
      await generateThumbnailImage(bucket, responsePath, mediaFilename),
    {
      instanceOf: Error,
      message: 'Thumbnail generation error!',
    }
  );
});
