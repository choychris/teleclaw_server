'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Reservation) {

  var app = require('../server');
  var firebase = app.firebaseApp;
  var firebasedb = firebase.database();
  //make loggings for monitor purpose
  loggingModel(Reservation);

  // assgin last updated time / created time to model
  updateTimeStamp(Reservation);

  //assign an unique if its new instance 
  assignKey(Reservation)

  Reservation.observe('after save', (ctx, next)=>{
    let ref = firebasedb.ref(`userInfo/${ctx.instance.userId}/reservation`);
    if(ctx.isNewInstance){
      

    }
  })

  Reservation.endEngage = (machineId, cb) => {
    console.log('machineId : ', machineId);
    const Machine = app.models.Machine;
    Reservation.find({where: {machineId: machineId, status: 'open'}, order: 'created ASC', limit: 1}, (error, foundReserve)=>{
      console.log('foundReserve : ', foundReserve);
      if(foundReserve === null || foundReserve.length == 0){
        Machine.findById(machineId, (err, machine)=>{
          machine.updateAttributes({status: 'open', currentUserId: 'nouser'}, (err, instance)=>{
            cb(null, instance);
          })
        });
      }else{
        console.log(typeof foundReserve);
        cb(null, {foundReserve: foundReserve[0]});
      }
    });
  };


  Reservation.remoteMethod(
    'endEngage',
    {
      http: {path: '/:machineId/endEngage', verb: 'get'},
      accepts: [{arg: 'machineId', type: 'string', required: true}],
      returns: {arg: 'result', type: 'object'} 
    }
  );

};
