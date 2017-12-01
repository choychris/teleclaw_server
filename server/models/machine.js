'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js'

module.exports = function(Machine) {

  var app = require('../server');
  var firebase = app.firebaseApp;
  var firebasedb = firebase.database();
  //make loggings for monitor purpose
  loggingModel(Machine);

  // assgin an id to each newly created model
  // assignKey(Machine);

  // assgin last updated time / created time to model
  updateTimeStamp(Machine);

  Machine.observe('before save', (ctx, next) => {
    if(!ctx.isNewInstance){
      if(ctx.data && ctx.data.currentPlayer){
        ctx.hookstate.currentPlayer = ctx.data.currentPlayer;
        ctx.data.userId = ctx.data.currentPlayer.userId;
        delete ctx.data.currentPlayer;
      }
    } 
    next();
  });

  Machine.observe('after save', (ctx, next) => {
    // console.log(app.firebaseApp);
    if(ctx.isNewInstance){
      let ref = firebasedb.ref(`machines/${ctx.instance.id}`);
      let { name, status, display } = ctx.instance ;
      ref.set({machine_name: name, status: status, display: display, numOfViewer: 0, numOfReserve: 0, currentPlayer: null, totalNumOfPlay: 0, totalNumOfSuccess: 0 }, (error)=>{
        if(error){
          console.log("Firebase : Machine could not be saved." + error);
        }else{
          console.log("Firebase : Machine saved successfully.");
        };
      });
    } else if (ctx.hookstate && ctx.hookstate.currentPlayer) {
      let ref = firebasedb.ref(`machines/${ctx.instance.id}`);
      ref.update({status: 'playing', currentPlayer: ctx.hookstate.currentPlayer}, (error)=>{
        if(error){
          console.log("Firebase : Machine could not be updated." + error);
        }else{
          ref.child('totalNumOfPlay').transaction((current_value)=>{
            return (current_value + 1);
          });
          console.log("Firebase : Machine updated successfully.");
        }
      });
    } else if (!ctx.isNewInstance){
      let ref = firebasedb.ref(`machines/${ctx.instance.id}`);
      let { name, status, display } = ctx.instance ;
      ref.update({machine_name: name, status: status, display: display}, (error)=>{
        if(error){
          console.log("Firebase : Machine could not be updated." + error);
        }else{
          console.log("Firebase : Machine updated successfully.");
        };
      });
    } 
    
    next();
  });


};
