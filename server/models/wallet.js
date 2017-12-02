'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel, loggingRemote } from '../utils/createLogging.js';

module.exports = function(Wallet) {
  var app = require('../server');

  //make loggings for monitor purpose
  loggingModel(Wallet);

  // assgin last updated time / created time to model
  updateTimeStamp(Wallet);

  //assign an unique if its new instance 
  assignKey(Wallet)
};
