'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Exchange_rate) {

  //make loggings for monitor purpose
  loggingModel(Exchange_rate);

  // assgin last updated time / created time to model
  updateTimeStamp(Exchange_rate);

  //assign an unique if its new instance 
  assignKey(Exchange_rate)

};
