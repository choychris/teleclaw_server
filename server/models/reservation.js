'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { checkMachineStatus } from '../utils/gamePlayTimer.js';
import { makeCalculation } from '../utils/makeTransaction.js';
var Promise = require('bluebird');

module.exports = function(Reservation) {

  var app = require('../server');
  //make loggings for monitor purpose
  //loggingModel(Reservation);

  // assgin last updated time / created time to model
  updateTimeStamp(Reservation);

  Reservation.disableRemoteMethod("deleteById", true);

  //assign an unique if its new instance 
  assignKey(Reservation)

  Reservation.observe('before save', (ctx, next)=>{
    const Machine = app.models.Machine;
    if(!ctx.isNewInstance){
      let { id, status, userId, machineId } = ctx.currentInstance;
      if(ctx.data && ctx.data.machineId){
        let sameMachine = (machineId === ctx.data.machineId);
        if(status === 'open' && !!machineId){
            makeCalculation(Machine, machineId, 'reservation', 1, 'minus');
        }
      }
      if(ctx.data && ctx.data.status === 'cancel'){
        let { id, status, userId, machineId } = ctx.currentInstance;
        makeCalculation(Machine, machineId, 'reservation', 1, 'minus');
        ctx.data.machineId = null ;
        ctx.data.productId = null ;
      }
    };
    next();
  });

  Reservation.observe('after save', (ctx, next)=>{
    let { id, status, userId, machineId, lastUpdated, productId } = ctx.instance;
    const Machine = app.models.Machine;
    if(!ctx.isNewInstance){
      if(status === 'close' && !!machineId){
        let pusherObj = {
          id: id,
          status: status, 
          machineId: machineId,
          productId:  productId,
          lastUpdated: lastUpdated
        };
        app.pusher.trigger(`reservation-${userId.toString()}`, 'your_turn', pusherObj)
        makeCalculation(Machine, machineId, 'reservation', 1, 'minus');
      }else if(status === 'open' && !!machineId){
        makeCalculation(Machine, machineId, 'reservation', 1, 'plus');
      }
      next();
    }else{
      next();
    }
  });

  Reservation.endEngage = (machineId, userId, cb) => {
    let Machine = app.models.Machine;
    Machine.findById(machineId, (err, machine)=>{
      // check if machine is still in playing
      let currentId = machine.currentUser ? machine.currentUser.id : null
      if(machine.status != 'playing' && currentId == userId){
        //find next reservation
        Reservation.find({where: {machineId: machineId, status: 'open'}, order: 'lastUpdated ASC', limit: 1}, (error, foundReserve)=>{
          if(foundReserve === null || foundReserve.length === 0){
            console.log('when no reserve');
            updateMachine(machineId, 'open', null)
            if(!!cb){ cb(null, 'machine_open'); }
          }else{
            //update the next reserve and trigger pusher in after save
            foundReserve[0].updateAttributes({status: 'close'}, (newError, instance)=>{
              updateMachine(machineId, 'open', {id: instance.userId})
              timeOutReserve(machineId, userId, Machine, Reservation);
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

  function timeOutReserve(machineId, userId, Machine, Reservation){
      setTimeout(()=>{
        checkMachineStatus(machineId, userId, Machine, Reservation)
      }, 8000)
  }

  Reservation.remoteMethod(
    'endEngage',
    {
      http: {path: '/:machineId/:userId/endEngage', verb: 'get'},
      accepts: [
        {arg: 'machineId', type: 'string', required: true},
        {arg: 'userId', type: 'string', required: true}
      ],
      returns: {arg: 'result', type: 'object'} 
    }
  );

};
