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
  assignKey(Machine);

  // assgin last updated time / created time to model
  updateTimeStamp(Machine);

  Machine.observe('before save', (ctx, next) => {
    if(!ctx.isNewInstance){
    } 
    next();
  });

  Machine.observe('after save', (ctx, next) => {
    // console.log(app.firebaseApp);
    if(ctx.isNewInstance){
      let ref = firebasedb.ref(`machines/${ctx.instance.id}`);
      let { name, status, display,  } = ctx.instance ;
      ref.set({machine_name: name, status: status, display: display, numOfViewer: 0, numOfReserve: 0, currentPlayer: null, totalNumOfPlay: 0, totalNumOfSuccess: 0 }, (error)=>{
        if(error){
          console.log("Firebase : Machine could not be saved." + error);
        }else{
          console.log("Firebase : Machine saved successfully.");
        };
      });
    } else if (!ctx.isNewInstance){
      if(ctx.instance){
        let ref = firebasedb.ref(`machines/${ctx.instance.id}`);
        let { name, status, display, currentUserId } = ctx.instance ;
        if(currentUserId === 'nouser'){
          ref.update({currentPlayer: null})
        }
        ref.update({machine_name: name, status: status, display: display}, (error)=>{
          if(error){
            console.log("Firebase : Machine could not be updated." + error);
          }else{
            console.log("Firebase : Machine updated successfully.");
          };
        });
      }  
    } 
    next();
  });

  Machine.beforeRemote('gameplay', (ctx, unused, next)=>{
    //console.log('ctx.args : ', ctx.args)
    let { machineId, data } = ctx.args;
    let { productId, userId } = data;
    // console.log('data obj :', data)
    let User = app.models.User;
    Machine.findById(machineId, (errMsg, machine)=>{ 
      let ref = firebasedb.ref(`machines/${machineId}`);
      if(machine.currentUserId !== userId){
        User.findById(userId, {include: {relation: 'userIdentities', scope: {limit: 1}}}, (err, user)=>{
          let parsedUser =  JSON.parse(JSON.stringify(user));
          // console.log('USER obj :', parsedUser);
          let player = {
            id: userId,
            name: user.name,
            picture: parsedUser.userIdentities[0].picture.url
          }
          machine.updateAttributes({currentUserId: userId, status: 'playing'}, (er, instance)=>{
            ref.update({status: 'playing', currentPlayer: player}, (error)=>{
              if(error){
                console.log("Firebase : Machine could not be updated." + error);
              }else{
                ref.child('totalNumOfPlay').transaction((current_value)=>{
                  return (current_value + 1);
                  console.log("Firebase : Machine updated successfully.");
                });
              }
            });
          });
          next();
        });
      }else{
        ref.child('totalNumOfPlay').transaction((current_value)=>{
          return (current_value + 1);
        });
        next();      
      }
    });
  });

  Machine.gameplay = (machineId, data, cb) => {
    let { productId, userId } = data;
    // console.log('machineId : ', machineId)
    // console.log('data obj :', data)
    let User = app.models.User;
    let Transaction = app.models.Transaction;
    let Product = app.models.Product;

    // function to look for details of the current product
    Product.findById(productId, (err, product)=>{
      if(!err){
       //  console.log('find product : ', product);
        User.findById(userId, {include: 'wallet'}, (err, user)=>{
          let parsedUser =  JSON.parse(JSON.stringify(user));
          let transacObject = {
            action: 'minus',
            amount: product.gamePlayRate,
            status: 'closed',
            walletId: parsedUser.wallet.id,
            userId: parsedUser.id
          }
          Transaction.create(transacObject, (error, createdTrans)=>{
            if(!error){
              // console.log(createdTrans);
              let result = {
                gameResult : generateResult(product.productRate),
                transactionId: createdTrans.id,
                userId: parsedUser.id,
                productId: product.id
              }
              cb(null, result);
            } else {
              console.log(error);
              cb(error)
            }
          });
        });
      }
    }) //<--- find product function end

    // function to generate a game result
    const generateResult = (productRate) => {
      // random int function
      function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
      } // <--- random int function end

      let int1 = getRandomIntInclusive(1, productRate);
      let int2 = getRandomIntInclusive(1, productRate);
      console.log(int1)
      console.log(int2)
      return (int1 === int2);
    }; // <--- generate result function end

  };

  Machine.remoteMethod(
    'gameplay',
      {
        http: {path: '/:machineId/gameplay', verb: 'post'},
        accepts: [
          {arg: 'machineId', type: 'string', required: true},
          {arg: 'data', type: 'object', required: true}
        ],
        returns: {arg: 'result', type: 'object'}
      }
  );
};
