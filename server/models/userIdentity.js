'use strict';
import { updateTimeStamp } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(UserIdentity) {
  loggingModel(UserIdentity);

  updateTimeStamp(UserIdentity);
};
