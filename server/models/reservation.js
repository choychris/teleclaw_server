'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { changeFirebaseDb, makeDbTransaction } from '../utils/firebasedb.js';
var Promise = require('bluebird');

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

  // Reservation.observe('before save', (ctx, next)=>{
  //   if(!ctx.isNewInstance && ctx.data){
  //     console.log(ctx.data);
  //     let { status, machineId } = ctx.data;
  //     let machineLocation = `machines/${machineId}` ;
  //     if(status === 'close'){
  //       makeDbTransaction(machineLocation, 'numOfReserve', 'minus');
  //       ctx.data.machineId = 'none';
  //       next();   
  //     }else if(status === 'open'){
  //       makeDbTransaction(machineLocation, 'numOfReserve', 'plus');
  //       next();
  //     }else{
  //       next();
  //     }
  //   }
  // });

  Reservation.observe('after save', (ctx, next)=>{
    let { id, status, userId, machineId } = ctx.instance;
    //let location = `userInfo/${userId}/reservation`;
    // if(ctx.isNewInstance){
    //   let firebaseDataObj = {
    //     id: id, 
    //     status: status, 
    //     machineId: machineId
    //   };
    //   changeFirebaseDb('set', location, firebaseDataObj, 'Reservation');
    // }
    
    //changeFirebaseDb('update', location, {status: status, machineId: machineId}, 'Reservation');

    if(!ctx.isNewInstance){
      if(status === 'close'){
        //asMessagingFunc({type: 'Reservation', reservationId: id, userId: userId, machineId: machineId, status: status})
        
      }
    }
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

    // removeCurrentEngage(machineId)
    // .then(res =>{
    Reservation.find({where: {machineId: machineId, status: 'open'}, order: 'created ASC', limit: 1}, (error, foundReserve)=>{
      //console.log('foundReserve : ', foundReserve);
      if(foundReserve === null || foundReserve.length == 0){
        Machine.findById(machineId, (err, machine)=>{
          machine.updateAttributes({status: 'open', currentUserId: 'nouser'}, (err, instance)=>{
            cb(null, instance);
          })
        });
      }else{
        //console.log(typeof foundReserve);
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
