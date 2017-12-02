'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Play) {

  //make loggings for monitor purpose
  loggingModel(Play);

  // assgin last updated time / created time to model
  updateTimeStamp(Play);

  //assign an unique if its new instance 
  assignKey(Play)

};
