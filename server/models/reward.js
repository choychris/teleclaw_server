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
      createNewTransaction(userId, rewardAmount, type, 'plus', true)
        .then(createdTrans => {
          ctx.instance.id = createdTrans.id;
          next();
          return null;
        })
        .catch(err => { next(err) })
    }else{
      next();     
    }
  });

  Reward.refer = (data, cb) => {
    let { userId, referralCode } = data;
    let User = app.models.User;
    let Event = app.models.Event;
    User.findById(userId).then(user=>{
      if(user.referral.isRefer){
        cb(null, 'already_referred')
      }else{

      }
    })
    .catch(error=>{
      cb(error)
    })

    function findUserByCode(referralCode){
      let User = app.models.User;
      User.findOne({where:{'referral.code': referralCode}}, (err, user)=>{

      })
    }
  };

  Reward.remoteMethod(
    'refer',
    {
      http: {path: '/refer', verb: 'post'},
      accepts: {arg: 'data', type: 'object', required: true},
      returns: {arg: 'result', type: 'object'}
    }
  );

};
