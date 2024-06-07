'use strict';

const test = require('ava');

const {
  haveSameContents,
  generateAnswerObject,
  generateResponseObject,
} = require('../../../../src/session/pubsub/helper');

const sectionChapter = {
  answerId: 'testId',
  questionTitle: 'testQuestionTitle',
  transcript: 'test transcript',
};

const sessionSection = {
  sectionId: 'testSectionId',
  sectionName: 'testSectionName',
  subtitle: 'testSubtitle',
  chapters: [sectionChapter, sectionChapter],
};

test('"haveSameContents" correctly identifies arrays with same contents', (t) => {
  const arrayOne = [1, 2, 'four', 3, 5.0];
  const arrayTwo = [5.0, 1, 'four', 2, 3];
  let response = haveSameContents(arrayOne, arrayTwo);
  t.true(response);

  const arrayThree = [1, 2, 3, 'four', 'five'];
  response = haveSameContents(arrayThree, arrayOne);
  t.false(response);
});

test('"generateAnswerObject" generates the required answer object', (t) => {
  const expectedResponse = {
    question: 'testQuestionTitle',
    answer: 'test transcript',
  };

  const response = generateAnswerObject(sectionChapter);
  t.deepEqual(expectedResponse, response);
});

test('"generateResponseObject" generate the required response object', (t) => {
  const expectedResponse = {
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
  };

  const response = generateResponseObject(sessionSection);
  t.deepEqual(response, expectedResponse);
});
