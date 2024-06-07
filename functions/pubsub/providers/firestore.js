'use strict';

const {FieldValue} = require('firebase-admin/firestore');

const {getLogger} = require('./logging');
const {getFirestore} = require('./firebase');

const db = getFirestore();

const logger = getLogger(__filename);

/**
 * Fetch the document reference using the document path.
 *
 * @param {String} documentPath Path of the document
 *
 * @return {FirebaseFirestore.DocumentReference} Firestore document reference
 */
function getDocumentReferenceUsingPath(documentPath) {
  return db.doc(documentPath);
}

/**
 * Return a Firestore collection reference
 *
 * @param {String} collectionName Name of the Firestore collection
 * @param {FirebaseFirestore.CollectionReference} [parentCollectionDocRef=None] Reference of the Firessdocument in the parent collection
 *
 * @return {FirebaseFirestore.CollectionReference} The Firestore collection reference
 */
function getCollectionReference(collectionName, parentCollectionDocRef = null) {
  return parentCollectionDocRef
    ? parentCollectionDocRef.collection(collectionName)
    : db.collection(collectionName);
}

/**
 * Retrieves a Firestore document reference based on the specified collection name and document ID
 *
 * @param {string} collectionName The name of the Firestore collection
 * @param {string} documentId The ID of the document within the collection.
 * @param {FirebaseFirestore.DocumentReference} parentDocRef The reference to the parent doc
 *
 * @return {FirebaseFirestore.DocumentReference} Firestore document reference
 */
function getDocumentReference(collectionName, documentId, parentDocRef = null) {
  if (!parentDocRef) {
    return db.collection(collectionName).doc(documentId);
  }
  return parentDocRef.collection(collectionName).doc(documentId);
}

/**
 * Adds a document to the specified Firestore collection with optional timestamp
 *
 * @async
 * @param {string} collectionName The name of the Firestore collection
 * @param {Object} data The data to be added to the document
 * @param {boolean} [includeTimestamps=false] Indicates whether to include timestamps (createdAt, updatedAt) in a document
 *
 * @return {Promise<Object.<string, string>>} A Promise that resolves to an object containing the new document ID and collection
 */
async function addDocumentToCollection(
  collectionName,
  data,
  includeTimestamps = false
) {
  // Create a reference to the given collection
  const collectionRef = db.collection(collectionName);

  return await addDocumentToCollectionWithRef(
    collectionRef,
    data,
    includeTimestamps
  );
}

/**
 * Adds a document to a specified collection with optional timestamp using the collection reference
 *
 * @async
 * @param {string} collectionRef The Firestore collection reference
 * @param {Object} data The data to be added to the document
 * @param {boolean} [includeTimestamps=false] Indicates whether to include timestamps (createdAt, updatedAt) in a document
 *
 * @return {Promise<Object.<string, string>>} A Promise that resolves to an object containing the new document ID and collection
 */
async function addDocumentToCollectionWithRef(
  collectionRef,
  data,
  includeTimestamps = false
) {
  if (includeTimestamps === true) {
    data = {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  }

  // Add the document data
  const newDocRef = await collectionRef.add(data);

  // Log the new document ID
  logger.debug(
    `A new document is created with ID: ${newDocRef.id} in ${collectionRef.path}`
  );

  // Return an object
  return {id: newDocRef.id, collection: collectionRef.path};
}

/**
 * Update an existing document in a Firebase Collection
 *
 * @async
 * @param {String} collectionName Firebase Collection Name
 * @param {String} documentID Firestore document id
 * @param {Object.<String, Any>} updatedDocument Object with the updated data
 *
 * @return {Promise<null>} A Promise that resolves once the document is successfully updated
 */
async function updateDocumentInCollection(
  collectionName,
  documentID,
  updatedDocument
) {
  return await updateDocumentWithRef(
    getDocumentReference(collectionName, documentID),
    updatedDocument
  );
}

/**
 * Generate Firestore Query object
 *
 * @param {FirebaseFirestore.CollectionReference} collectionReference Firestore collection reference
 * @param {Array<Object<string, string>>} conditions Object for query conditions
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
 * @param {FirebaseFirestore.CollectionReference} collectionRef A Firestore collection reference
 *
 * @return {Promise<FirebaseFirestore.Query|null>} Document Snapshot with data if it exists or null
 */
async function fetchAllDocumentsUsingColRef(collectionRef) {
  const query = buildDynamicQuery(collectionRef, [], 0);
  const querySnapshot = await query.get();

  if (querySnapshot.empty) {
    logger.warn('No data found');
    return null;
  }
  return querySnapshot.docs;
}

/**
 * Fetches the document data from the Firestore document reference
 *
 * @async
 * @param {FirebaseFirestore.DocumentReference} documentRef Document reference
 * @throws {FirebaseFirestore.FirestoreError} If an error occurs during the retrieval
 *
 * @return {Promise<FirebaseFirestore.DocumentData>} A promise that resolves to the document data
 */
async function getDocumentData(documentRef) {
  const documentSnapshot = await documentRef.get();
  return documentSnapshot.data();
}

/**
 * Fetches documents from a Firestore collection based on specified conditions and limit
 *
 * @async
 * @param {FirebaseFirestore.CollectionReference} collectionRef A Firestore Collection Reference
 * @param {Array<Object<string, any>>} [conditions=[]] Array of conditions to filter documents
 * @param {Number} [limit=0] The maximum number of documents to retrieve (0 for no limit)
 *
 * @return {Promise<Array<FirebaseFirestore.QueryDocumentSnapshot>>} A promise that resolves to an array of QueryDocumentSnapshots
 */
async function fetchDocumentsUsingColRef(
  collectionRef,
  conditions = [],
  limit = 0
) {
  const query = buildDynamicQuery(collectionRef, conditions, limit);
  const querySnapshot = await query.get();

  if (querySnapshot.empty) {
    logger.warn('No data found');
    return null;
  }
  return querySnapshot.docs;
}

/**
 * Updates a Firestore document with the provided data
 *
 * @async
 * @param {FirebaseFirestore.DocumentReference} documentRef A Firestore Document Reference.
 * @param {Object<string, any>} data The data to update the document with
 * @param {Boolean} [includeTimestamp=true] Indicates whether to update timestamp (updatedAt) in the document
 *
 * @return {Promise<null>} A promise that resolves when the document is successfully updated
 */
async function updateDocumentWithRef(
  documentRef,
  data,
  includeTimestamp = true
) {
  if (includeTimestamp === true) {
    data = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };
  }
  await documentRef.update(data);
  logger.debug(
    `Updated document with ID: ${documentRef.id} in ${documentRef.parent.id}`
  );
  return null;
}

/**
 * Creates a Firestore array union FieldValue with the provided data
 *
 * @param {Object<string, any>} data The data to include in the array union
 *
 * @return {FieldValue} The Firestore FieldValue representing the array union
 */
function arrayUnion(data) {
  return FieldValue.arrayUnion(data);
}

/**
 * Gets the Firestore server timestamp FieldValue
 *
 * @return {FieldValue} The Firestore FieldValue representing the server timestamp
 */
function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

const exportedForTesting = {buildDynamicQuery};

module.exports = {
  arrayUnion,
  getDocumentData,
  serverTimestamp,
  exportedForTesting,
  getDocumentReference,
  updateDocumentWithRef,
  getCollectionReference,
  fetchDocumentsUsingColRef,
  fetchAllDocumentsUsingColRef,
  getDocumentReferenceUsingPath,
  addDocumentToCollectionWithRef,
  saveFirestoreDocument: addDocumentToCollection,
  updateFirestoreDocument: updateDocumentInCollection,
};
