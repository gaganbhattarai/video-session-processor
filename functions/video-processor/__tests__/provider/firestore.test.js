'use strict';

const test = require('ava');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const rewire = require('rewire');

// Set function test parameters
const document = {key: 'value'};
const newDocRef = {id: 'newDocumentId'};
const collectionName = 'exampleCollection';
const newSubDocRef = {id: 'newSubDocumentId'};
const subCollectionName = 'exampleSubCollection';

// Mock required libraries in use
const firebaseAdminMock = {
  initializeApp: sinon.stub(),
  getFirestore: sinon.stub().returns({
    collection: sinon
      .stub()
      .withArgs(collectionName)
      .returns({
        add: sinon.stub().returns(Promise.resolve(newDocRef)),
        collection: sinon
          .stub()
          .withArgs(subCollectionName)
          .returns({
            add: sinon.stub().returns(Promise.resolve(newSubDocRef)),
          }),
        doc: sinon.stub().returns({id: 'newDocId'}),
      }),
    settings: sinon.stub(),
  }),
  FieldValue: {
    serverTimestamp: sinon.stub().returns('2023-01-01T00:00:00'),
  },
};

const loggerMock = {
  getLogger: sinon.stub().returns({
    debug: sinon.stub().returns({}),
    warn: sinon.stub().returns({}),
  }),
};

// Using rewire to stub out the functions in the same module
const firestoreProviderRewired = rewire('../../provider/firestore.js');

// Importing the module with proxyquire to inject the mocks
const firestoreProvider = proxyquire('../../provider/firestore.js', {
  'firebase-admin/app': firebaseAdminMock,
  'firebase-admin/firestore': {
    getFirestore: firebaseAdminMock.getFirestore,
    FieldValue: firebaseAdminMock.FieldValue,
  },
  './logging': {
    getLogger: loggerMock.getLogger,
  },
});

test.after(() => {
  sinon.reset();
});

test.afterEach.always(() => {
  sinon.resetHistory();
});

test.serial(
  'Initializes Firebase Admin SDK and returns Firestore instance',
  (t) => {
    t.true(firebaseAdminMock.initializeApp.calledOnce);
    t.is(firebaseAdminMock.getFirestore.callCount, 1);
  }
);

test.serial('Adds a document to the specified collection', async (t) => {
  const result = await firestoreProvider.saveFirestoreDocument(
    document,
    collectionName
  );

  t.deepEqual(result, newDocRef);
  t.true(
    firebaseAdminMock.getFirestore().collection.calledOnceWith(collectionName)
  );
  t.true(
    firebaseAdminMock.getFirestore().collection().add.calledOnceWith(document)
  );
  t.true(
    loggerMock
      .getLogger()
      .debug.calledOnceWith(
        `New document created with ID: ${newDocRef.id} in ${collectionName}`
      )
  );
});

test.serial(
  'Adds a document to the specified collection with audit attributes',
  async (t) => {
    const addAuditAttributes = true;

    const result = await firestoreProvider.saveFirestoreDocument(
      document,
      collectionName,
      addAuditAttributes
    );

    t.deepEqual(result, newDocRef);
    t.true(
      firebaseAdminMock
        .getFirestore()
        .collection()
        .add.calledWith({
          ...document,
          createdAt: '2023-01-01T00:00:00',
          updatedAt: '2023-01-01T00:00:00',
        })
    );
    t.true(firebaseAdminMock.FieldValue.serverTimestamp.calledTwice);
    t.true(
      firebaseAdminMock.getFirestore().collection.calledWith(collectionName)
    );
    t.true(
      loggerMock
        .getLogger()
        .debug.calledOnceWith(
          `New document created with ID: ${newDocRef.id} in ${collectionName}`
        )
    );
  }
);

test.serial(
  '"getCollectionReference" returns the collection reference',
  (t) => {
    const colRef = firestoreProvider.getCollectionReference(collectionName);

    t.deepEqual(colRef, {
      add: firebaseAdminMock.getFirestore().collection().add,
      collection: firebaseAdminMock.getFirestore().collection().collection,
      doc: firebaseAdminMock.getFirestore().collection().doc,
    });
    t.true(
      firebaseAdminMock.getFirestore().collection.calledWith(collectionName)
    );

    const subColRef = firestoreProvider.getCollectionReference(
      collectionName,
      colRef
    );
    t.deepEqual(subColRef, {
      add: firebaseAdminMock.getFirestore().collection().collection().add,
    });
  }
);

test.serial(
  '"getSubCollectionReference" returns the sub collection reference',
  (t) => {
    const parentCollectionData = {
      ref: firebaseAdminMock.getFirestore().collection(),
    };

    const result = firestoreProvider.getSubCollectionReference(
      subCollectionName,
      parentCollectionData
    );

    t.deepEqual(result, {
      add: firebaseAdminMock.getFirestore().collection().collection().add,
    });
  }
);

test.serial(
  '"buildDynamicQuery" builds query from the provided conditions',
  (t) => {
    // Create a new mock for the firebase admin library
    // to test out the query builder
    const firebaseAdminMock = {
      initializeApp: sinon.stub(),
      getFirestore: sinon.stub().returns({
        collection: sinon.stub().returns({
          where: sinon.stub().returns({
            where: sinon.stub().returns({
              limit: sinon.stub().returns({}),
            }),
          }),
        }),
        settings: sinon.stub(),
      }),
      FieldValue: {
        serverTimestamp: sinon.stub().returns('2023-01-01T00:00:00'),
      },
    };

    const firestoreProvider = proxyquire('../../provider/firestore.js', {
      'firebase-admin/app': firebaseAdminMock,
      'firebase-admin/firestore': {
        getFirestore: firebaseAdminMock.getFirestore,
        FieldValue: firebaseAdminMock.FieldValue,
      },
      './logging': {
        getLogger: loggerMock.getLogger,
      },
    });

    const collectionRef = firebaseAdminMock.getFirestore().collection();

    const conditions = [
      {field: 'user_id', operator: '==', value: 'test'},
      {field: 'response_id', operator: '==', value: 'test'},
    ];

    firestoreProvider.exportedForTesting.buildDynamicQuery(
      collectionRef,
      conditions
    );

    t.true(
      firebaseAdminMock
        .getFirestore()
        .collection()
        .where.calledOnceWith(
          conditions[0]['field'],
          conditions[0]['operator'],
          conditions[0]['value']
        )
    );

    t.true(
      firebaseAdminMock
        .getFirestore()
        .collection()
        .where()
        .where.calledOnceWith(
          conditions[1]['field'],
          conditions[1]['operator'],
          conditions[1]['value']
        )
    );

    t.true(
      t.true(
        firebaseAdminMock.getFirestore().collection().where().where().limit
          .callCount === 0
      )
    );

    const limit = 2;
    firestoreProvider.exportedForTesting.buildDynamicQuery(
      collectionRef,
      conditions,
      limit
    );

    t.true(
      t.true(
        firebaseAdminMock.getFirestore().collection().where().where().limit
          .callCount === 1
      )
    );

    t.true(
      t.true(
        firebaseAdminMock
          .getFirestore()
          .collection()
          .where()
          .where()
          .limit.calledWith(limit)
      )
    );
  }
);

test.serial(
  '"fetchDocumentsMatchingCondition" fetches the document with the expected function calls',
  async (t) => {
    const firestoreCollectionMock = sinon.stub().returns({
      where: sinon.stub().returns({
        where: sinon.stub().returns({
          limit: sinon.stub().returns({
            get: sinon.stub().resolves({id: 'newDocId'}),
          }),
        }),
      }),
    });

    firestoreProviderRewired.__set__({
      initializeApp: sinon.stub(),
      logger: loggerMock.getLogger(),
      db: {
        collection: firestoreCollectionMock,
        settings: sinon.stub(),
      },
      buildDynamicQuery: firestoreCollectionMock().where().where().limit,
      getCollectionReference: firebaseAdminMock.getFirestore().collection,
    });

    const conditions = [
      {field: 'user_id', operator: '==', value: 'test'},
      {field: 'response_id', operator: '==', value: 'test'},
    ];

    const response =
      await firestoreProviderRewired.fetchDocumentsMatchingCondition(
        collectionName,
        conditions
      );

    t.deepEqual(response, {id: 'newDocId'});
    t.true(
      firebaseAdminMock.getFirestore().collection.calledOnceWith(collectionName)
    );
    t.true(
      firestoreCollectionMock()
        .where()
        .where()
        .limit.calledWith(
          firebaseAdminMock.getFirestore().collection(collectionName),
          conditions,
          0
        )
    );
    t.true(firestoreCollectionMock().where().where().limit().get.calledOnce);
  }
);

test.serial(
  '"fetchDocumentsMatchingCondition" returns null if no documents match the condition',
  async (t) => {
    const firestoreCollectionMock = sinon.stub().returns({
      where: sinon.stub().returns({
        where: sinon.stub().returns({
          limit: sinon.stub().returns({
            get: sinon.stub().resolves({empty: true}),
          }),
        }),
      }),
    });

    firestoreProviderRewired.__set__({
      initializeApp: sinon.stub(),
      db: {
        collection: firestoreCollectionMock,
        settings: sinon.stub(),
      },
      logger: loggerMock.getLogger(),
      getCollectionReference: firebaseAdminMock.getFirestore().collection,
      buildDynamicQuery: firestoreCollectionMock().where().where().limit,
    });

    const conditions = [
      {field: 'user_id', operator: '==', value: 'test'},
      {field: 'response_id', operator: '==', value: 'test'},
    ];

    const response =
      await firestoreProviderRewired.fetchDocumentsMatchingCondition(
        collectionName,
        conditions
      );

    t.is(response, null);
    t.true(
      firebaseAdminMock.getFirestore().collection.calledOnceWith(collectionName)
    );
    t.true(
      firestoreCollectionMock()
        .where()
        .where()
        .limit.calledWith(
          firebaseAdminMock.getFirestore().collection(collectionName),
          conditions,
          0
        )
    );
    t.true(firestoreCollectionMock().where().where().limit().get.calledOnce);
    t.true(loggerMock.getLogger().warn.calledOnceWith('No data found'));
  }
);

test.serial(
  '"fetchDocumentsMatchingCondition" fetches the document using parent collection reference when specified',
  async (t) => {
    const firestoreCollectionMock = sinon.stub().returns({
      where: sinon.stub().returns({
        where: sinon.stub().returns({
          limit: sinon.stub().returns({
            get: sinon.stub().resolves({id: 'newDocId'}),
          }),
        }),
      }),
    });

    firestoreProviderRewired.__set__({
      initializeApp: sinon.stub(),
      logger: loggerMock.getLogger(),
      db: {
        collection: firestoreCollectionMock,
        settings: sinon.stub(),
      },
      buildDynamicQuery: firestoreCollectionMock().where().where().limit,
      getCollectionReference: firebaseAdminMock.getFirestore().collection,
    });

    const conditions = [
      {field: 'user_id', operator: '==', value: 'test'},
      {field: 'response_id', operator: '==', value: 'test'},
    ];

    const limit = 2;
    const parentCollectionRef = firebaseAdminMock.getFirestore().collection();

    const response =
      await firestoreProviderRewired.fetchDocumentsMatchingCondition(
        collectionName,
        conditions,
        limit,
        parentCollectionRef
      );

    t.deepEqual(response, {id: 'newDocId'});
    t.true(
      firestoreCollectionMock()
        .where()
        .where()
        .limit.calledWith(
          firebaseAdminMock.getFirestore().collection(collectionName),
          conditions,
          2
        )
    );
    t.true(firestoreCollectionMock().where().where().limit().get.calledOnce);
  }
);

test.serial(
  '"fetchSingleDocumentMatchingCondition" calls required functions with correct parameters',
  async (t) => {
    const expectedResponse = {docs: [{id: 'newDocId'}]};
    const fetchDocumentsMatchingConditionMock = sinon
      .stub()
      .resolves(expectedResponse);

    firestoreProviderRewired.__set__({
      fetchDocumentsMatchingCondition: fetchDocumentsMatchingConditionMock,
    });

    const conditions = [
      {field: 'user_id', operator: '==', value: 'test'},
      {field: 'response_id', operator: '==', value: 'test'},
    ];

    const actualResponse =
      await firestoreProviderRewired.fetchSingleDocumentMatchingCondition(
        collectionName,
        conditions
      );

    t.is(actualResponse, expectedResponse.docs[0]);
    t.true(
      fetchDocumentsMatchingConditionMock.calledOnceWithExactly(
        collectionName,
        conditions,
        1,
        null
      )
    );
  }
);

test.serial(
  '"fetchSingleDocumentMatchingCondition" returns null in case of no results',
  async (t) => {
    const expectedResponse = null;
    const fetchDocumentsMatchingConditionMock = sinon
      .stub()
      .resolves(expectedResponse);

    firestoreProviderRewired.__set__({
      fetchDocumentsMatchingCondition: fetchDocumentsMatchingConditionMock,
    });

    const conditions = [
      {field: 'user_id', operator: '==', value: 'test'},
      {field: 'response_id', operator: '==', value: 'test'},
    ];

    const actualResponse =
      await firestoreProviderRewired.fetchSingleDocumentMatchingCondition(
        collectionName,
        conditions
      );

    t.is(actualResponse, expectedResponse);
    t.true(
      fetchDocumentsMatchingConditionMock.calledOnceWithExactly(
        collectionName,
        conditions,
        1,
        null
      )
    );
  }
);

test.serial(
  '"fetchDocumentsByCollectionRef" fetches the document with the expected function calls',
  async (t) => {
    const firestoreCollectionMock = sinon.stub().returns({
      ref: sinon.stub().returns({
        where: sinon.stub().returns({
          where: sinon.stub().returns({
            limit: sinon.stub().returns({
              get: sinon.stub().resolves({id: 'newDocId'}),
            }),
          }),
        }),
      }),
    });

    firestoreProviderRewired.__set__({
      initializeApp: sinon.stub(),
      logger: loggerMock.getLogger(),
      db: {
        collection: firestoreCollectionMock,
        settings: sinon.stub(),
      },
      buildDynamicQuery: firestoreCollectionMock().ref().where().where().limit,
    });

    const conditions = [
      {field: 'user_id', operator: '==', value: 'test'},
      {field: 'response_id', operator: '==', value: 'test'},
    ];

    const response =
      /* eslint-disable max-len */
      await firestoreProviderRewired.exportedForTesting.fetchDocumentsByCollectionRef(
        firestoreCollectionMock.ref,
        conditions
      );
    /* eslint-enable max-len */

    t.deepEqual(response, {id: 'newDocId'});

    t.true(
      firestoreCollectionMock()
        .ref()
        .where()
        .where()
        .limit.calledWith(firestoreCollectionMock.ref, conditions, 0)
    );
    t.true(
      firestoreCollectionMock().ref().where().where().limit().get.calledOnce
    );
  }
);

test.serial(
  '"fetchDocumentsByCollectionRef" returns null if no documents match the condition',
  async (t) => {
    const firestoreCollectionMock = sinon.stub().returns({
      ref: sinon.stub().returns({
        where: sinon.stub().returns({
          where: sinon.stub().returns({
            limit: sinon.stub().returns({
              get: sinon.stub().resolves({empty: true}),
            }),
          }),
        }),
      }),
    });

    firestoreProviderRewired.__set__({
      initializeApp: sinon.stub(),
      db: {
        collection: firestoreCollectionMock,
        settings: sinon.stub(),
      },
      logger: loggerMock.getLogger(),
      buildDynamicQuery: firestoreCollectionMock().ref().where().where().limit,
    });

    const conditions = [
      {field: 'user_id', operator: '==', value: 'test'},
      {field: 'response_id', operator: '==', value: 'test'},
    ];

    const response =
      /* eslint-disable max-len */
      await firestoreProviderRewired.exportedForTesting.fetchDocumentsByCollectionRef(
        firestoreCollectionMock.ref,
        conditions
      );
    /* eslint-enable max-len */

    t.is(response, null);
    t.true(
      firestoreCollectionMock()
        .ref()
        .where()
        .where()
        .limit.calledWith(firestoreCollectionMock.ref, conditions, 0)
    );
    t.true(
      firestoreCollectionMock().ref().where().where().limit().get.calledOnce
    );
    t.true(loggerMock.getLogger().warn.calledOnceWith('No data found'));
  }
);

test.serial(
  '"fetchSingleDocumentByCollectionRef" calls required functions with correct parameters',
  async (t) => {
    const expectedResponse = {docs: [{id: 'newDocId'}]};
    const firestoreCollectionMock = sinon.stub().returns({
      ref: sinon.stub().returns({}),
    });

    const fetchDocumentsByCollectionRefMock = sinon
      .stub()
      .resolves(expectedResponse);

    firestoreProviderRewired.__set__({
      fetchDocumentsByCollectionRef: fetchDocumentsByCollectionRefMock,
    });

    const conditions = [
      {field: 'user_id', operator: '==', value: 'test'},
      {field: 'response_id', operator: '==', value: 'test'},
    ];

    const actualResponse =
      await firestoreProviderRewired.fetchSingleDocumentByCollectionRef(
        firestoreCollectionMock.ref,
        conditions
      );

    t.is(actualResponse, expectedResponse.docs[0]);
    t.true(
      fetchDocumentsByCollectionRefMock.calledOnceWithExactly(
        firestoreCollectionMock.ref,
        conditions,
        1
      )
    );
  }
);

test.serial(
  '"fetchSingleDocumentByCollectionRef" returns null in case of no results',
  async (t) => {
    const expectedResponse = null;

    const fetchDocumentsByCollectionRefMock = sinon
      .stub()
      .resolves(expectedResponse);
    const firestoreCollectionMock = sinon.stub().returns({
      ref: sinon.stub().returns({}),
    });

    firestoreProviderRewired.__set__({
      fetchDocumentsByCollectionRef: fetchDocumentsByCollectionRefMock,
    });

    const conditions = [
      {field: 'user_id', operator: '==', value: 'test'},
      {field: 'response_id', operator: '==', value: 'test'},
    ];

    const actualResponse =
      await firestoreProviderRewired.fetchSingleDocumentByCollectionRef(
        firestoreCollectionMock.ref,
        conditions
      );

    t.is(actualResponse, expectedResponse);
    t.true(
      fetchDocumentsByCollectionRefMock.calledOnceWithExactly(
        firestoreCollectionMock.ref,
        conditions,
        1
      )
    );
  }
);

test.serial('"getDocumentReference" returns the document reference', (t) => {
  const docId = 'docId';
  const docRef = firestoreProvider.getDocumentReference(collectionName, docId);

  t.deepEqual(docRef, firebaseAdminMock.getFirestore().collection().doc());
  t.true(
    firebaseAdminMock.getFirestore().collection.calledWith(collectionName)
  );
});
