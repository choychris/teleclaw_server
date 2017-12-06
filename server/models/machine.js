'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { changeFirebaseDb, makeDbTransaction } from '../utils/firebasedb.js';

module.exports = function(Machine) {

  var app = require('../server');
  // var firebase = app.firebaseApp;
  // var firebasedb = firebase.database();
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
    if(ctx.isNewInstance){
      let location = `machines/${ctx.instance.id}`;
      let { name, status, display,  } = ctx.instance ;
      let firebaseDataObj = {
        machine_name: name, 
        status: status, 
        display: display, 
        numOfViewer: 0, 
        numOfReserve: 0, 
        totalNumOfPlay: 0, 
        totalNumOfSuccess: 0 
      };
      changeFirebaseDb('set', location, firebaseDataObj, 'Machine');
      app.io.emit('test', firebaseDataObj);
    } else if (!ctx.isNewInstance){
      let location = `machines/${ctx.instance.id}`;
      let { id, name, status, display, currentUser, productId, reservation } = ctx.instance ;
      // if(currentUserId === 'nouser'){
      //   changeFirebaseDb('update', location, {currentPlayer: null}, 'Machine');
      // }
      //asMessagingFunc({type: 'Machine', machineId: id, status: status, numOfReserve: reservation, currentUser: currentUser});
      updateProductStatus(productId);
      // let firebaseDataObj = {
      //   machine_name: name, 
      //   status: status, 
      //   display: display
      // };
      // changeFirebaseDb('update', location, firebaseDataObj, 'Machine');
    } 
    next();
  });

  function updateProductStatus(productId){
    let Product = app.models.Product;

    function updateProductStatus(newStatus, productId){
      Product.findById(productId, (err, foundProduct)=>{
        foundProduct.updateAttributes({'status.machineStatus': newStatus})
      })
    };

    Machine.find({where: {productId: productId, status: 'open'}}, (err, result)=>{
      //let location = `products/${productId}/status`;
      if(result.length !== 0){
        updateProductStatus(true, productId)
        //changeFirebaseDb('update', location, { machineStatus: true }, 'Product');
      } else {
        updateProductStatus(false, productId)
        //changeFirebaseDb('update', location, { machineStatus: false }, 'Product');
      }
    });
  };

  Machine.beforeRemote('gameplay', (ctx, unused, next)=>{
    //console.log('ctx.args : ', ctx.args)
    let { machineId, data } = ctx.args;
    let { productId, userId } = data;
    // console.log('data obj :', data)
    let User = app.models.User;
    Machine.findById(machineId, (errMsg, machine)=>{ 
      let location = `machines/${machineId}`;
      let { currentUser, reservation } = machine;
      if(currentUser.id !== userId){
        User.findById(userId, {include: {relation: 'userIdentities', scope: {limit: 1}}}, (err, user)=>{
          let parsedUser =  JSON.parse(JSON.stringify(user));
          // console.log('USER obj :', parsedUser);
          let player = {
            id: userId,
            name: user.name,
            picture: parsedUser.userIdentities[0].picture.url
          }
          machine.updateAttributes({currentUser: player, status: 'playing'});
          //changeFirebaseDb('update', location, {status: 'playing', currentPlayer: player}, 'Machine');
          makeDbTransaction(location, 'totalNumOfPlay', 'plus');
          next();
        });
      }else{
        makeDbTransaction(location, 'totalNumOfPlay', 'plus');
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
        let location = `products/${productId}`;
        makeDbTransaction(location, 'totalNumOfPlay', 'plus');
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
            if(error){
              // console.log(createdTrans);
              console.log(error);
              cb(error)
            }
            let result = {
              gameResult : generateResult(product.productRate),
              transactionId: createdTrans.id,
              userId: parsedUser.id,
              productId: product.id,
              newWalletBalance: parsedUser.wallet.balance - createdTrans.amount
            }
            cb(null, result);
          });
        });
      }
    }); //<--- find product function end

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
