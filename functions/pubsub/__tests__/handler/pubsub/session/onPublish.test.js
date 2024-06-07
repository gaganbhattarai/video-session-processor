'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const config = require('../../../../config');

const SUBSCRIBER_TOPIC = config.get('cloud.pubsubService.subscriberTopic');

const firestoreMock = {
  getDocumentReference: sinon
    .stub()
    .returns({id: 'docId', update: sinon.stub().resolves({})}),
  getCollectionReference: sinon.stub().returns(),
  addDocumentToCollectionWithRef: sinon.stub().resolves(null),
};

const pubsubProviderMock = {
  processMessage: sinon.stub().resolves({
    summary: 'summary',
    progressNote: 'progressNote',
    referenceId: 'testTenantId###testMessageId',
  }),
};

const handler = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../../../handler/pubsub/session/onPublish.js', {
    '../../../providers/firestore': firestoreMock,
    '../../../providers/pubsub': pubsubProviderMock,
  });

test.afterEach.always(() => {
  sinon.resetHistory();
});

test.after(() => {
  sinon.reset();
});

test.serial(
  '"onPublishHandler" handles the triggered publish event request successfully',
  async (t) => {
    const message = {
      data: Buffer.from('testData'),
      attributes: {},
    };

    const context = {
      params: {},
    };

    const result = await handler.onPublishHandler(message, context);

    t.true(
      pubsubProviderMock.processMessage.calledWithExactly(
        SUBSCRIBER_TOPIC,
        message
      )
    );
    t.true(
      firestoreMock.getDocumentReference.calledAfter(
        pubsubProviderMock.processMessage
      )
    );
    t.true(firestoreMock.getDocumentReference.calledTwice);
    t.true(firestoreMock.getCollectionReference.calledOnce);
    t.true(firestoreMock.addDocumentToCollectionWithRef.calledOnce);
    t.true(
      firestoreMock.addDocumentToCollectionWithRef.calledImmediatelyAfter(
        firestoreMock.getCollectionReference
      )
    );

    t.is(result, null);
  }
);
