'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Reservation) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Reservation);

  // assgin last updated time / created time to model
  updateTimeStamp(Reservation);

  //assign an unique if its new instance 
  assignKey(Reservation)

  Reservation.endEngage = (machineId, cb) => {

    const Machine = app.models.Machine;
    
    Reservation.find({where: {machineId: machineId}, order: 'created ASC', limit: 1}, (error, foundReserve)=>{
      if(foundReserve === null){

      }else{

      }
    });
  };


  Reservation.remoteMethod(
    'endEngage',
    {
      http: {path: '/endEngage/:machineId', verb: 'get'},
      accetps: {arg: 'machineId', type: 'string', required: true}
      returns: {arg: 'result', type: 'boolean'} 
    }
  );

};
