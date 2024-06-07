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
  patientResponseOnWriteHandler: sinon.stub().resolves({}),
};

test.afterEach.always(() => {
  loggerMock.getLogger().info.resetHistory();
  sinon.restore();
});

test.serial(
  '"onFirestoreChange" calls the handler function and processes the request',
  async (t) => {
    const {onFirestoreChange} = proxyquire
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
        './handler/onWrite': {
          onWriteHandler: handlerMock.patientResponseOnWriteHandler,
        },
      });

    const context = {
      eventId: 'event-id',
      eventType: 'google.firestore.document.write',
      params: {documentId: 'docId'},
      resource: {
        service: 'firestore.googleapis.com',
        name: 'projects/test/databases/(default)/documents/patient_response/parentdocId/sectionAnswers/docId',
      },
      timestamp: '2023-12-11T06:42:00.624751Z',
    };
    const res = await onFirestoreChange({_readTime: 1701758520}, context);
    t.is(res, null);
    t.true(loggerMock.getLogger().info.calledOnce);
  }
);

test.serial(
  '"onFirestoreChange" throws error the on error condition',
  async (t) => {
    const handlerMock = {
      patientResponseOnWriteHandler: sinon
        .stub()
        .rejects('Error processing data'),
    };

    const {onFirestoreChange} = proxyquire
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
        './handler/onWrite': {
          onWriteHandler: handlerMock.patientResponseOnWriteHandler,
        },
      });

    const context = {
      eventId: 'event-id',
      eventType: 'google.firestore.document.write',
      params: {documentId: 'docId'},
      resource: {
        service: 'firestore.googleapis.com',
        name: 'projects/test/databases/(default)/documents/patient_response/parentdocId/sectionAnswers/docId',
      },
      timestamp: '2023-12-11T06:42:00.624751Z',
    };
    const respons = await onFirestoreChange({}, context);

    t.is(respons, null);
    t.true(loggerMock.getLogger().error.calledOnce);
  }
);
