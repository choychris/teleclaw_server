'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js'

module.exports = function(Machine) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Machine);

  // assgin an id to each newly created model
  // assignKey(Machine);

  // assgin last updated time / created time to model
  updateTimeStamp(Machine);

  Machine.observe('before save', (ctx, next) => {
    // console.log(app.firebaseApp);
    next();
  });

};
