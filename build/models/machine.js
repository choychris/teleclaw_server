'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

module.exports = function (Machine) {

  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Machine);

  // assgin an id to each newly created model
  // assignKey(Machine);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Machine);
};