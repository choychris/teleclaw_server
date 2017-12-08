'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Reward) {
  //var app = require('../server');

  //make loggings for monitor purpose
  loggingModel(Reward);

  // assgin last updated time / created time to model
  updateTimeStamp(Reward);

  //assign an unique if its new instance 
  assignKey(Reward)

  Reward.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let { type, rewardAmount,  } = ctx.instance;
    }
    
  });

  Reward.observe('after save', (ctx, next)=>{

  })

};
