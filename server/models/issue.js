'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { sendEmail } from '../utils/nodeMailer.js'

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
      ctx.instance.solved = false;
      if(!!email){
        // update user's email if user has no email in facebook;
        User.findById(userId, (err, user)=>{
          if(user.email === null){
            user.updateAttributes({Email: email});
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
      let subject = `Issue report from user : type = ${type}` ;
      let html =  `<h3>Message : ${message}</h3>
          <h3>userId : ${userId}</h3>
          <p>User email : ${email}</p>
          <p>Related machineId : ${machineId}</p>
          <p>Related deliveryId : ${deliveryId}</p>
          <p>Related transactionId : ${transactionId}</p>`
      // send email notification if user report an issue
      sendEmail(subject, html); 
      next();
    }else{
      next();
    }
  })

};
