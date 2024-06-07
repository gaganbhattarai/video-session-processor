'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const loggerMock = {
  getLogger: sinon.stub().returns({
    warn: sinon.stub().returns(Promise.resolve('warning')),
    info: sinon.stub().returns(Promise.resolve('info')),
    error: sinon.stub().returns(Promise.resolve('error')),
  }),
};

const handlerMock = {
  sessionsOnWriteHandler: sinon.stub().resolves({}),
  sessionOnPublishHandler: sinon.stub().resolves({}),
};

test.afterEach.always(() => {
  loggerMock.getLogger().info.resetHistory();
  sinon.restore();
});

test.serial(
  '"dbSessionOnWrite" calls the handler function and processes the request',
  async (t) => {
    const {dbSessionOnWrite} = proxyquire
      .noCallThru()
      .noPreserveCache()
      .load('../index.js', {
        'firebase-admin/app': {
          initializeApp: sinon.stub(),
          applicationDefault: sinon.stub(),
        },
        './providers/logging': {
          getLogger: loggerMock.getLogger,
        },
        './handler/db/session/onWrite': {
          onWriteHandler: handlerMock.sessionsOnWriteHandler,
        },
      });

    const context = {
      eventId: 'event-id',
      eventType: 'google.firestore.document.write',
      params: {documentId: 'docId'},
      resource: {
        service: 'firestore.googleapis.com',
        name: 'projects/test/databases/(default)/documents/sessions/docId',
      },
      timestamp: '2024-02-11T06:42:00.624751Z',
    };
    const res = await dbSessionOnWrite({_readTime: 1701758520}, context);
    t.is(res, null);
    t.true(loggerMock.getLogger().info.calledTwice);
  }
);

test.serial(
  '"dbSessionOnWrite" throws error the on error condition',
  async (t) => {
    const handlerMock = {
      sessionsOnWriteHandler: sinon.stub().rejects('Error processing data'),
    };

    const {dbSessionOnWrite} = proxyquire
      .noCallThru()
      .noPreserveCache()
      .load('../index.js', {
        'firebase-admin/app': {
          initializeApp: sinon.stub(),
          applicationDefault: sinon.stub(),
        },
        './providers/logging': {
          getLogger: loggerMock.getLogger,
        },
        './handler/db/session/onWrite': {
          onWriteHandler: handlerMock.sessionsOnWriteHandler,
        },
      });

    const context = {
      eventId: 'event-id',
      eventType: 'google.firestore.document.write',
      params: {documentId: 'docId'},
      resource: {
        service: 'firestore.googleapis.com',
        name: 'projects/test/databases/(default)/documents/sessions/docId',
      },
      timestamp: '2024-02-11T06:42:00.624751Z',
    };
    const respons = await dbSessionOnWrite({}, context);

    t.is(respons, null);
    t.true(loggerMock.getLogger().error.calledOnce);
    t.true(loggerMock.getLogger().info.callCount === 0);
  }
);

test.serial(
  '"pubsubSessionOnPublish" calls the handler function and processes the request',
  async (t) => {
    const {pubsubSessionOnPublish} = proxyquire
      .noCallThru()
      .noPreserveCache()
      .load('../index.js', {
        'firebase-admin/app': {
          initializeApp: sinon.stub(),
          applicationDefault: sinon.stub(),
        },
        './providers/logging': {
          getLogger: loggerMock.getLogger,
        },
        './handler/pubsub/session/onPublish': {
          onPublishHandler: handlerMock.sessionOnPublishHandler,
        },
      });

    const context = {
      eventId: 'event-id',
      eventType: 'google.firestore.document.write',
      params: {},
      resource: {
        service: 'firestore.googleapis.com',
        name: 'projects/test/databases/(default)/documents/sessions/docId',
      },
      timestamp: '2024-02-11T06:42:00.624751Z',
    };

    const res = await pubsubSessionOnPublish(
      {data: 'encodedmsg', attributes: {}},
      context
    );
    t.is(res, null);
    t.true(loggerMock.getLogger().info.calledTwice);
  }
);

test.serial(
  '"pubsubSessionOnPublish" throws error the on error condition',
  async (t) => {
    const handlerMock = {
      sessionOnPublishHandler: sinon.stub().rejects('Error processing data'),
    };

    const {pubsubSessionOnPublish} = proxyquire
      .noCallThru()
      .noPreserveCache()
      .load('../index.js', {
        'firebase-admin/app': {
          initializeApp: sinon.stub(),
          applicationDefault: sinon.stub(),
        },
        './providers/logging': {
          getLogger: loggerMock.getLogger,
        },
        './handler/pubsub/session/onPublish': {
          onPublishHandler: handlerMock.sessionOnPublishHandler,
        },
      });

    const context = {
      eventId: 'event-id',
      eventType: 'google.firestore.document.write',
      params: {},
      resource: {
        service: 'firestore.googleapis.com',
        name: 'projects/test/databases/(default)/documents/sessions/docId',
      },
      timestamp: '2024-02-11T06:42:00.624751Z',
    };

    await t.throwsAsync(async () => await pubsubSessionOnPublish({}, context), {
      instanceOf: Error,
      message: '',
    });
  }
);
