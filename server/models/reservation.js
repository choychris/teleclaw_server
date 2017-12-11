'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
// import { asMessagingFunc } from '../utils/firebasedb.js';
import { makeTransaction } from '../utils/makeTransaction.js';
var Promise = require('bluebird');

module.exports = function(Reservation) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Reservation);

  // assgin last updated time / created time to model
  updateTimeStamp(Reservation);

  //assign an unique if its new instance 
  assignKey(Reservation)

  Reservation.observe('after save', (ctx, next)=>{
    let { id, status, userId, machineId } = ctx.instance;
    const Machine = app.models.Machine;
    if(!ctx.isNewInstance){
      if(status === 'close'){
        app.pusher.trigger(`reservation-${userId.toString()}`, 'your_turn', {reservationId: id, machineId: machineId, status: status})
        makeTransaction(Machine, machineId, 'reservation', 1, 'minus');
      }else if(status === 'open'){
        makeTransaction(Machine, machineId, 'reservation', 1, 'plus');
      }else{
        makeTransaction(Machine, machineId, 'reservation', 1, 'minus');
      }
    }
    // }else{
    //   makeTransaction(Machine, machineId, 'reservation', 1, 'plus');
    // }
    next();
  });

  Reservation.endEngage = (machineId, cb) => {
    // console.log('machineId : ', machineId);
    const Machine = app.models.Machine;
    // const removeCurrentEngage = (machineId) => {
    //   return new Promise((resolve, reject)=>{
    //     Reservation.findOne({where : {machineId: machineId, status: 'engage'}}, (error, reserve)=>{
    //       console.log('find one reserve : ', reserve);
    //       if(reserve !== null){
    //         reserve.updateAttributes({status: 'close', machineId: machineId}, (err, inst)=>{
    //           resolve(true)
    //           return true;
    //         })
    //       }else if(!error){
    //         resolve(true)
    //         return false;
    //       }else{
    //         reject(error)
    //         return false;
    //       }
    //     });
    //   });
    // };

    function updateMachine(machineId, status){
      Machine.findById(machineId, (err, machine)=>{
        machine.updateAttributes({status: status, currentUser: null}, (err, instance)=>{
          if(err){
            cb(err);
          }
        });
      });
    }

    // removeCurrentEngage(machineId)
    // .then(res =>{
    Reservation.find({where: {machineId: machineId, status: 'open'}, order: 'lastUpdated ASC', limit: 1}, (error, foundReserve)=>{
      //console.log('foundReserve : ', foundReserve);
      if(foundReserve === null || foundReserve.length == 0){
        updateMachine(machineId, 'open')
        cb(null, {machineStatus: 'open'});
      }else{
        //console.log(typeof foundReserve);
        updateMachine(machineId, 'playing')
        foundReserve[0].updateAttributes({status: 'close', machineId: machineId}, (newError, instance)=>{
          //console.log('update next player to engage : ', instance);
          cb(null, {reserveUpdate: instance});
        });
      }
    });
    //   })
    //   .catch(err => {
    //     cb(err)
    //   });
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
