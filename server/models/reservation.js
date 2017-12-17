'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { checkMachineStatus } from '../utils/gamePlayTimer.js';
import { makeTransaction } from '../utils/makeTransaction.js';
var Promise = require('bluebird');

module.exports = function(Reservation) {

  var app = require('../server');
  //make loggings for monitor purpose
  //loggingModel(Reservation);

  // assgin last updated time / created time to model
  updateTimeStamp(Reservation);

  //assign an unique if its new instance 
  assignKey(Reservation)

  Reservation.observe('after save', (ctx, next)=>{
    let { id, status, userId, machineId } = ctx.instance;
    const Machine = app.models.Machine;
    if(!ctx.isNewInstance){
      if(status === 'close'){
        app.pusher.trigger(`reservation-${userId.toString()}`, 'your_turn', {reservationId: id, machineId: machineId, status: status, time: new Date().getTime()})
        makeTransaction(Machine, machineId, 'reservation', 1, 'minus');
      }else if(status === 'open'){
        makeTransaction(Machine, machineId, 'reservation', 1, 'plus');
      }else{
        makeTransaction(Machine, machineId, 'reservation', 1, 'minus');
      }
    }
    next();
  });

  Reservation.endEngage = (machineId, cb) => {
    let Machine = app.models.Machine;

    Machine.findById(machineId, (err, machine)=>{
      // check if machine is still in playing
      if(machine.status !== 'playing'){
        //find next reservation
        Reservation.find({where: {machineId: machineId, status: 'open'}, order: 'lastUpdated ASC', limit: 1}, (error, foundReserve)=>{
          if(foundReserve === null || foundReserve.length === 0){
            console.log('when no reserve');
            updateMachine(machineId, 'open', null)
            if(!!cb){ cb(null, 'machine_open'); }
          }else{
            //update the next reserve and trigger pusher in after save
            foundReserve[0].updateAttributes({status: 'close', machineId: machineId}, (newError, instance)=>{
              updateMachine(machineId, 'open', {id: instance.userId})
              timeOutReserve(machineId, Reservation);
              if(!!cb){ cb(null, 'next_reserve'); }
            });
          }
        });

      }else{
        if(!!cb){ cb(null, 'machine_playing'); }
      }
    });

  };

  function updateMachine(machineId, status, userId){
    let Machine = app.models.Machine;
    Machine.findById(machineId, (err, machine)=>{
      machine.updateAttributes({status: status, currentUser: userId}, (err, instance)=>{
        if(err){
          console.log(err);
        }
        console.log('machine instance :', instance);
      });
    });
  }

  function timeOutReserve(machineId, Reservation){
      let Machine = app.models.Machine;
      setTimeout(()=>{
        checkMachineStatus(machineId, Machine, Reservation)
      }, 8000)
  }



  Reservation.remoteMethod(
    'endEngage',
    {
      http: {path: '/:machineId/endEngage', verb: 'get'},
      accepts: [{arg: 'machineId', type: 'string', required: true}],
      returns: {arg: 'result', type: 'object'} 
    }
  );

};
