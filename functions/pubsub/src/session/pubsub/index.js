'use-strict';

const helper = require('./helper');
const publisher = require('./publisher');

module.exports = {
  generateData: publisher.generateData,
  haveSameContents: helper.haveSameContents,
};
