import { updateTimeStamp, assignKey } from '../utils/beforeSave';
// import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Turnserver) {
  // assgin last updated time / created time to model
  updateTimeStamp(Turnserver);

  // assign an unique if its new instance
  assignKey(Turnserver);
};
