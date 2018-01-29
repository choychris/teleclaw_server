'use strict';

import { assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Paymentgateway){
  
  loggingModel(Paymentgateway)

  // assgin an id to each newly created model
  assignKey(Paymentgateway);

  // update timeStamp of the gateway
  Paymentgateway.observe('before save', (ctx, next)=>{
    let now = new Date().getTime();
    if(ctx.isNewInstance){
      ctx.instance.created = now;
    };
    next();
  });

};
