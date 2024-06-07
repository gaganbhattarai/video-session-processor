const dotenv = require('dotenv');
const convict = require('convict');

dotenv.config();

const config = convict({
  env: {
    doc: 'The function deployment environment.',
    format: ['prod', 'dev', 'develop', 'test', 'demo'],
    default: 'dev',
    env: 'APP_ENV',
  },
  cloud: {
    bucket: {
      name: {
        doc: 'Default Cloud bucket name',
        format: String,
        default: 'sandbox-1-392804.appspot.com', // TODO: revert to null
        env: 'STORAGE_BUCKET',
      },
      httpsBaseURL: {
        doc: 'Base Https URL for the cloud bucket',
        format: String,
        default: 'https://storage.cloud.google.com',
      },
    },
    project: {
      id: {
        doc: 'The Google Cloud Platform project ID',
        format: String,
        default: 'sandbox-1-392804', // TODO: revert to null
        env: 'PROJECT_ID',
      },
      name: {
        doc: 'The Google Cloud Platform project name',
        format: String,
        default: null,
        env: 'GCLOUD_PROJECT',
      },
      region: {
        doc: 'Default region of the GCP Project',
        format: String,
        default: 'us-central1',
      },
    },
    transcoderService: {
      jobStatus: {
        success: {
          doc: '"Succeeded" job status',
          default: 'SUCCEEDED',
        },
        running: {
          doc: '"Running" job status',
          default: 'RUNNING',
        },
        pending: {
          doc: '"Pending" job status',
          default: 'PENDING',
        },
        failed: {
          doc: '"Failed" job status',
          default: 'FAILED',
        },
      },
      timeoutDuration: {
        ms: {
          doc: 'Timeout duration for transcoder service API call (in milliseconds)',
          default: 300000,
        },
      },
    },
  },
  firebase: {
    function: {
      name: {
        doc: 'Name of the triggered cloud function',
        format: String,
        default: '',
        env: 'FUNCTION_TARGET',
      },
      region: {
        doc: 'Region where the function is deployed',
        default: 'us-central1',
      },
    },
    firestore: {
      sectionAnswersSubCollection: {
        doc: 'Firestore sub collection for patient section responses',
        default: 'sectionAnswers',
      },
      patientResponseCollection: {
        doc: 'Firestore collection for patient response',
        default: 'patient_response',
      },
      sessionsCollection: {
        doc: 'Firestore collection for patient sessions',
        default: 'sessions',
      },
      organizationCollection: {
        doc: 'Firestore collection for patient sessions',
        default: 'organizations',
      },
    },
    storage: {
      responseDirectory: {
        doc: 'Directory name for response in Firebase Storage bucket',
        default: 'patient_response',
      },
      sessionsDirectory: {
        doc: 'Directory for "sessions" ',
        default: 'sessions',
      },
      thumbnailDirectory: {
        doc: 'Directory for session thumbnails',
        default: 'Thumbnails',
      },
      previewURLRoot: {
        doc: 'Preview URL root for firebase storage',
        default: 'https://firebasestorage.googleapis.com',
      },
    },
  },
  response: {
    completedStatus: {
      doc: 'A completed status in the request',
      format: String,
      default: 'completed',
    },
    videoAnswerType: {
      doc: 'Status type of video',
      format: String,
      default: 'video',
    },
    session: {
      status: {
        new: {
          doc: 'New session status',
          format: String,
          default: 'New',
        },
      },
    },
  },
});

// Perform validation
config.validate({allowed: 'strict'});

module.exports = config;
