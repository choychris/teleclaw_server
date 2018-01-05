'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

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

};
