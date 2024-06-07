'use strict';

const test = require('ava');
const sinon = require('sinon');
const rewire = require('rewire');
const proxyquire = require('proxyquire');

const config = require('../../../config');
const sessionChaptersResponse = require('../../fixtures/sessionChaptersResponse');
const videoResponsesWithUrl = require('../../fixtures/videoResponsesWithUrl');

const SESSIONS_DIRECTORY = config.get('firebase.storage.sessionsDirectory');

const loggerMock = {
  getLogger: sinon.stub().returns({
    warn: sinon.stub().returns(Promise.resolve({})),
    info: sinon.stub().returns(Promise.resolve({})),
  }),
};

const firebaseAdminMock = {
  getStorage: sinon.stub().returns({
    bucket: sinon.stub().returns({
      name: 'test-bucket',
    }),
  }),
  settings: sinon.stub(),
};

const mergeVideoResponsesMock = {
  mergeVideoResponses: sinon.stub().resolves('done'),
};

const storageMock = {
  generatePreviewURL: sinon.stub().resolves('test-preview-url'),
};

const generateSessionChaptersMock = {
  generateSessionChapters: sinon.stub().resolves(sessionChaptersResponse),
};

const session = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../../src/session/generateNewSession.js', {
    'firebase-admin/storage': firebaseAdminMock,
    '../../providers/logging': {
      getLogger: loggerMock.getLogger,
    },
    '../../providers/storage': storageMock,
    './mergeVideoResponses': mergeVideoResponsesMock,
    './generateSessionChapters': generateSessionChaptersMock,
  });

test.afterEach.always(() => {
  loggerMock.getLogger().info.resetHistory();
  sinon.restore();
});

test.serial(
  '"generateNewSessionSection" generates a new session from the video responses',
  async (t) => {
    const responses = videoResponsesWithUrl;
    const responsePath = 'test-path';
    const bucketName = 'test-bucket';
    const outputFileName = 'test-file';
    const eventData = {
      sectionId: 'test-section-id',
      sectionName: 'test-section',
      subtitle: 'test-subtitle',
      tenantId: 'test-org-id',
    };

    const actualResponse =
      await session.exportedForTesting.generateNewSessionSection(
        responses,
        responsePath,
        bucketName,
        outputFileName,
        eventData
      );

    const expectedResponse = {
      chapters: sessionChaptersResponse,
      mediaUrl: 'test-preview-url',
      storageMediaUrlPath: `https://storage.cloud.google.com/test-bucket/sessions/${outputFileName}.mp4`,
      ...eventData,
    };

    t.deepEqual(actualResponse, expectedResponse);
    t.true(generateSessionChaptersMock.generateSessionChapters.calledOnce);
    t.true(
      generateSessionChaptersMock.generateSessionChapters.calledOnceWithExactly(
        videoResponsesWithUrl,
        bucketName,
        responsePath
      )
    );
    t.true(mergeVideoResponsesMock.mergeVideoResponses.calledOnce);
    t.true(storageMock.generatePreviewURL.calledOnce);
    t.true(
      storageMock.generatePreviewURL.calledOnceWith(
        bucketName,
        `${eventData.tenantId}/${SESSIONS_DIRECTORY}`,
        outputFileName
      )
    );

    t.true(loggerMock.getLogger().info.calledThrice);
    t.true(
      loggerMock
        .getLogger()
        .info.calledWith('Response chapter generation operation completed.')
    );
  }
);

test.serial(
  '"generateSessionSectionData" generates section data for the session',
  async (t) => {
    const generateNewSessionRewired = rewire(
      '../../../src/session/generateNewSession.js'
    );

    const data = {
      answers: [],
      id: 'test-id',
      sectionId: 'test-section-id',
      sectionName: 'test-section',
      sectionSubtitle: 'test-subtitle',
    };
    const documentId = 'test-document-id';
    const responseId = 'test-response-id';
    const responsePath = 'test-path';

    const getFilteredResponseMock = sinon.stub().returns(videoResponsesWithUrl);
    const generateNewSessionSectionMock = sinon
      .stub()
      .returns(Promise.resolve({}));

    generateNewSessionRewired.__set__({
      logger: loggerMock.getLogger(),
      getFilteredResponse: getFilteredResponseMock,
      generateNewSessionSection: generateNewSessionSectionMock,
    });

    const actualResponse =
      await generateNewSessionRewired.generateSessionSectionData(
        data,
        documentId,
        responseId,
        responsePath
      );

    t.deepEqual(actualResponse, {});
    t.true(getFilteredResponseMock.calledOnceWith(data.answers));
    t.true(
      generateNewSessionSectionMock.calledOnceWith(
        videoResponsesWithUrl,
        responsePath
      )
    );
    t.true(loggerMock.getLogger().info.calledThrice);
  }
);

test.serial(
  '"generateSessionSectionData" throws error when no responses found',
  async (t) => {
    const generateNewSessionRewired = rewire(
      '../../../src/session/generateNewSession.js'
    );

    const data = {
      answers: [],
      id: 'test-id',
      sectionId: 'test-section-id',
      sectionName: 'test-section',
      sectionSubtitle: 'test-subtitle',
    };
    const documentId = 'test-document-id';
    const responseId = 'test-response-id';
    const responsePath = 'test-path';

    const getFilteredResponseMock = sinon.stub().returns(null);
    const generateNewSessionSectionMock = sinon
      .stub()
      .returns(Promise.resolve({}));

    generateNewSessionRewired.__set__({
      logger: loggerMock.getLogger(),
      getFilteredResponse: getFilteredResponseMock,
      generateNewSessionSection: generateNewSessionSectionMock,
    });

    await t.throwsAsync(
      async () =>
        await generateNewSessionRewired.generateSessionSectionData(
          data,
          documentId,
          responseId,
          responsePath
        ),
      {
        instanceOf: Error,
        message: 'No Video Responses found!',
      }
    );
  }
);
