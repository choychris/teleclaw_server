'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

const shortid = require('shortid');

module.exports = function(Event) {
  //make loggings for monitor purpose
  loggingModel(Event);

  // assgin last updated time / created time to model
  updateTimeStamp(Event);

  //assign an unique id if its new instance 
  assignKey(Event);

  Event.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let { code, type } = ctx.instance;
      if(type != 'referral'){
        Event.validatesUniquenessOf('launching', {message: 'there are same type of event launching'});
      }
      ctx.instance.code = code ? code : shortid.generate();
      next();
    }else{
      next();
    }
  })  

};
