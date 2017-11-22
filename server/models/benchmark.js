'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js'

module.exports = function(Benchmark) {

  //make loggings for monitor purpose
  loggingModel(Benchmark);

  // assgin an id to each newly created model
  assignKey(Benchmark);

  // assgin last updated time / created time to model
  updateTimeStamp(Benchmark);


};
