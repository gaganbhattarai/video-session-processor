'use-strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const loggerMock = {
  getLogger: sinon.stub().returns({
    debug: sinon.stub().returns(Promise.resolve({})),
    info: sinon.stub().returns(Promise.resolve({})),
    warn: sinon.stub().returns(Promise.resolve({})),
    error: sinon.stub().returns(Promise.resolve({})),
  }),
};

test.afterEach.always(() => {
  sinon.restore();
});

test.serial(
  'uploadThumbnail - should upload thumbnail image to Firebase Storage successfully',
  async (t) => {
    const localImgFullPath = 'path/to/local/image.jpg';
    const streamLocalFiletoGCSStub = sinon.stub().resolves('id');

    const {uploadThumbnail} = proxyquire('../../providers/thumbnailStore.js', {
      './storage': {
        streamLocalFileToGCS: streamLocalFiletoGCSStub,
      },
      './logging': loggerMock,
    });

    await uploadThumbnail(localImgFullPath, 'your-bucket-name');

    t.true(streamLocalFiletoGCSStub.calledOnce);
    t.true(
      streamLocalFiletoGCSStub.calledWith(
        localImgFullPath,
        'your-bucket-name',
        sinon.match.any, // Any uploadPath
        sinon.match.any, // Any uploadFilename
        sinon.match.any // Any options
      )
    );
  }
);

test.serial(
  'uploadThumbnail - should throw an error if there is an issue uploading the thumbnail image',
  async (t) => {
    const localImgFullPath = 'path/to/local/image.jpg';
    const streamLocalFiletoGCSStub = sinon
      .stub()
      .rejects(new Error('Upload error'));

    const {uploadThumbnail} = proxyquire('../../providers/thumbnailStore.js', {
      './storage': {
        streamLocalFileToGCS: streamLocalFiletoGCSStub,
      },
      './logging': loggerMock,
      './retry': sinon.stub().returns({}),
    });

    await t.throwsAsync(
      () => uploadThumbnail(localImgFullPath, 'your-bucket-name'),
      {
        instanceOf: Error,
        message: 'Upload error',
      }
    );
  }
);

test.serial(
  'saveThumbnailToDocumentWithRetry - should update Firestore document with thumbnail URL',
  async (t) => {
    const uniqueID = 'test-unique-id';
    const filename = 'test-image.jpg';
    const filepath = 'path/to/file';
    const documentRef = 'test-doc-ref';
    const httpStoragePath = 'http://example.com/storage';
    const updateDocumentWithRefStub = sinon.stub().resolves();

    const {saveThumbnailToDocumentWithRetry} = proxyquire(
      '../../providers/thumbnailStore.js',
      {
        './firestore': {
          updateDocumentWithRef: updateDocumentWithRefStub,
        },
        './logging': loggerMock,
      }
    );

    await saveThumbnailToDocumentWithRetry(
      uniqueID,
      filename,
      filepath,
      documentRef,
      httpStoragePath
    );

    t.true(updateDocumentWithRefStub.calledOnce);
    t.true(
      updateDocumentWithRefStub.calledWith(
        documentRef,
        sinon.match({
          thumbnailImage: sinon.match.string,
          storageThumbnailImagePath: sinon.match.string,
        })
      )
    );
  }
);

test.serial(
  'saveThumbnailToDocumentWithRetry - should throw an error if there is an issue updating the Firestore document',
  async (t) => {
    const uniqueID = 'test-unique-id';
    const filename = 'test-image.jpg';
    const filepath = 'path/to/file';
    const documentRef = 'test-doc-ref';
    const httpStoragePath = 'http://example.com/storage';
    const updateDocumentWithRefStub = sinon
      .stub()
      .rejects(new Error('Firestore error'));

    const {saveThumbnailToDocumentWithRetry} = proxyquire(
      '../../providers/thumbnailStore.js',
      {
        './firestore': {
          updateDocumentWithRef: updateDocumentWithRefStub,
        },
        './logging': loggerMock,
      }
    );

    // TODO
    await t.throwsAsync(
      () =>
        saveThumbnailToDocumentWithRetry(
          uniqueID,
          filename,
          filepath,
          documentRef,
          httpStoragePath
        ),
      {
        instanceOf: Error,
        message: 'Firestore error',
      }
    );
  }
);
