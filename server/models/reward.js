'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { createNewTransaction } from '../utils/makeTransaction.js'
var moment = require('moment');

module.exports = function(Reward) {
  var app = require('../server');

  //make loggings for monitor purpose
  loggingModel(Reward);

  // assgin last updated time / created time to model
  updateTimeStamp(Reward);

  //assign an unique if its new instance 
  assignKey(Reward)

  Reward.observe('before save', (ctx, next)=>{
    let User = app.models.User;
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

  Reward.checkIn = (userId, cb) => {
    let { User, Event, Wallet } = app.models;
    let cutOffTime = moment().set({h:7, m:0, s:0, ms:0}).valueOf();
    
    User.findById(userId, {fields: {lastLogIn: true}})
    .then(user=>{
      let lastLogIn = moment(user.lastLogIn).valueOf();
      if(lastLogIn < cutOffTime){
        return Event.findOne({where:{launching: true, type: 'checkIn'}})
      }else{
        return cb(null, 'reward_already_claimed');
      }
    }).then(foundEvent=>{
      if(foundEvent !== undefined){
        let { type, rewardAmount } = foundEvent;
        return Promise.all([Wallet.findOne({where: {userId: userId}}), Reward.create({type, rewardAmount, userId})])
      }
    }).then(result=>{
      if(!!result){
        let wallet = result[0];
        let reward = result[1];
        cb(null, {success: true, newWalletBalance: wallet.balance + reward.rewardAmount})
      }
    }).catch(error=>{
      console.log('error in checkIn reward :', error)
      cb(error)
    })
  };

  Reward.remoteMethod(
    'checkIn',
    {
      http: {path: '/checkIn/:userId', verb: 'get'},
      accepts: {arg: 'userId', type: 'string', required: true},
      returns: {arg: 'result', type: 'object'}
    }
  );

  Reward.refer = (data, cb) => {
    let { userId } = data;
    let code = data.code ? data.code.trim() : null;
    let { User, Event, Wallet } = app.models;

    if(code === null){
      cb(null, 'missing_code');
    }else{
      Promise.all([User.findOne({where: {"referral.code": code}}), Event.findOne({where: {type: 'promotion', launching: true, code: code}})])
      .then(result=>{
        console.log('result: ', result);
        let foundUser = result[0];
        let foundEvent = result[1];
        if(foundUser !== null){
          referFriends(foundUser);
        }else if(foundEvent !== null){
          promotionCode(foundEvent)
        }else{
          cb(null, 'invalid_code');
        }
        return null
      }).catch(error=>{
        console.log('error in find user / event : ', error);
        cb(error)
      })
    }

    function referFriends(referrer){
      User.findById(userId).then(user=>{
        if(user.referral.code === code){
          return cb(null, 'invalid_code');
        }else if(user.referral.isReferred){
          return cb(null, 'already_being_referred');
        }else{
          return Promise.all([Event.findOne({where: {type: 'referral', launching: true}}), referrer, user]);
        }
      }).then(result=>{
        if(result !== undefined){
          let foundEvent = result[0] ;
          let referringUser = result[1] ;
          let user = result[2];
          let { type, rewardAmount, maxNum } = foundEvent;
          if(referringUser.referral.numOfReferred >= maxNum){
            cb(null, 'referer_reach_max_refer')
            return null;
          }else{
            let { referral } = referringUser ;
            user.updateAttributes({'referral.isReferred': true});
            referringUser.updateAttributes({'referral.numOfReferred' : referral.numOfReferred + 1})
            return Promise.all([Wallet.findOne({where: {userId: userId}}), Reward.create({type, rewardAmount, userId, participantId:referringUser.id}), Reward.create({type, rewardAmount, userId: referringUser.id, participantId:userId})])
          }
        }
      }).then(result=>{
        if(!!result){
          let wallet = result[0];
          let reward = result[1];
          cb(null, {success: true, newWalletBalance: wallet.balance + reward.rewardAmount})
        }
      })
      .catch(error=>{
        console.log('error in refer friends : ', error)
        cb(error)
      })
    }

    function promotionCode(promotionEvent){
      Event.find({where: {claimedUser: {in :[userId]}, type: 'promotion', launching: true, code: code}})
      .then(currentEvent=>{
        if(currentEvent.length !== 0){
          return cb(null, 'reward_already_claimed');
        }else{
          return promotionEvent;
        }
      }).then(foundEvent=>{
        if(foundEvent !== undefined){
          let now = new Date().getTime();
          if(foundEvent.maxNum >= foundEvent.currentNum){
            cb(null, 'event_is_full');
          }else if(now > foundEvent.endTime){
            cb(null, 'event_ended');
          }else{
            let { id, currentNum, rewardAmount, type } = foundEvent;
            foundEvent.updateAttributes({currentNum: currentNum + 1})
            Event.update({ id: id },{ $push: { "claimedUser": userId }}, { allowExtendedOperators: true })
            return Promise.all([Wallet.findOne({where: {userId: userId}}), Reward.create({type, rewardAmount, userId})])
          }
        }
      }).then(result=>{
        if(!!result){
          let wallet = result[0];
          let reward = result[1];
          cb(null, {success: true, newWalletBalance: wallet.balance + reward.rewardAmount})
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
      returns: {arg: 'result', type: 'object'}
    }
  );

};
