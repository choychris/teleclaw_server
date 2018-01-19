'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';

module.exports = function(Broadcast) {
  //assgin an id to each newly created model
  assignKey(Benchmark);

  // assgin last updated time / created time to model
  updateTimeStamp(Benchmark);
};
