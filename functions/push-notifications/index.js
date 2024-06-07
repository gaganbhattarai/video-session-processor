const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: 'sandbox-1-392804.appspot.com',
});

const {Logging} = require('@google-cloud/logging');
const logging = new Logging({
  projectId: process.env.GCLOUD_PROJECT,
});

const kFcmTokensCollection = 'fcm_tokens';
const kPushNotificationsCollection = 'ff_push_notifications';
const kUserPushNotificationsCollection = 'ff_user_push_notifications';
const firestore = admin.firestore();

const kPushNotificationRuntimeOpts = {
  timeoutSeconds: 540,
  memory: '2GB',
};

exports.addFcmToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    return 'Failed: Unauthenticated calls are not allowed.';
  }

  const userDocPath = data.userDocPath;
  const fcmToken = data.fcmToken;
  const deviceType = data.deviceType;

  if (
    typeof userDocPath === 'undefined' ||
    typeof fcmToken === 'undefined' ||
    typeof deviceType === 'undefined' ||
    userDocPath.split('/').length <= 1 ||
    fcmToken.length === 0 ||
    deviceType.length === 0
  ) {
    return 'Invalid arguments encoutered when adding FCM token.';
  }

  if (context.auth.uid !== userDocPath.split('/')[1]) {
    return "Failed: Authenticated user doesn't match user provided.";
  }

  const existingTokens = await firestore
    .collectionGroup(kFcmTokensCollection)
    .where('fcm_token', '==', fcmToken)
    .get();

  let userAlreadyHasToken = false;
  /* eslint-disable no-await-in-loop */
  for (const doc of existingTokens.docs) {
    const user = doc.ref.parent.parent;
    if (user.path !== userDocPath) {
      // Should never have the same FCM token associated with multiple users.
      await doc.ref.delete();
    } else {
      userAlreadyHasToken = true;
    }
  }
  /* eslint-enable no-await-in-loop */

  if (userAlreadyHasToken) {
    return 'FCM token already exists for this user. Ignoring...';
  }

  await getUserFcmTokensCollection(userDocPath).doc().set({
    fcm_token: fcmToken,
    device_type: deviceType,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  return 'Successfully added FCM token!';
});

exports.sendPushNotificationsTrigger = functions
  .runWith(kPushNotificationRuntimeOpts)
  .firestore.document(`${kPushNotificationsCollection}/{id}`)
  .onCreate(async (snapshot, _) => {
    try {
      // Ignore scheduled push notifications on create
      const scheduledTime = snapshot.data().scheduled_time || '';
      if (scheduledTime) {
        return;
      }

      await sendPushNotifications(snapshot);
    } catch (e) {
      console.log(`Error: ${e}`);
      await snapshot.ref.update({status: 'failed', error: `${e}`});
    }
  });

exports.sendUserPushNotificationsTrigger = functions
  .runWith(kPushNotificationRuntimeOpts)
  .firestore.document(`${kUserPushNotificationsCollection}/{id}`)
  .onCreate(async (snapshot, _) => {
    try {
      // Ignore scheduled push notifications on create
      const scheduledTime = snapshot.data().scheduled_time || '';
      if (scheduledTime) {
        return;
      }

      // Don't let user-triggered notifications to be sent to all users.
      const userRefsStr = snapshot.data().user_refs || '';
      if (userRefsStr) {
        await sendPushNotifications(snapshot);
      }
    } catch (e) {
      console.log(`Error: ${e}`);
      await snapshot.ref.update({status: 'failed', error: `${e}`});
    }
  });

async function sendPushNotifications(snapshot) {
  const notificationData = snapshot.data();
  const title = notificationData.notification_title || '';
  const body = notificationData.notification_text || '';
  const imageUrl = notificationData.notification_image_url || '';
  const sound = notificationData.notification_sound || '';
  const parameterData = notificationData.parameter_data || '';
  const targetAudience = notificationData.target_audience || '';
  const initialPageName = notificationData.initial_page_name || '';
  const userRefsStr = notificationData.user_refs || '';
  const batchIndex = notificationData.batch_index || 0;
  const numBatches = notificationData.num_batches || 0;
  const status = notificationData.status || '';

  if (status !== '' && status !== 'started') {
    console.log(`Already processed ${snapshot.ref.path}. Skipping...`);
    return;
  }

  if (title === '' || body === '') {
    await snapshot.ref.update({status: 'failed'});
    return;
  }

  const userRefs = userRefsStr === '' ? [] : userRefsStr.trim().split(',');

  const tokens = new Set();
  if (userRefsStr) {
    /* eslint-disable no-await-in-loop */
    for (const userRef of userRefs) {
      const userTokens = await firestore
        .doc(userRef)
        .collection(kFcmTokensCollection)
        .get();
      userTokens.docs.forEach((token) => {
        if (typeof token.data().fcm_token !== typeof undefined) {
          tokens.add(token.data().fcm_token);
        }
      });
    }
    /* eslint-enable no-await-in-loop */
  } else {
    let userTokensQuery = firestore.collectionGroup(kFcmTokensCollection);
    // Handle batched push notifications by splitting tokens up by document
    // id.
    if (numBatches > 0) {
      userTokensQuery = userTokensQuery
        .orderBy(admin.firestore.FieldPath.documentId())
        .startAt(getDocIdBound(batchIndex, numBatches))
        .endBefore(getDocIdBound(batchIndex + 1, numBatches));
    }
    const userTokens = await userTokensQuery.get();
    userTokens.docs.forEach((token) => {
      const data = token.data();
      const audienceMatches =
        targetAudience === 'All' || data.device_type === targetAudience;
      if (audienceMatches || typeof data.fcm_token !== typeof undefined) {
        tokens.add(data.fcm_token);
      }
    });
  }

  const tokensArr = Array.from(tokens);
  const messageBatches = [];
  for (let i = 0; i < tokensArr.length; i += 500) {
    const tokensBatch = tokensArr.slice(i, Math.min(i + 500, tokensArr.length));
    const messages = {
      notification: {
        title,
        body,
        ...(imageUrl && {imageUrl: imageUrl}),
      },
      data: {
        initialPageName,
        parameterData,
      },
      android: {
        notification: {
          ...(sound && {sound: sound}),
        },
      },
      apns: {
        payload: {
          aps: {
            ...(sound && {sound: sound}),
          },
        },
      },
      tokens: tokensBatch,
    };
    messageBatches.push(messages);
  }

  let numSent = 0;
  await Promise.all(
    messageBatches.map(async (messages) => {
      const response = await admin.messaging().sendMulticast(messages);
      numSent += response.successCount;
    })
  );

  await snapshot.ref.update({status: 'succeeded', num_sent: numSent});
}

function getUserFcmTokensCollection(userDocPath) {
  return firestore.doc(userDocPath).collection(kFcmTokensCollection);
}

function getDocIdBound(index, numBatches) {
  if (index <= 0) {
    return 'users/(';
  }
  if (index >= numBatches) {
    return 'users/}';
  }
  const numUidChars = 62;
  const twoCharOptions = Math.pow(numUidChars, 2);

  const twoCharIdx = (index * twoCharOptions) / numBatches;
  const firstCharIdx = Math.floor(twoCharIdx / numUidChars);
  const secondCharIdx = Math.floor(twoCharIdx % numUidChars);
  const firstChar = getCharForIndex(firstCharIdx);
  const secondChar = getCharForIndex(secondCharIdx);
  return 'users/' + firstChar + secondChar;
}

function getCharForIndex(charIdx) {
  if (charIdx < 10) {
    return String.fromCharCode(charIdx + '0'.charCodeAt(0));
  } else if (charIdx < 36) {
    return String.fromCharCode('A'.charCodeAt(0) + charIdx - 10);
  } else {
    return String.fromCharCode('a'.charCodeAt(0) + charIdx - 36);
  }
}

/**
 * To keep on top of errors, we should raise a verbose error report with Stackdriver rather
 * than simply relying on functions.logger.error. This will calculate users affected + send you email
 * alerts, if you've opted into receiving them.
 */

// [START reporterror]

// eslint-disable-next-line no-unused-vars
function reportError(err) {
  // This is the name of the StackDriver log stream that will receive the log
  // entry. This name can be any valid log stream name, but must contain "err"
  // in order for the error to be picked up by StackDriver Error Reporting.
  const logName = 'errors';
  const log = logging.log(logName);

  // https://cloud.google.com/logging/docs/api/ref_v2beta1/rest/v2beta1/MonitoredResource
  const metadata = {
    resource: {
      type: 'cloud_function',
      labels: {function_name: process.env.FUNCTION_NAME},
    },
  };

  // https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorEvent
  const errorEvent = {
    message: err.stack,
    serviceContext: {
      service: process.env.FUNCTION_NAME,
      resourceType: 'cloud_function',
    },
  };

  // Write the error log entry
  return new Promise((resolve, reject) => {
    log.write(log.entry(metadata, errorEvent), (error) => {
      if (error) {
        return reject(error);
      }
      return resolve();
    });
  });
}

// [END reporterror]

/**
 * Sanitize the error message for the user.
 */
// eslint-disable-next-line no-unused-vars
function userFacingMessage(error) {
  return error.type
    ? error.message
    : 'An error occurred, developers have been alerted';
}
