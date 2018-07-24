import { updateTimeStamp, assignKey } from '../utils/beforeSave';
import { loggingModel } from '../utils/createLogging';
// import { changeFirebaseDb } from '../utils/firebasedb.js';
// const app = require('../server');

module.exports = function(Wallet) {
  // make loggings for monitor purpose
  loggingModel(Wallet);

  // assgin last updated time / created time to model
  updateTimeStamp(Wallet);

  // assign an unique if its new instance
  assignKey(Wallet);
};
