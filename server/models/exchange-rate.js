'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Exchangerate) {

  //make loggings for monitor purpose
  loggingModel(Exchangerate);

  // assgin last updated time / created time to model
  updateTimeStamp(Exchangerate);

  //assign an unique if its new instance 
  assignKey(Exchangerate)


};
