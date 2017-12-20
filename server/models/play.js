'use strict';

import { updateTimeStamp } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { checkMachineStatus } from '../utils/gamePlayTimer.js';
import { makeCalculation } from '../utils/makeTransaction.js';

const shortid = require('shortid');
const request = require('request');

let { GIZWITS_APPLICATION_ID, GIZWITS_PRODUCT_SECRET, GIZWITS_PRODUCT_KEY } = process.env;

module.exports = function(Play) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Play);

  // assgin last updated time / created time to model
  updateTimeStamp(Play);

  Play.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){
      ctx.instance.id = shortid.generate();
      next();
    }else{
      if(ctx.data && ctx.data.ended && ctx.data.finalResult !== undefined ){
        let { Machine, Reservation, Product } = app.models;
        let { productId, machineId } = ctx.currentInstance;
        Machine.findById(machineId, (err, instance)=>{
          instance.updateAttributes({status: 'open'});
        });
        // if the user win, update product sku
        if(ctx.data.finalResult){
          makeCalculation(Product, productId, 'sku', 1, 'minus');
        }
        // after 8 sec, if user reponse to play again 
        setTimeout(()=>{
          checkMachineStatus(machineId, Machine, Reservation)
        }, 8000)
      }
      next();
    }
  })

};
