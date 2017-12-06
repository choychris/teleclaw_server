'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

module.exports = function (Exchange_rate) {

  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Exchange_rate);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Exchange_rate);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Exchange_rate);
};