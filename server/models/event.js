'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Event) {
  //make loggings for monitor purpose
  loggingModel(Event);

  // assgin last updated time / created time to model
  updateTimeStamp(Event);

};
