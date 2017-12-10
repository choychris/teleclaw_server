'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { createNewTransaction } from '../utils/makeTransaction.js'

module.exports = function(Reward) {
  var app = require('../server');

  //make loggings for monitor purpose
  loggingModel(Reward);

  // assgin last updated time / created time to model
  updateTimeStamp(Reward);

  //assign an unique if its new instance 
  assignKey(Reward)

  Reward.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let { type, rewardAmount, userId } = ctx.instance;
      const Transaction = app.models.Transaction;
      const User = app.models.User;
      if(type === 'checkIn' || type === 'referral'){
        createNewTransaction(userId, rewardAmount, 'plus', 'closed')
          .then(createdTrans => {})
          .catch(err => { next(err) })
      }
    }
    next();
  });

};
