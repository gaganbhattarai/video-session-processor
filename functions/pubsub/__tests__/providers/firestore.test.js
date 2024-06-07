'use strict';

const test = require('ava');
const sinon = require('sinon');
const rewire = require('rewire');
const proxyquire = require('proxyquire');

// Set function test parameters
const document = {key: 'value'};
const collectionPath = 'test/to/collection';
const collectionName = 'exampleCollection';
const newDocRef = {
  id: 'newDocumentId',
  path: collectionPath,
  parent: {id: 'parentId'},
};
const subCollectionName = 'exampleSubCollection';
const newSubDocRef = {id: 'newSubDocumentId'};

// Mock required libraries in use
const firebaseAdminMock = {
  initializeApp: sinon.stub(),
  applicationDefault: sinon.stub(),
  getFirestore: sinon.stub().returns({
    collection: sinon
      .stub()
      .withArgs(collectionName)
      .returns({
        add: sinon.stub().returns(Promise.resolve(newDocRef)),
        doc: sinon
          .stub()
          .withArgs(newDocRef.id)
          .returns({
            id: newDocRef.id,
            update: sinon.stub().returns(Promise.resolve(Number(new Date()))),
            get: sinon.stub().returns(
              Promise.resolve({
                data: sinon.stub().returns(newDocRef),
              })
            ),
            parent: {
              id: 'parentId',
            },
          }),
        collection: sinon
          .stub()
          .withArgs(subCollectionName)
          .returns({
            add: sinon.stub().returns(Promise.resolve(newSubDocRef)),
          }),
        path: collectionPath,
      }),
    settings: sinon.stub(),
    doc: sinon.stub(),
  }),
  FieldValue: {
    arrayUnion: sinon.stub().returns({}),
    serverTimestamp: sinon.stub().returns('testTimestamp'),
  },
};

const loggerMock = {
  getLogger: sinon.stub().returns({
    debug: sinon.stub().returns(Promise.resolve({})),
    info: sinon.stub().returns(Promise.resolve({})),
    warn: sinon.stub().returns(Promise.resolve({})),
  }),
};

// Using rewire to stub out the functions in the same module
let firestoreProviderRewired;

const firestoreProvider = proxyquire
  .noCallThru()
  .noPreserveCache()
  .load('../../providers/firestore.js', {
    'firebase-admin/app': {
      initializeApp: firebaseAdminMock.initializeApp,
      applicationDefault: firebaseAdminMock.applicationDefault,
    },
    'firebase-admin/firestore': {
      FieldValue: firebaseAdminMock.FieldValue,
    },
    './firebase': {
      getFirestore: firebaseAdminMock.getFirestore,
    },
    './logging': {
      getLogger: loggerMock.getLogger,
    },
  });

test.before(() => {
  // Using rewire to stub out the functions in the same module
  firestoreProviderRewired = rewire('../../providers/firestore.js');
});
test.afterEach.always(() => {
  firebaseAdminMock.getFirestore().collection().add.resetHistory();
  firebaseAdminMock.getFirestore().collection.resetHistory();
  firebaseAdminMock.FieldValue.serverTimestamp.resetHistory();
  loggerMock.getLogger().debug.resetHistory();

  sinon.restore();
});

test.serial('Fetch Firestore instance', (t) => {
  t.true(firebaseAdminMock.getFirestore.callCount === 1);
});

test.serial(
  '"saveFirestoreDocument" adds a document to the specified collection',
  async (t) => {
    const response = await firestoreProvider.saveFirestoreDocument(
      collectionName,
      document
    );

    t.deepEqual(response, {id: newDocRef.id, collection: collectionPath});
    t.true(
      firebaseAdminMock.getFirestore().collection.calledOnceWith(collectionName)
    );
    t.true(
      firebaseAdminMock.getFirestore().collection().add.calledOnceWith(document)
    );
  }
);

test.serial(
  '"saveFirestoreDocument" adds a document to the specified collection with timestamp',
  async (t) => {
    const includeTimestamp = true;
    const response = await firestoreProvider.saveFirestoreDocument(
      collectionName,
      document,
      includeTimestamp
    );

    t.deepEqual(response, {id: newDocRef.id, collection: collectionPath});

    t.true(
      firebaseAdminMock.getFirestore().collection.calledOnceWith(collectionName)
    );
    t.true(
      firebaseAdminMock
        .getFirestore()
        .collection()
        .add.calledOnceWith({
          ...document,
          createdAt: 'testTimestamp',
          updatedAt: 'testTimestamp',
        })
    );
  }
);

test.serial(
  '"getDocumentReference" returns a document reference',
  async (t) => {
    const response = firestoreProvider.getDocumentReference(
      collectionName,
      newDocRef.id
    );

    t.truthy(response.update, 'update method exists in the document reference');

    t.true(
      firebaseAdminMock.getFirestore().collection.calledOnceWith(collectionName)
    );
    t.true(
      firebaseAdminMock
        .getFirestore()
        .collection()
        .doc.calledOnceWith(newDocRef.id)
    );
  }
);

test.serial(
  '"getDocumentReference" returns a document reference using parent document reference',
  async (t) => {
    const parentDocRef = firebaseAdminMock.getFirestore();
    const response = firestoreProvider.getDocumentReference(
      collectionName,
      newDocRef.id,
      parentDocRef
    );

    t.truthy(response.update, 'update method exists in the document reference');

    t.true(
      firebaseAdminMock.getFirestore().collection.calledOnceWith(collectionName)
    );
    t.true(
      firebaseAdminMock.getFirestore().collection().doc.calledWith(newDocRef.id)
    );
  }
);

test.serial(
  '"updateFirestoreDocument" updates a document in the specified collection',
  async (t) => {
    const newDocument = {key: 'value2'};

    await firestoreProvider.updateFirestoreDocument(
      collectionName,
      newDocRef.id,
      newDocument
    );

    t.true(
      firebaseAdminMock
        .getFirestore()
        .collection()
        .doc()
        .update.calledOnceWith({...newDocument, updatedAt: 'testTimestamp'})
    );

    t.true(
      loggerMock
        .getLogger()
        .debug.calledOnceWith(
          `Updated document with ID: ${newDocRef.id} in ${newDocRef.parent.id}`
        ),
      'Logs the document update with the correct ID'
    );
  }
);

test.serial(
  '"getCollectionReference" returns the collection reference',
  (t) => {
    const colRef = firestoreProvider.getCollectionReference(collectionName);

    t.truthy(colRef.add, '"add" method exists in the collection reference');
    t.truthy(colRef.doc, '"doc" method exists in the collection reference');

    t.true(
      firebaseAdminMock.getFirestore().collection.calledOnceWith(collectionName)
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
  '"buildDynamicQuery" builds query from the provided conditions',
  (t) => {
    // Create a new mock for the firebase admin library
    // to test out the query builder
    const firebaseAdminMock = {
      initializeApp: sinon.stub(),
      applicationDefault: sinon.stub(),
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

    const firestoreProvider = proxyquire('../../providers/firestore.js', {
      './firebase': {
        getFirestore: firebaseAdminMock.getFirestore,
      },
      'firebase-admin/firestore': {
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
  '"fetchAllDocumentsUsingColRef" fetches the document with the expected function calls',
  async (t) => {
    const firestoreCollectionMock = sinon.stub().returns({
      where: sinon.stub().returns({
        where: sinon.stub().returns({
          limit: sinon.stub().returns({
            get: sinon.stub().resolves({
              docs: [{id: 'newDocId'}],
            }),
          }),
        }),
      }),
    });

    firestoreProviderRewired.__set__({
      logger: loggerMock.getLogger(),
      db: {
        collection: firestoreCollectionMock,
        settings: sinon.stub(),
      },
      buildDynamicQuery: firestoreCollectionMock().where().where().limit,
      getCollectionReference: firebaseAdminMock.getFirestore().collection,
    });

    const response =
      await firestoreProviderRewired.fetchAllDocumentsUsingColRef(
        firestoreCollectionMock
      );

    t.deepEqual(response, [{id: 'newDocId'}]);
    t.true(
      firestoreCollectionMock()
        .where()
        .where()
        .limit.calledWith(firestoreCollectionMock, [], 0)
    );
    t.true(firestoreCollectionMock().where().where().limit().get.calledOnce);
  }
);

test.serial(
  '"fetchAllDocumentsUsingColRef" returns null if no documents match the condition',
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
      db: {
        collection: firestoreCollectionMock,
        settings: sinon.stub(),
      },
      logger: loggerMock.getLogger(),
      buildDynamicQuery: firestoreCollectionMock().where().where().limit,
    });

    const response =
      await firestoreProviderRewired.fetchAllDocumentsUsingColRef(
        firebaseAdminMock.getFirestore().collection
      );

    t.is(response, null);
    t.true(
      firestoreCollectionMock()
        .where()
        .where()
        .limit.calledWith(firebaseAdminMock.getFirestore().collection, [], 0)
    );
    t.true(firestoreCollectionMock().where().where().limit().get.calledOnce);
    t.true(loggerMock.getLogger().warn.calledOnceWith('No data found'));
  }
);

test.serial(
  '"getDocumentData" returns document data successfully',
  async (t) => {
    const documentRef = firebaseAdminMock.getFirestore().collection().doc();
    const response = await firestoreProvider.getDocumentData(documentRef);

    t.deepEqual(response, newDocRef);
    t.true(firebaseAdminMock.getFirestore().collection().doc().get.calledOnce);
    // t.true(
    //   firebaseAdminMock.getFirestore().collection().doc().get().data.calledOnce
    // );
  }
);

test.serial(
  '"fetchDocumentsUsingColRef" fetches the document with the expected function calls',
  async (t) => {
    const conditions = [{field: 'test', operator: '==', value: 'test'}];
    const limit = 2;

    const firestoreCollectionMock = sinon.stub().returns({
      where: sinon.stub().returns({
        where: sinon.stub().returns({
          limit: sinon.stub().returns({
            get: sinon.stub().resolves({
              docs: [{id: 'newDocId'}],
            }),
          }),
        }),
      }),
    });

    firestoreProviderRewired.__set__({
      logger: loggerMock.getLogger(),
      db: {
        collection: firestoreCollectionMock,
        settings: sinon.stub(),
      },
      buildDynamicQuery: firestoreCollectionMock().where().where().limit,
      getCollectionReference: firebaseAdminMock.getFirestore().collection,
    });

    const response = await firestoreProviderRewired.fetchDocumentsUsingColRef(
      firestoreCollectionMock,
      conditions,
      limit
    );

    t.deepEqual(response, [{id: 'newDocId'}]);
    t.true(
      firestoreCollectionMock()
        .where()
        .where()
        .limit.calledWith(firestoreCollectionMock, conditions, limit)
    );
    t.true(firestoreCollectionMock().where().where().limit().get.calledOnce);
  }
);

test.serial(
  '"fetchDocumentsUsingColRef" returns null if no documents match the condition',
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
      db: {
        collection: firestoreCollectionMock,
        settings: sinon.stub(),
      },
      logger: loggerMock.getLogger(),
      buildDynamicQuery: firestoreCollectionMock().where().where().limit,
    });

    const response = await firestoreProviderRewired.fetchDocumentsUsingColRef(
      firebaseAdminMock.getFirestore().collection
    );

    t.is(response, null);
    t.true(
      firestoreCollectionMock()
        .where()
        .where()
        .limit.calledWith(firebaseAdminMock.getFirestore().collection, [], 0)
    );
    t.true(firestoreCollectionMock().where().where().limit().get.calledOnce);
    t.true(loggerMock.getLogger().warn.calledWith('No data found'));
  }
);

test.serial(
  '"updateDocumentWithRef" updates a document in the specified collection',
  async (t) => {
    const newDocument = {key: 'value2'};
    const documentRef = firebaseAdminMock.getFirestore().collection().doc();

    await firestoreProvider.updateDocumentWithRef(documentRef, newDocument);

    t.true(
      firebaseAdminMock
        .getFirestore()
        .collection()
        .doc()
        .update.calledWith({...newDocument, updatedAt: 'testTimestamp'})
    );

    t.true(
      loggerMock
        .getLogger()
        .debug.calledOnceWith(
          `Updated document with ID: ${newDocRef.id} in ${newDocRef.parent.id}`
        ),
      'Logs the document update with the correct ID'
    );
  }
);

test.serial(
  '"updateDocumentWithRef" updates a document in the specified collection without timestamp',
  async (t) => {
    const newDocument = {key: 'value2'};
    const documentRef = firebaseAdminMock.getFirestore().collection().doc();

    await firestoreProvider.updateDocumentWithRef(
      documentRef,
      newDocument,
      false
    );

    t.true(
      firebaseAdminMock
        .getFirestore()
        .collection()
        .doc()
        .update.calledWith(newDocument)
    );

    t.true(
      loggerMock
        .getLogger()
        .debug.calledOnceWith(
          `Updated document with ID: ${newDocRef.id} in ${newDocRef.parent.id}`
        ),
      'Logs the document update with the correct ID'
    );
  }
);

test.serial('"arrayUnion" returns an array union FieldValue', async (t) => {
  const data = {key: 'value2'};

  await firestoreProvider.arrayUnion(data);

  t.true(firebaseAdminMock.FieldValue.arrayUnion.calledOnceWith(data));
});

test.serial(
  '"serverTimestamp" returns a serverTimestamp FieldValue',
  async (t) => {
    await firestoreProvider.serverTimestamp();

    t.is(firebaseAdminMock.FieldValue.serverTimestamp.calledOnce, true);
  }
);

test.serial(
  '"getDocumentReferenceUsingPath" returns a document reference using a document path',
  async (t) => {
    const testDocPath = 'test/path/to/doc';

    firestoreProvider.getDocumentReferenceUsingPath(testDocPath);

    t.true(firebaseAdminMock.getFirestore().doc.calledOnceWith(testDocPath));
  }
);

test.serial(
  '"addDocumentToCollectionWithRef" adds a document to the specified collection',
  async (t) => {
    const collectionRef = firebaseAdminMock
      .getFirestore(collectionName)
      .collection();
    const response = await firestoreProvider.addDocumentToCollectionWithRef(
      collectionRef,
      document
    );

    t.deepEqual(response, {id: newDocRef.id, collection: collectionPath});
    t.true(
      firebaseAdminMock.getFirestore().collection().add.calledOnceWith(document)
    );
    t.true(
      loggerMock
        .getLogger()
        .debug.calledOnceWith(
          `A new document is created with ID: ${newDocRef.id} in ${collectionPath}`
        ),
      'Logs the document creation with the correct ID and collection name'
    );
  }
);

test.serial(
  '"addDocumentToCollectionWithRef" adds a document to the specified collection with timestamp',
  async (t) => {
    const collectionRef = firebaseAdminMock
      .getFirestore(collectionName)
      .collection();
    const includeTimestamp = true;

    const response = await firestoreProvider.addDocumentToCollectionWithRef(
      collectionRef,
      document,
      includeTimestamp
    );

    t.deepEqual(response, {id: newDocRef.id, collection: collectionPath});

    t.true(
      firebaseAdminMock
        .getFirestore()
        .collection()
        .add.calledOnceWith({
          ...document,
          createdAt: 'testTimestamp',
          updatedAt: 'testTimestamp',
        })
    );

    t.true(
      loggerMock
        .getLogger()
        .debug.calledOnceWith(
          `A new document is created with ID: ${newDocRef.id} in ${collectionPath}`
        ),
      'Logs the document creation with the correct ID and collection name'
    );
  }
);
