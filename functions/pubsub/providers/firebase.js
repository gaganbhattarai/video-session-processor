'use-strict';

const {
  getApps,
  initializeApp,
  applicationDefault,
} = require('firebase-admin/app');
const {getStorage} = require('firebase-admin/storage');
const {getFirestore} = require('firebase-admin/firestore');

const config = require('../config');

const firebaseConfig = {
  credential: applicationDefault(),
  storageBucket: config.get('cloud.bucket.name'),
};

// Initialize Firebase Admin SDK
// Fetch app if already initialized or initialize new application
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

exports.getStorage = () => getStorage(app);
exports.getFirestore = () => {
  const db = getFirestore();
  db.settings({ignoreUndefinedProperties: true});
  return db;
};
