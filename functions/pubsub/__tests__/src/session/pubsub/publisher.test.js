'use strict';

const test = require('ava');

const {generateData} = require('../../../../src/session/pubsub/publisher');

const sectionChapter = {
  answerId: 'testId',
  questionTitle: 'testQuestionTitle',
  transcript: 'test transcript',
};

const sectionChapter2 = {
  answerId: 'testId2',
  questionTitle: 'testQuestionTitle2',
  transcript: 'test transcript2',
};

const sessionSections = [
  {
    sectionId: 'testSectionId',
    sectionName: 'testSectionName',
    subtitle: 'testSubtitle',
    chapters: [sectionChapter, sectionChapter],
  },
  {
    sectionId: 'testSectionId2',
    sectionName: 'testSectionName2',
    subtitle: 'testSubtitle2',
    chapters: [sectionChapter2],
  },
];

test('"generateData" generates the required data for session publisher topic', (t) => {
  const referenceID = 'testReferenceId';

  const expectedResponse = {
    referenceId: 'testReferenceId',
    responses: [
      {
        sectionName: 'testSectionName',
        sectionDescription: 'testSubtitle',
        answers: [
          {
            question: 'testQuestionTitle',
            answer: 'test transcript',
          },
          {
            question: 'testQuestionTitle',
            answer: 'test transcript',
          },
        ],
      },
      {
        sectionName: 'testSectionName2',
        sectionDescription: 'testSubtitle2',
        answers: [
          {
            question: 'testQuestionTitle2',
            answer: 'test transcript2',
          },
        ],
      },
    ],
  };

  const response = generateData(referenceID, sessionSections);
  t.deepEqual(expectedResponse, response);
});
