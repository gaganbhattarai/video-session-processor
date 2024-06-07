'use-strict';

/**
 * Checks if two arrays have the same contents
 *
 * @param {Array} a - The first array
 * @param {Array} b - The second array
 *
 * @return {boolean} True if the arrays have the same contents, false otherwise
 */
const haveSameContents = (a, b) => {
  for (const v of new Set([...a, ...b]))
    if (a.filter((e) => e === v).length !== b.filter((e) => e === v).length)
      return false;
  return true;
};

/**
 * Generates answer object in the format required for publishing to Pub/Sub
 *
 * @param {typedefs.SessionSectionChapter} sectionChapter The section chapter object
 *
 * @return {typedefs.SessionPublisherResponseAnswer} Answer object in required format
 */
const generateAnswerObject = (sectionChapter) => {
  const requiredAnswerObject = {
    question: sectionChapter.questionTitle,
    answer: sectionChapter.transcript,
  };
  return requiredAnswerObject;
};

/**
 * Retrieves an object containing response details from a provided response object.
 *
 * @param {typedefs.SessionSection} sessionSection The session section object
 *
 * @return {typedefs.SessionPublisherResponse} An object containing response details
 */
const generateResponseObject = (sessionSection) => {
  const responseObject = {
    sectionName: sessionSection.sectionName,
    sectionDescription: sessionSection.subtitle,
    answers: sessionSection.chapters.map((chapter) =>
      generateAnswerObject(chapter)
    ),
  };
  return responseObject;
};

module.exports = {
  haveSameContents,
  generateAnswerObject,
  generateResponseObject,
};
