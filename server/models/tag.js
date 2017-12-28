'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Tag) {

  // assgin last updated time / created time to model
  updateTimeStamp(Tag);

  //assign an unique if its new instance 
  assignKey(Tag)

};
