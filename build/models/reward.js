'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

module.exports = function (Reward) {
  //var app = require('../server');

  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Reward);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Reward);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Reward);
};