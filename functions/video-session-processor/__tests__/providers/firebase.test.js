'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Mock required libraries in use
const firebaseAdminMock = {
  getApps: sinon.stub().returns({
    length: false,
  }),
  initializeApp: sinon.stub(),
  applicationDefault: sinon.stub(),
  getStorage: sinon.stub(),
  initializeFirestore: sinon.stub(),
  getFirestore: sinon.stub().returns({
    settings: sinon.stub(),
  }),
};

test.afterEach.always(() => {
  sinon.resetHistory();
});

const firebase = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../providers/firebase.js', {
    'firebase-admin/app': {
      getApps: firebaseAdminMock.getApps,
      initializeApp: firebaseAdminMock.initializeApp,
      applicationDefault: firebaseAdminMock.applicationDefault,
    },
    'firebase-admin/storage': {
      getStorage: firebaseAdminMock.getStorage,
    },
    'firebase-admin/firestore': {
      getFirestore: firebaseAdminMock.getFirestore,
    },
  });

test('"getStorage" fetches Firebase storage instance', (t) => {
  firebase.getStorage();
  t.is(firebaseAdminMock.getApps.callCount, 1);
  t.true(firebaseAdminMock.initializeApp.calledOnce);
  t.true(firebaseAdminMock.getStorage.callCount === 1);
});

test('"getFirestore" fetches firestore instance', (t) => {
  firebase.getFirestore();
  t.is(firebaseAdminMock.getApps.callCount, 1);
  t.true(firebaseAdminMock.initializeApp.calledOnce);
  t.true(firebaseAdminMock.getFirestore.calledOnce);
  t.true(firebaseAdminMock.getFirestore().settings.calledOnce);
});

test('New firebase app instance is initialized', (t) => {
  firebase.getStorage();

  t.true(firebaseAdminMock.initializeApp.calledOnce);
});

test('Existing firebase app instance is used if already initialized', (t) => {
  const firebaseAdminMock = {
    getApps: sinon
      .stub()
      .onFirstCall()
      .returns({
        length: true,
      })
      .onSecondCall()
      .returns([{}]),
    initializeApp: sinon.stub(),
    applicationDefault: sinon.stub(),
    getStorage: sinon.stub(),
    initializeFirestore: sinon.stub(),
  };

  const firebase = proxyquire
    .noCallThru()
    .noPreserveCache()
    .load('../../providers/firebase.js', {
      'firebase-admin/app': {
        getApps: firebaseAdminMock.getApps,
        initializeApp: firebaseAdminMock.initializeApp,
        applicationDefault: firebaseAdminMock.applicationDefault,
      },
      'firebase-admin/storage': {
        getStorage: firebaseAdminMock.getStorage,
      },
      'firebase-admin/firestore': {
        initializeFirestore: firebaseAdminMock.initializeFirestore,
      },
    });

  firebase.getStorage();

  t.true(firebaseAdminMock.getApps.calledTwice);
});
