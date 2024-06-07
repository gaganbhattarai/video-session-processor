'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const config = require('../../config');

const firestoreEvent = require('../fixtures/firestorePatientResponseWriteEvent');
const firestoreSectionAnswers = require('../fixtures/firestorePatientResponseSectionAnswers');
const videoResponsesWithUrl = require('../fixtures/videoResponsesWithUrl');

/* eslint-disable no-unused-vars */
const BUCKET_NAME = config.get('cloud.bucket.name');
const BUCKET_PATH = `gs://${BUCKET_NAME}/`;
const HTTP_BUCKET_PATH = `${config.get(
  'cloud.bucket.httpsBaseURL'
)}/${BUCKET_NAME}`;

const SESSIONS_DIRECTORY = config.get('firebase.storage.sessionsDirectory');
const SESSIONS_COLLECTION = config.get('firebase.firestore.sessionsCollection');
const SECTION_ANSWERS_SUB_COLLECTION = config.get(
  'firebase.firestore.sectionAnswersSubCollection'
);
const ORGANIZATION_COLLECTION = config.get(
  'firebase.firestore.organizationCollection'
);
const PATIENT_RESPONSE_COLLECTION = config.get(
  'firebase.firestore.patientResponseCollection'
);
const PATIENT_RESPONSE_DIRECTORY = config.get(
  'firebase.storage.responseDirectory'
);
/* eslint-enable no-unused-vars */

// Mock required libraries in use

const pathMock = {
  basename: sinon.stub(),
};
const firebaseAdminMock = {
  initializeApp: sinon.stub(),
  applicationDefault: sinon.stub(),
  getStorage: sinon.stub().returns({
    bucket: sinon.stub().returns({
      name: 'test-bucket',
    }),
  }),
  settings: sinon.stub(),
};

const sessionsMock = {
  generateThumbnailImage: sinon.stub().resolves('img'),
  generateSessionSectionData: sinon.stub().resolves({}),
};

const firestoreMock = {
  arrayUnion: sinon.stub().returns({}),
  serverTimestamp: sinon.stub().returns({}),
  updateDocumentWithRef: sinon.stub().resolves(null),
  getDocumentReference: sinon.stub().resolves({id: 'docId'}),
  saveFirestoreDocument: sinon.stub().resolves({id: 'docId'}),
  getCollectionReference: sinon.stub().resolves({id: 'docId'}),
  fetchDocumentsUsingColRef: sinon
    .stub()
    .resolves([{ref: {id: 'docId', parent: {id: 'parentId'}}}]),
  getDocumentData: sinon.stub().resolves(firestoreEvent.withQuestionnaireDraft),
};

const thumbnailStoreMock = {
  uploadThumbnail: sinon.stub().resolves('test-id'),
  saveThumbnailToDocumentWithRetry: sinon.stub().resolves('test'),
};

const loggerMock = {
  getLogger: sinon.stub().returns({
    warn: sinon.stub().returns(Promise.resolve('warning')),
    info: sinon.stub().returns(Promise.resolve('info')),
    error: sinon.stub().returns(Promise.resolve('error')),
  }),
};

const valdiationMock = {
  isValidEventTrigger: sinon.stub().returns(true),
};

const responseMock = {
  getFilteredResponse: sinon.stub().returns(videoResponsesWithUrl),
};

const handler = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../handler/onWrite.js', {
    'path': pathMock,
    'firebase-admin/storage': firebaseAdminMock,
    '../src/session': sessionsMock,
    '../providers/firestore': firestoreMock,
    '../providers/thumbnailStore': thumbnailStoreMock,
    '../providers/logging': {
      getLogger: loggerMock.getLogger,
    },
    './validation': valdiationMock,
    '../src/response': responseMock,
  });

test.afterEach.always(() => {
  loggerMock.getLogger().info.resetHistory();
  firestoreMock.getDocumentData.resetHistory();
  firestoreMock.getDocumentReference.resetHistory();
  firestoreMock.getCollectionReference.resetHistory();
  firestoreMock.fetchDocumentsUsingColRef.resetHistory();
  sessionsMock.generateSessionSectionData.resetHistory();
  sinon.restore();
});

test.serial(
  '"onWriteHandler" handles the triggered event request successfully when session document already exists',
  async (t) => {
    const change = {
      after: {
        data: () => firestoreSectionAnswers,
        exists: true,
      },
    };

    const context = {
      params: {
        organizationId: 'test-org-id',
        responseDocId: 'test-res-id',
        documentId: 'test-doc-id',
      },
    };

    const result = await handler.onWriteHandler(change, context);

    t.is(result, null);
    t.true(
      firestoreMock.getDocumentReference.calledWith(
        ORGANIZATION_COLLECTION,
        context.params.organizationId
      )
    );
    t.true(
      firestoreMock.getCollectionReference.calledWith(
        PATIENT_RESPONSE_COLLECTION
      )
    );
    t.true(
      firestoreMock.getDocumentData.calledImmediatelyAfter(
        firestoreMock.getDocumentReference
      )
    );
    t.true(
      loggerMock
        .getLogger()
        .info.calledWith(
          `questionnaireDraftId =======> ${firestoreEvent.withQuestionnaireDraft.questionnaireDraftRef.id}`
        )
    );
    t.true(
      loggerMock
        .getLogger()
        .info.calledWith(
          `Storage path with question event id: =======> gs://test-bucket/test-org-id/patient_response/${firestoreEvent.withQuestionnaireDraft.questionnaireDraftRef.id}/${firestoreEvent.withQuestionnaireDraft.userId}/`
        )
    );
    t.true(sessionsMock.generateSessionSectionData.calledOnce);
    t.true(
      firestoreMock.getCollectionReference.calledWith(SESSIONS_COLLECTION)
    );
    t.true(
      firestoreMock.fetchDocumentsUsingColRef.calledImmediatelyAfter(
        firestoreMock.getCollectionReference
      )
    );
    t.true(firestoreMock.arrayUnion.calledOnce);
    t.true(firestoreMock.serverTimestamp.calledOnce);

    t.true(firestoreMock.updateDocumentWithRef.calledOnce);
    t.true(
      firestoreMock.updateDocumentWithRef.calledImmediatelyAfter(
        firestoreMock.serverTimestamp
      )
    );
    t.true(
      loggerMock
        .getLogger()
        .info.calledImmediatelyAfter(firestoreMock.updateDocumentWithRef)
    );
  }
);

test.serial(
  '"onWriteHandler" handles the triggered event request successfully when session document does not already exists',
  async (t) => {
    const firestoreMock = {
      arrayUnion: sinon.stub().returns({}),
      serverTimestamp: sinon.stub().returns({}),
      updateDocumentWithRef: sinon.stub().resolves(null),
      getDocumentReference: sinon.stub().resolves({id: 'docId'}),
      saveFirestoreDocument: sinon.stub().resolves({id: 'docId'}),
      getCollectionReference: sinon.stub().resolves({id: 'docId'}),
      fetchDocumentsUsingColRef: sinon.stub().resolves(null),
      getDocumentData: sinon
        .stub()
        .resolves(firestoreEvent.withQuestionnaireDraft),
    };

    const handler = proxyquire
      .noCallThru()
      .noPreserveCache()
      .load('../../handler/onWrite.js', {
        'path': pathMock,
        'firebase-admin/storage': firebaseAdminMock,
        '../src/session': sessionsMock,
        '../providers/firestore': firestoreMock,
        '../providers/thumbnailStore': thumbnailStoreMock,
        '../providers/logging': {
          getLogger: loggerMock.getLogger,
        },
        './validation': valdiationMock,
        '../src/response': responseMock,
      });

    const change = {
      after: {
        data: () => firestoreSectionAnswers,
        exists: true,
      },
    };

    const context = {
      params: {
        organizationId: 'test-org-id',
        responseDocId: 'test-res-id',
        documentId: 'test-doc-id',
      },
    };

    const result = await handler.onWriteHandler(change, context);

    t.is(result, null);
    t.true(
      firestoreMock.getDocumentReference.calledWith(
        ORGANIZATION_COLLECTION,
        context.params.organizationId
      )
    );
    t.true(
      firestoreMock.getCollectionReference.calledWith(
        PATIENT_RESPONSE_COLLECTION
      )
    );
    t.true(
      firestoreMock.getDocumentData.calledImmediatelyAfter(
        firestoreMock.getDocumentReference
      )
    );
    t.true(
      loggerMock
        .getLogger()
        .info.calledWith(
          `questionnaireDraftId =======> ${firestoreEvent.withQuestionnaireDraft.questionnaireDraftRef.id}`
        )
    );
    t.true(
      loggerMock
        .getLogger()
        .info.calledWith(
          `Storage path with question event id: =======> gs://test-bucket/test-org-id/patient_response/${firestoreEvent.withQuestionnaireDraft.questionnaireDraftRef.id}/${firestoreEvent.withQuestionnaireDraft.userId}/`
        )
    );

    t.true(sessionsMock.generateSessionSectionData.calledOnce);
    t.true(
      firestoreMock.getCollectionReference.calledWith(SESSIONS_COLLECTION)
    );
    t.true(
      firestoreMock.fetchDocumentsUsingColRef.calledImmediatelyAfter(
        firestoreMock.getCollectionReference
      )
    );
    t.is(firestoreMock.updateDocumentWithRef.callCount, 0);
    t.true(
      firestoreMock.saveFirestoreDocument.calledOnceWith(SESSIONS_COLLECTION)
    );
    t.true(
      firestoreMock.saveFirestoreDocument.calledImmediatelyAfter(
        firestoreMock.fetchDocumentsUsingColRef
      )
    );
    t.true(
      sessionsMock.generateThumbnailImage.calledOnceWith(
        BUCKET_NAME,
        `test-org-id/${SESSIONS_DIRECTORY}/`
      )
    );
    t.true(thumbnailStoreMock.uploadThumbnail.calledOnce);
    t.true(
      thumbnailStoreMock.uploadThumbnail.calledImmediatelyAfter(
        sessionsMock.generateThumbnailImage
      )
    );
    t.true(thumbnailStoreMock.saveThumbnailToDocumentWithRetry.calledOnce);
    t.true(
      /* eslint-disable max-len */
      thumbnailStoreMock.saveThumbnailToDocumentWithRetry.calledAfter(
        thumbnailStoreMock.uploadThumbnail
      )
      /* eslint-enable max-len */
    );

    t.true(
      loggerMock
        .getLogger()
        .info.calledImmediatelyAfter(
          thumbnailStoreMock.saveThumbnailToDocumentWithRetry
        )
    );

    t.true(
      loggerMock
        .getLogger()
        .info.calledWith('Thumbnail url generated and saved to document.')
    );
  }
);

test('"onWriteHandler" throws error on invalid event', async (t) => {
  const valdiationMock = {
    isValidEventTrigger: sinon.stub().returns(false),
  };
  const handler = proxyquire
    .noCallThru()
    .noPreserveCache()
    .load('../../handler/onWrite.js', {
      'firebase-admin/storage': firebaseAdminMock,
      '../providers/logging': {
        getLogger: loggerMock.getLogger,
      },
      '../providers/thumbnailStore': thumbnailStoreMock,
      '../providers/firestore': firestoreMock,
      '../src/response': responseMock,
      '../src/session': sessionsMock,
      './validation': valdiationMock,
    });

  const change = {
    after: {
      data: () => firestoreEvent.withQuestionnaireDraft,
    },
  };

  const context = {
    params: {
      documentId: 'test-doc-id',
    },
  };

  await t.throwsAsync(
    async () => await handler.onWriteHandler(change, context),
    {
      instanceOf: Error,
      message: 'Event validation error!',
    }
  );
});

test('"onWriteHandler" throws error when no section answers available', async (t) => {
  const firestoreMock = {
    arrayUnion: sinon.stub().returns({}),
    serverTimestamp: sinon.stub().returns({}),
    updateDocumentWithRef: sinon.stub().resolves(null),
    fetchAllDocumentsUsingColRef: sinon.stub().resolves(null),
    getDocumentReference: sinon.stub().resolves({id: 'docId'}),
    saveFirestoreDocument: sinon.stub().resolves({id: 'docId'}),
    getCollectionReference: sinon.stub().resolves({id: 'docId'}),
    getDocumentData: sinon
      .stub()
      .resolves(firestoreEvent.withQuestionnaireDraft),
    fetchDocumentsUsingColRef: sinon
      .stub()
      .resolves([{ref: {id: 'docId', parent: {id: 'parentId'}}}]),
  };

  const handler = proxyquire
    .noCallThru()
    .noPreserveCache()
    .load('../../handler/onWrite.js', {
      'path': pathMock,
      'firebase-admin/storage': firebaseAdminMock,
      '../providers/logging': {
        getLogger: loggerMock.getLogger,
      },
      '../providers/thumbnailStore': thumbnailStoreMock,
      '../providers/firestore': firestoreMock,
      '../src/response': responseMock,
      '../src/session': sessionsMock,
      './validation': valdiationMock,
    });

  const change = {
    after: null,
  };

  const context = {
    params: {
      documentId: 'test-doc-id',
    },
  };

  await t.throwsAsync(
    async () => await handler.onWriteHandler(change, context),
    {
      instanceOf: Error,
      message: 'Error! No section answers!',
    }
  );
});
