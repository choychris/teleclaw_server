'use strict';

import { updateTimeStamp } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
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
        let Machine = app.models.Machine;
        Machine.findById(machineId, (err, instance)=>{
          instance.updateAttributes({status: 'open'});
        });

        // after 5 sec, if user reponse to play again 
        setTimeout(()=>{checkMachineStatus(machineId)}, 5000)
      }
      next();
    }
  })

  function compareTimeStamp(time, duration){
    let now = new Date().getTime();
    console.log('compare time now : ', now);
    if((now - time) > duration){
      return true;
    }else{
      return false;
    }
  };
  //if machine has not update in last 8 sec, clean it.
  function checkMachineStatus(machineId){
    let Machine = app.models.Machine;
    let Reservation = app.models.Reservation;
    Machine.findById(machineId, (err, instance)=>{
      console.log("clean trigger : ", instance.lastUpdated);
      if(compareTimeStamp(instance.lastUpdated, 8000)){
        Reservation.endEngage(machineId)
      }
    });
  }


};
