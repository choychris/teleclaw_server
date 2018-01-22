'use strict';

import { updateTimeStamp } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { checkMachineStatus } from '../utils/gamePlayTimer.js';
import { makeCalculation } from '../utils/makeTransaction.js';

const shortid = require('shortid');

module.exports = function(Play) {

  var app = require('../server');
  //make loggings for monitor purpose
  //loggingModel(Play);

  // assgin last updated time / created time to model
  updateTimeStamp(Play);

  Play.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){
      ctx.instance.id = shortid.generate();
      next();
    }else{
      // if the play result is updated
      if(ctx.data && ctx.data.ended && ctx.data.finalResult !== undefined ){
        let { Machine, Reservation, Product } = app.models;
        let { productId, machineId, userId, created } = ctx.currentInstance;
        // set machine status to open, while frontend  is asking for users response 
        Machine.findById(machineId, (err, instance)=>{
          instance.updateAttributes({status: 'open'});
        });
        let duration = (new Date(ctx.data.ended).getTime() - new Date(created).getTime())/1000
        ctx.data.duration = duration;
        // if the user win, update product and machine sku
        if(ctx.data.finalResult === true){
          makeCalculation(Product, productId, 'sku', 1, 'minus');
          makeCalculation(Machine, machineId, 'sku', 1, 'minus');
        }
        // after 8 sec, check if user has reponsed
        setTimeout(()=>{
          checkMachineStatus(machineId, userId, Machine, Reservation)
        }, 8000)
      }
      next();
    }
  })

};
