'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const config = require('../../../../config');

const questionnaireCollectionData = require('../../../fixtures/questionnaireCollection');
const sessionsCollectionData = require('../../../fixtures/sessionsCollection');
const patientResponseCollectionData = require('../../../fixtures/patientResponseCollection');

const ORGANIZATION_COLLECTION = config.get(
  'firebase.firestore.organizationCollection'
);
const QUESTIONNAIRE_COLLECTION = config.get(
  'firebase.firestore.questionnaireCollection'
);

const pubsubSrcMock = {
  haveSameContents: sinon.stub().returns(true),
  generateData: sinon.stub().returns({}),
};

const firestoreMock = {
  getCollectionReference: sinon.stub().resolves({id: 'docId'}),
  fetchDocumentsUsingColRef: sinon
    .stub()
    .resolves([{data: () => questionnaireCollectionData}]),
  getDocumentData: sinon.stub().resolves(patientResponseCollectionData),
  getDocumentReference: sinon.stub().resolves({}),
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

const pubsubProviderMock = {
  publishMessage: sinon.stub().resolves('testMessageId'),
};

const handler = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../../../handler/db/session/onWrite.js', {
    '../../../src/session/pubsub': pubsubSrcMock,
    '../../../providers/firestore': firestoreMock,
    '../../../providers/logging': {
      getLogger: loggerMock.getLogger,
    },
    '../validation': valdiationMock,
    '../../../providers/pubsub': pubsubProviderMock,
  });

test.afterEach.always(() => {
  loggerMock.getLogger().info.resetHistory();
  firestoreMock.getDocumentData.resetHistory();
  firestoreMock.getCollectionReference.resetHistory();
  firestoreMock.fetchDocumentsUsingColRef.resetHistory();
  sinon.resetHistory();
});

test.after(() => {
  sinon.reset();
});

test.serial(
  '"onWriteHandler" handles the triggered event request successfully',
  async (t) => {
    const change = {
      after: {
        data: () => sessionsCollectionData,
        exists: true,
      },
    };

    const context = {
      params: {
        documentID: 'test-doc-id',
      },
    };

    const result = await handler.onWriteHandler(change, context);

    t.true(valdiationMock.isValidEventTrigger.calledOnceWith(change));
    t.true(
      valdiationMock.isValidEventTrigger.calledImmediatelyBefore(
        firestoreMock.getDocumentReference
      )
    );
    t.true(
      firestoreMock.getDocumentReference.calledWith(ORGANIZATION_COLLECTION)
    );
    t.true(
      firestoreMock.getDocumentData.calledOnceWith(
        sessionsCollectionData.responseRef
      )
    );
    t.true(
      firestoreMock.getCollectionReference.calledImmediatelyAfter(
        firestoreMock.getDocumentData
      )
    );
    t.true(
      firestoreMock.getCollectionReference.calledOnceWith(
        QUESTIONNAIRE_COLLECTION
      )
    );
    t.true(
      firestoreMock.fetchDocumentsUsingColRef.calledImmediatelyAfter(
        firestoreMock.getCollectionReference
      )
    );
    t.true(pubsubSrcMock.haveSameContents.calledOnce);
    t.true(
      pubsubSrcMock.haveSameContents.calledImmediatelyAfter(
        firestoreMock.fetchDocumentsUsingColRef
      )
    );
    t.true(pubsubSrcMock.generateData.calledOnce);
    t.true(
      pubsubSrcMock.generateData.calledImmediatelyAfter(
        pubsubSrcMock.haveSameContents
      )
    );
    t.true(
      pubsubSrcMock.generateData.calledImmediatelyBefore(
        pubsubProviderMock.publishMessage
      )
    );
    t.true(pubsubProviderMock.publishMessage.calledOnce);

    t.is(result, 'testMessageId');
  }
);

test('"onWriteHandler" throws error when required section ids do not match', async (t) => {
  const valdiationMock = {
    isValidEventTrigger: sinon.stub().returns(false),
  };

  const handler = proxyquire
    .noCallThru()
    .noPreserveCache()
    .load('../../../../handler/db/session/onWrite.js', {
      '../../../src/session/pubsub': pubsubSrcMock,
      '../../../providers/firestore': firestoreMock,
      '../../../providers/logging': {
        getLogger: loggerMock.getLogger,
      },
      '../validation': valdiationMock,
      '../../../providers/pubsub': pubsubProviderMock,
    });

  const change = {
    after: {
      data: () => sessionsCollectionData,
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

test('"onWriteHandler" throws error on invalid event', async (t) => {
  const pubsubSrcMock = {
    haveSameContents: sinon.stub().returns(false),
    generateData: sinon.stub().returns({}),
  };

  const handler = proxyquire
    .noCallThru()
    .noPreserveCache()
    .load('../../../../handler/db/session/onWrite.js', {
      '../../../src/session/pubsub': pubsubSrcMock,
      '../../../providers/firestore': firestoreMock,
      '../../../providers/logging': {
        getLogger: loggerMock.getLogger,
      },
      '../validation': valdiationMock,
      '../../../providers/pubsub': pubsubProviderMock,
    });

  const change = {
    after: {
      data: () => sessionsCollectionData,
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
      message: 'Response does not have all required sections.',
    }
  );
});

test('"onWriteHandler" throws error when no new section data to process', async (t) => {
  const valdiationMock = {
    isValidEventTrigger: sinon.stub().returns(true),
  };

  const handler = proxyquire
    .noCallThru()
    .noPreserveCache()
    .load('../../../../handler/db/session/onWrite.js', {
      '../../../src/session/pubsub': pubsubSrcMock,
      '../../../providers/firestore': firestoreMock,
      '../../../providers/logging': {
        getLogger: loggerMock.getLogger,
      },
      '../validation': valdiationMock,
      '../../../providers/pubsub': pubsubProviderMock,
    });

  const change = {
    after: {
      data: () => {
        return {
          sections: ['test'],
        };
      },
      exists: true,
    },
    before: {
      data: () => {
        return {
          sections: ['test'],
        };
      },
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
      message: 'No new data to process!',
    }
  );
  try {
    await handler.onWriteHandler(change, context);
  } catch (e) {
    t.true(loggerMock.getLogger().warn.calledWith('Sections data unchanged!'));
  }
});
