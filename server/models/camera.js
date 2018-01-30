'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Camera) {
  //make loggings for monitor purpose
  loggingModel(Camera);

  // assgin last updated time / created time to model
  updateTimeStamp(Camera);

  //assign an unique if its new instance 
  assignKey(Camera)

};
