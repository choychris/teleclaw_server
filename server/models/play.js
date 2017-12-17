'use strict';

import { updateTimeStamp } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { checkMachineStatus } from '../utils/gamePlayTimer.js';
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
      if(ctx.data && ctx.data.ended){
        let machineId = ctx.currentInstance.machineId;
        let { Machine, Reservation } = app.models;
        Machine.findById(machineId, (err, instance)=>{
          instance.updateAttributes({status: 'open'});
        });

        // after 8 sec, if user reponse to play again 
        setTimeout(()=>{
          checkMachineStatus(machineId, Machine, Reservation)
        }, 8000)
      }
      next();
    }
  })

};
