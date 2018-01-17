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
      if(type !== 'promotion'){
        // if it is not promotion, make sure no same type of event is launching
        Event.findOne({where: {type: type, launching:true}}, (err, event)=>{
          if(event !== null){
            next('there is already a same type event launching')
          }else{
            // assgin shortId as event code;
            ctx.instance.code = (code !== undefined) ? code : shortid.generate();
            next();
          }
        });
      }else{
        ctx.instance.currentNum = 0 ;
        ctx.instance.claimedUser = [] ;
        ctx.instance.code = (code !== undefined) ? code : shortid.generate();
        next();
      }
    }else{
      next();
    }
  });

  Event.observe('before save', (ctx, next)=>{
    if(!ctx.isNewInstance && ctx.data.launching){
      let type = ctx.data.type || ctx.instance.type;
      if(type !== 'promotion'){
        // if it is not promotion, make sure no same type of event is launching
        Event.findOne({where: {type: type, launching:true}}, (err, event)=>{
          if(event !== null){
            next('there is already a same type event launching')
          }else{
            next();
          }
        })
      }else{
        next();
      }
    }else{
      next();
    }
  });
 

};
