'use strict';

const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');

const {getLogger} = require('./logging');

const logger = getLogger(__filename);

initializeApp();

const db = getFirestore();
db.settings({ignoreUndefinedProperties: true});

/**
 * Return a Firestore collection reference
 *
 * @param {String} collectionName Name of the Firestore collection
 * @param {FirebaseFirestore.CollectionReference} [parentCollectionRef=None] Parent collection reference
 *
 * @return {FirebaseFirestore.CollectionReference} The Firestore collection reference
 */
function getCollectionReference(collectionName, parentCollectionRef = null) {
  return parentCollectionRef
    ? parentCollectionRef.collection(collectionName)
    : db.collection(collectionName);
}

/**
 * Add a new document to a Firebase Collection
 *
 * @async
 * @param {Object} document New data to add to Firebase collection
 * @param {String} collectionName Firebase Collection Name
 * @param {Boolean} [addAuditAttributes=false] Boolean condition to add audit attributes to the document
 * @param {FirebaseFirestore.CollectionReference} [parentCollectionRef=None] Parent collection reference to add to sub collection
 *
 * @return {Promise<FirebaseFirestore.DocumentReference>}
 */
async function addDocumentToCollection(
  document,
  collectionName,
  addAuditAttributes = false,
  parentCollectionRef = null
) {
  // Create a reference to the given collection
  const colRef = getCollectionReference(collectionName, parentCollectionRef);

  if (addAuditAttributes === true) {
    document = {
      ...document,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  }

  // Add a new document to the collection
  const newDocRef = await colRef.add(document);

  // Log the new document ID
  logger.debug(
    `New document created with ID: ${newDocRef.id} in ${collectionName}`
  );

  return newDocRef;
}

/**
 * Return a Firestore sub collection reference
 *
 * @param {String} subCollectionName Name of the sub collection
 * @param {FirebaseFirestore.DocumentSnapshot} parentCollectionDataSnapshot The document data of the parent collection
 *
 * @return {FirebaseFirestore.CollectionReference} The Firestore collection reference
 */
function getSubCollectionReference(
  subCollectionName,
  parentCollectionDataSnapshot
) {
  return parentCollectionDataSnapshot.ref.collection(subCollectionName);
}

/**
 * Generate Firestore Query object
 *
 * @param {FirebaseFirestore.CollectionReference} collectionReference Firestore collection reference
 * @param {Object<string, string>} conditions Object for query conditions
 * @param {Number} [limit=0] Maximum number of responses to fetch in query. Defaults to 0 (fetch all)
 *
 * @return {FirebaseFirestore.Query} Firestore Query object
 */
function buildDynamicQuery(collectionReference, conditions, limit = 0) {
  let query = collectionReference;

  conditions.forEach((condition) => {
    const {field, operator, value} = condition;
    query = query.where(field, operator, value);
  });

  if (limit > 0) {
    return query.limit(limit);
  }
  return query;
}

/**
 * Returns the documents from a collection matching the specified queries
 *
 * @async
 * @param {String} collectionName A Firestore collection name
 * @param {Object<string, string>} conditions Custom object for condition queries
 * @param {Number} limit Number of maximum responses to retrieve
 * @param {FirebaseFirestore.CollectionReference} parentCollectionRef Collection reference of the parent (if exists)
 *
 * @return {Promise<FirebaseFirestore.QuerySnapshot|null>} Document Snapshot with data if it exists or null
 */
async function fetchDocumentsMatchingCondition(
  collectionName,
  conditions,
  limit = 0,
  parentCollectionRef = null
) {
  let collectionRef;
  if (!parentCollectionRef) {
    collectionRef = getCollectionReference(collectionName);
  } else {
    collectionRef = parentCollectionRef
  }
  const querySnapshot = await fetchDocumentsByCollectionRef(
    collectionRef,
    conditions,
    limit
  );
  return querySnapshot;
}

/**
 * Return a single document data from a collection matching the specified queries
 *
 * @async
 * @param {String} collectionName A Firestore collection name
 * @param {Object<string, string>} conditions Custom object for condition queries
 * @param {FirebaseFirestore.CollectionReference} parentCollectionRef Collection reference of the parent (if exists)
 *
 * @return {Promise<FirebaseFirestore.QueryDocumentSnapshot|null>} Document data if it exists or null
 */
async function fetchSingleDocumentMatchingCondition(
  collectionName,
  conditions,
  parentCollectionRef = null,
) {
  const limit = 1;
  const querySnapshot = await fetchDocumentsMatchingCondition(
    collectionName,
    conditions,
    limit,
    parentCollectionRef
  );

  return querySnapshot === null ? null : querySnapshot.docs[0];
}

/**
 * Return document snapshot data using a collection reference matching the specified queries
 *
 * @async
 * @param {String} collectionRef A reference to Firestore collection
 * @param {Object<string, string>} conditions Custom object for condition queries
 * @param {Number} [limit=0] Custom object for condition queries
 *
 * @return {Promise<FirebaseFirestore.QueryDocumentSnapshot|null>} Document snapshot data if it exists or null
 */
async function fetchDocumentsByCollectionRef(
  collectionRef,
  conditions,
  limit = 0
) {
  const query = buildDynamicQuery(collectionRef, conditions, limit);
  const querySnapshot = await query.get();

  if (querySnapshot.empty) {
    logger.warn('No data found');
    return null;
  }
  return querySnapshot;
}

/**
 * Return a single document data using a collection reference matching the specified queries
 *
 * @async
 * @param {String} collectionRef A reference to Firestore collection
 * @param {Object<string, string>} conditions Custom object for condition queries
 * @param {Number} [limit=0] Custom object for condition queries
 *
 * @return {Promise<FirebaseFirestore.QueryDocumentSnapshot|null>} Document snaphshot data if it exists or null
 */
async function fetchSingleDocumentByCollectionRef(collectionRef, conditions) {
  const limit = 1;
  const querySnapshot = await fetchDocumentsByCollectionRef(
    collectionRef,
    conditions,
    limit
  );

  return querySnapshot === null ? null : querySnapshot.docs[0];
}

/**
 * Retrieves a Firestore document reference based on the specified collection name and document ID
 *
 * @param {string} collectionName The name of the Firestore collection
 * @param {string} documentId The ID of the document within the collection.
 *
 * @return {FirebaseFirestore.DocumentReference} Firestore document reference
 */
function getDocumentReference(collectionName, documentId) {
  return db.collection(collectionName).doc(documentId);
}

const exportedForTesting = {
  buildDynamicQuery,
  fetchDocumentsByCollectionRef,
};

module.exports = {
  exportedForTesting,
  getDocumentReference,
  saveFirestoreDocument: addDocumentToCollection,
  getCollectionReference,
  getSubCollectionReference,
  fetchDocumentsMatchingCondition,
  fetchSingleDocumentByCollectionRef,
  fetchSingleDocumentMatchingCondition,
};
