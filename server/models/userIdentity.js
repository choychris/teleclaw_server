'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(UserIdentity) {
  updateTimeStamp(UserIdentity);
};
