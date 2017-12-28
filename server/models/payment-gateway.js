'use strict';

import { assignKey } from '../utils/beforeSave.js';

module.exports = function(Paymentgateway) {

  // assgin an id to each newly created model
  assignKey(Paymentgateway);

  // update timeStamp of the gateway
  Paymentgateway.observe('before save', (ctx, next)=>{
    let now = new Date().getTime();
    if(ctx.isNewInstance){
      ctx.instance.created = now;
    }else{
      if(!!ctx.instance){
        ctx.instance.lastTopUp = now;
      }
      if(!!ctx.data){
        ctx.data.lastTopUp = now;
      } 
    }
    next();
  })

};
