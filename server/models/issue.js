'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
let { GMAIL_ADDRESS } = process.env;

module.exports = function(Issue) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Issue);

  // assgin last updated time / created time to model
  updateTimeStamp(Issue);

  //assign an unique if its new instance 
  assignKey(Issue)

  Issue.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let User = app.models.User;
      let { userId, email } =  ctx.instance;
      if(!!email){
        User.findById(userId, (err, user)=>{
          if(user.email === null){
            user.updateAttributes({email: email});
          }
        })
      }
      next();
    }else{
      next();
    }
  })

  Issue.observe('after save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let { Email } = app.models;
      let { type, email, message, userId, machineId, deliveryId, transactionId } = ctx.instance; 
      Email.send({
        to: `${GMAIL_ADDRESS}`,
        from: `${GMAIL_ADDRESS}`,
        subject: `Issue report from users : ${type}`,
        html: `<h1>${message}</h1>
          <h2>userId: ${userId}</h2>
          <h2>User email: ${email}</h2>
          <h2>machineId: ${machineId}</h2>
          <h2>deliveryId: ${deliveryId}</h2>
          <h2>transactionId: ${transactionId}</h2>`
      }, function(err, mail){
        if(err){
          console.log('error in sending mail : ', err)
          next(err)
        }else{
          next();
        }
      })
    }else{
      next();
    }
  })

};
