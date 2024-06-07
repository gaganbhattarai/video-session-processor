const convict = require('convict');
const dotenv = require('dotenv');

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
        default: null,
        env: 'STORAGE_BUCKET',
      },
    },
    project: {
      id: {
        doc: 'The Google Cloud Platform project ID',
        format: String,
        default: null,
        env: 'PROJECT_ID',
      },
      number: {
        doc: 'The Google Cloud Platform project number',
        format: String,
        default: '896476077149',
        env: 'PROJECT_NUMBER',
      },
    },
    secret: {
      authSignatureName: {
        doc: 'The name of the secret for the authentication',
        default: 'auth-signature-videoask-webhook',
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
        format: String,
        default: 'us-central1',
      },
    },
    firestore: {
      responseCollection: {
        doc: 'Firestore collection for patient response',
        format: String,
        default: 'patient_response',
      },
      questionnaireDraftCollection: {
        doc: 'Firestore collection for questionnaire draft',
        format: String,
        default: 'questionnaire_draft',
      },
      patientWiseStatusCollection: {
        doc: 'Firestore collection for patientWiseStatus draft',
        format: String,
        default: 'patientWiseStatus',
      },
      sectionAnswersCollection: {
        doc: 'Firestore sub collection for "sectionAnswers"',
        default: 'sectionAnswers',
      },
      organizationCollection: {
        doc: 'Firestore collection for patient sessions',
        default: 'organizations',
      },
    },
    storage: {
      responseDirectory: {
        doc: 'Directory name for response in Firebase Storage bucket',
        format: String,
        default: 'patient_response',
      },
    },
  },
  request: {
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
    respondent: {
      status: {
        available: {
          doc: 'Available Response Status',
          default: 'Available',
        },
        completed: {
          doc: 'Completed Response Status',
          default: 'Completed',
        },
        draft: {
          doc: 'Draft Response Status',
          default: 'Draft',
        },
      },
    },
    question: {
      label_word_to_replace: {
        doc: 'Word to replace in the question label',
        default: '(transcribed)',
      },
      max_num_of_words: {
        doc: 'Maximum number of words for generated question title',
        default: 5,
      },
    },
    authHeader: {
      name: {
        doc: 'Header name for custom auth',
        default: 'x-auth-signature',
      },
    },
  },
});

// Perform validation
config.validate({allowed: 'strict'});

module.exports = config;
