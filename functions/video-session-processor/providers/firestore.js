'use strict';

const {FieldValue} = require('firebase-admin/firestore');

const {getLogger} = require('./logging');
const {getFirestore} = require('./firebase');

const db = getFirestore();

const logger = getLogger(__filename);

/**
 * Return a Firestore collection reference
 *
 * @param {String} collectionName Firestore collection name
 * @param {FirebaseFirestore.DocumentReference} [parentDocumentRef=None] Parent document reference
 *
 * @return {FirebaseFirestore.CollectionReference} Firestore collection reference
 */
function getCollectionReference(collectionName, parentDocumentRef = null) {
  return parentDocumentRef
    ? parentDocumentRef.collection(collectionName)
    : db.collection(collectionName);
}

/**
 * Retrieves a Firestore document reference based on the specified collection name and document ID
 *
 * @param {String|FirebaseFirestore.CollectionReference} collectionNameOrRef Firestore collection name or reference
 * @param {String} documentId Document ID in the collection
 *
 * @return {FirebaseFirestore.DocumentReference} Firestore document reference
 */
function getDocumentReference(collectionNameOrRef, documentId) {
  const collectionRef =
    typeof collectionNameOrRef === 'string'
      ? getCollectionReference(collectionNameOrRef)
      : collectionNameOrRef;

  return collectionRef.doc(documentId);
}

/**
 * Fetches the document data from the Firestore document reference
 *
 * @async
 * @param {FirebaseFirestore.DocumentReference} documentRef Document reference
 *
 * @throws {FirebaseFirestore.FirestoreError} If an error occurs during the retrieval
 *
 * @return {Promise<FirebaseFirestore.DocumentData>} A promise that resolves with the document data
 */
async function getDocumentData(documentRef) {
  const documentSnapshot = await documentRef.get();
  return documentSnapshot.data();
}

/**
 * Adds a document to the specified Firestore collection with optional timestamp
 *
 * @async
 * @param {String} collectionName Firestore collection name
 * @param {Object} data Data to be added to the document
 * @param {Boolean} [includeTimestamps=true] Indicates whether to include timestamps (createdAt, updatedAt) in a document
 * @param {FirebaseFirestore.DocumentReference} [parentDocumentRef=None] Parent document reference (to add to sub collection)
 *
 * @return {Promise<FirebaseFirestore.DocumentReference>} A Promise that resolves with a Firestore Document reference
 */
async function addDocumentToCollection(
  collectionName,
  data,
  includeTimestamps = true,
  parentDocumentRef = null
) {
  const collectionRef = getCollectionReference(
    collectionName,
    parentDocumentRef
  );

  if (includeTimestamps === true) {
    data = {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
  }

  // Add the new document data to the collection
  const newDocumentRef = await collectionRef.add(data);

  // Log the new document ID
  logger.debug(
    `New document (${newDocumentRef.id}) created in ${collectionName}`
  );

  return newDocumentRef;
}

/**
 * Updates a Firestore document with the provided data
 *
 * @async
 * @param {FirebaseFirestore.DocumentReference} documentRef A Firestore document reference
 * @param {Object<String, any>} data Data to update the document with
 *
 * @return {Promise<FirebaseFirestore.WriteResult>} Promise that resolves when the document is successfully updated
 */
async function updateDocumentWithRef(documentRef, data) {
  const response = await documentRef.update(data);
  logger.debug(
    `Successfully updated document (${documentRef.id}) in ${documentRef.path}`
  );
  return response;
}

/**
 * Update an existing document in a Firebase Collection
 *
 * @async
 * @param {String} collectionName Firebase Collection Name
 * @param {String} documentID Firestore document id
 * @param {Object.<String, Any>} data Object with the updated data
 * @param {FirebaseFirestore.DocumentReference} parentDocumentRef Document reference of the parent
 *
 * @return {Promise<null>} A Promise that resolves once the document is successfully updated
 */
async function updateDocumentInCollection(
  collectionName,
  documentID,
  data,
  parentDocumentRef = null
) {
  const collectionRef = getCollectionReference(
    collectionName,
    parentDocumentRef
  );
  const documentRef = getDocumentReference(collectionRef, documentID);
  return await updateDocumentWithRef(documentRef, data);
}

/**
 * Generate Firestore Query object
 *
 * @param {FirebaseFirestore.CollectionReference} collectionRef Firestore collection reference
 * @param {Array<Object<string, string>>} conditions Object for query conditions
 * @param {Number} [limit=0] Maximum number of responses to fetch in query. Defaults to 0 (fetch all)
 *
 * @return {FirebaseFirestore.Query} Firestore Query object
 */
function buildDynamicQuery(collectionRef, conditions, limit = 0) {
  let query = collectionRef;

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
    logger.warn(`No data found in ${collectionRef.path}`);
    return null;
  }
  return querySnapshot.docs;
}

/**
 * Returns the documents from a collection matching the specified queries
 *
 * @async
 * @param {FirebaseFirestore.CollectionReference} collectionRef A Firestore collection reference
 *
 * @return {Promise<FirebaseFirestore.Query|null>} Document Snapshot with data if it exists or null
 */
const fetchAllDocumentsUsingColRef = fetchDocumentsUsingColRef.bind(
  null,
  [],
  0
);

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
  saveFirestoreDocument: addDocumentToCollection,
  updateFirestoreDocument: updateDocumentInCollection,
};
