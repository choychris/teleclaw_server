'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel, loggingFunction, loggingRemote } from '../utils/createLogging.js';
import { checkMachineStatus } from '../utils/gamePlayTimer.js';
import { makeCalculation } from '../utils/makeTransaction.js';
var Promise = require('bluebird');

module.exports = function(Reservation) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Reservation);
  loggingRemote(Reservation, 'endEngage');

  // assgin last updated time / created time to model
  updateTimeStamp(Reservation);

  Reservation.disableRemoteMethodByName("deleteById", true);

  //assign an unique if its new instance 
  assignKey(Reservation)

  Reservation.observe('before save', (ctx, next)=>{
    const Machine = app.models.Machine;
    if(!ctx.isNewInstance){
      // machineId of currently reserving
      let { id, status, userId, machineId } = ctx.currentInstance;
      // ctx.data.machineId = machineId of newly reserve
      if(!!ctx.data){
        // this logic is to check if the user is currently making a reserve, and
        // the user want to make reserve to another machine
        if(ctx.data.status === 'open' && status === 'open' && !!machineId){
          makeCalculation(Machine, machineId, 'reservation', 1, 'minus');
        }
        // when user make a new reservation
        if(ctx.data.status === 'open' && !!ctx.data.machineId){
          makeCalculation(Machine, ctx.data.machineId, 'reservation', 1, 'plus');
        }
        // when it is user's turn to play
        if(ctx.data.status === 'close' && !!machineId){
          makeCalculation(Machine, machineId, 'reservation', 1, 'minus');
        }
        // when the user cancel the reserve
        if(ctx.data.status === 'cancel' && !!machineId){
          //let { id, status, userId, machineId } = ctx.currentInstance;
          makeCalculation(Machine, machineId, 'reservation', 1, 'minus');
          ctx.data.machineId = null ;
          ctx.data.productId = null ;
        }
      }
      next();
    }else{
      next();
    }
    
  });

  Reservation.observe('after save', (ctx, next)=>{
    let { id, status, userId, machineId, lastUpdated, productId } = ctx.instance;
    const Machine = app.models.Machine;
    if(!ctx.isNewInstance){
      // when its user turn to play the game
      if(status === 'close' && !!machineId){
        let pusherObj = {
          id: id,
          status: status, 
          machineId: machineId,
          productId:  productId,
          lastUpdated: lastUpdated
        };
        app.pusher.trigger(`reservation-${userId.toString()}`, 'your_turn', pusherObj)
      }
      next();
    }else{
      next();
    }
  });

  // the remote method to immediately change the machine status and find the next user
  Reservation.endEngage = (machineId, userId, cb) => {
    let Machine = app.models.Machine;

    Machine.findById(machineId, (err, machine)=>{
      // check if machine is still in playing
      let currentId = machine.currentUser ? machine.currentUser.id : 'null' ;
      let infomation = {
        machineId: machineId,
        machineStatus: machine.status,
        userId: userId.toString(),
        currentId: currentId.toString()
      };
      loggingFunction('Reservation | ', 'end user engage | ', JSON.stringify(infomation), 'info');
      if(machine.status == 'open' && (currentId.toString() == userId.toString())){
        //find next reservation
        Reservation.findOne({where: {machineId: machineId, status: 'open'}, order: 'lastUpdated ASC'}, (error, foundReserve)=>{
          if(foundReserve === null){
            updateMachine(machineId, 'open', null)
            if(!!cb){ cb(null, 'machine_open'); }
          }else{
            //update the next reserve and trigger pusher in after save
            foundReserve.updateAttributes({status: 'close'}, (newError, instance)=>{
              updateMachine(machineId, 'open', {id: instance.userId})
              // after 8 sec, check if user has reponsed
              timeOutReserve(machineId, instance.userId, Machine, Reservation);
              if(!!cb){ cb(null, 'next_reserve'); }
            });
          }
        });

      }else if(machine.status == 'playing'){
        if(!!cb){ cb(null, 'machine_playing'); }
      }else if(machine.status == 'close'){
        if(!!cb){ cb(null, 'machine_closed'); }
      }else{
        if(!!cb){ cb(null, 'machine_ready'); }
      }
    });
  };//<--- endEngage remote method end

  function updateMachine(machineId, status, userId){
    let Machine = app.models.Machine;
    Machine.findById(machineId, (err, machine)=>{
      machine.updateAttributes({status: status, currentUser: userId}, (err, instance)=>{
        if(err){
          loggingFunction('Reservation | ', ' updateMachine Error | ', err, 'error')
        }
        // console.log('machine instance :', instance);
      });
    });
  }

  // after 8 sec, check if user has reponsed
  function timeOutReserve(machineId, userId, Machine, Reservation){
      setTimeout(()=>{
        checkMachineStatus(machineId, userId, Machine, Reservation)
      }, 12000)
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

  Reservation.serverlessWorker = (machineId, cb) => {

    //find next reservation
    Reservation.findOne({where: {machineId: machineId, status: 'open'}, order: 'lastUpdated ASC'}, (error, foundReserve)=>{
      if(foundReserve === null){
        updateMachine(machineId, 'open', null)
        cb(null, 'machine_open'); 
      }else{
        //update the next reserve and trigger pusher in after save
        foundReserve.updateAttributes({status: 'close'}, (newError, instance)=>{
          updateMachine(machineId, 'open', {id: instance.userId})
          // after 8 sec, check if user has reponsed
          let Machine = app.models.Machine;
          timeOutReserve(machineId, instance.userId, Machine, Reservation);
          cb(null, 'next_reserve'); 
        });
      }
    });
  };

  Reservation.remoteMethod(
    'serverlessWorker',
    {
      http: {path: '/:machineId/serverlessWorker', verb: 'get'},
      accepts: [
        {arg: 'machineId', type: 'string', required: true}
      ],
      returns: {arg: 'result', type: 'string'} 
    }
  );

};
