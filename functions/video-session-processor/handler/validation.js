'use-strict';

const FirebaseFunctions = require('firebase-functions'); // eslint-disable-line no-unused-vars

/**
 * Checks if the Firestore document snapshot represents a valid event trigger
 *
 * @param {FirebaseFunctions.Change<FirebaseFirestore.DocumentSnapshot>} documentSnapshot The Firestore document snapshot
 * @param {Object} documentSnapshot.after The document state after the triggered event
 * @param {boolean} documentSnapshot.after.exists Indicates whether the document exists after the triggered event
 *
 * @return {boolean} Returns true if the document represents a valid event trigger, otherwise false
 */
function isValidEventTrigger(documentSnapshot) {
  return Boolean(documentSnapshot?.after?.exists);
}

module.exports = {
  isValidEventTrigger,
};
