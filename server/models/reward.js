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
          ctx.instance.transactionId = createdTrans.id;
          next();
          return null;
        }).catch(err => { next(err) })
    }else{
      next();     
    }
  });

  Reward.refer = (data, cb) => {
    let { userId, type } = data;
    let code = data.code ? data.code.trim() : null;
    let { User, Event } = app.models;
    console.log(data);

    if(code === null){
      cb(null, 'no_code_entered');
    }else if(type == 'referral'){
      referFriends();
    }else{
      promotionCode()
    };
    
    function referFriends(){
      User.findById(userId).then(user=>{
        if(user.referral.isReferred){
          cb(null, 'already_being_referred')
          return null
        }else{
          return Promise.all([Event.findOne({where: {type: 'referral', launching: true}}), User.findOne({where: {"referral.code": code}}), user])
        }
      }).then(result=>{
        let foundEvent = result[0] ;
        let referringUser = result[1] ;
        let user = result[2];
        let { type, rewardAmount, maxNum } = foundEvent;
        if(referringUser == null){
          cb(null, 'incorrect_user_code')
          return null;
        }else if(referringUser.referral == maxNum){
          cb(null, 'referr_reach_max_refer')
          return null;
        }else{
          let { referral } = referringUser ;
          user.updateAttributes({'referral.isReferred': true});
          referringUser.updateAttributes({'referral.numOfReferred' : referral.numOfReferred + 1})
          return Promise.all([Reward.create({type, rewardAmount, userId, participantId:referringUser.id}), Reward.create({type, rewardAmount, userId: referringUser.id, participantId:userId})])
        }
      }).then(createdReward=>{
        cb(null, 'reward_success');
      })
      .catch(error=>{
        console.log('error in refer friends : ', error)
        cb(error)
      })
    }

    function promotionCode(){
      Event.find({where: {claimedUser: {in :[userId]}, type: 'promotion', launching: true, code: code}})
      .then(currentEvent=>{
        if(currentEvent.length !== 0){
          return cb(null, 'reward_already_claimed');
        }else{
          return Event.findOne({where: {type: 'promotion', launching: true, code: code}})
        }
      }).then(foundEvent=>{
        if(foundEvent !== undefined){
          let now = new Date().getTime();
          if(foundEvent === null){
            cb(null, 'invalid_event');
          }else if(foundEvent.maxNum == foundEvent.currentNum){
            cb(null, 'event_is_full');
          }else if(now > foundEvent.endTime){
            cb(null, 'event_ended');
          }else{
            let { id, currentNum, rewardAmount } = foundEvent;
            foundEvent.updateAttributes({currentNum: currentNum + 1})
            Event.update({ id: id },{ $push: { "claimedUser": userId }}, { allowExtendedOperators: true })
            return Reward.create({type, rewardAmount, userId})
          }
        }
      }).then(reward=>{
        if(reward){
          cb(null, 'reward_success');
        }
      }).catch(error=>{
        console.log('error in promotion refer : ', error)
        cb(error)        
      })
    }
  };


  Reward.remoteMethod(
    'refer',
    {
      http: {path: '/refer', verb: 'post'},
      accepts: {arg: 'data', type: 'object', required: true},
      returns: {arg: 'result', type: 'string'}
    }
  );

};
