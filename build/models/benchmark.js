'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

module.exports = function (Benchmark) {

  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Benchmark);

  // assgin an id to each newly created model
  //assignKey(Benchmark);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Benchmark);
  //console.log('this is Benchmark');

};