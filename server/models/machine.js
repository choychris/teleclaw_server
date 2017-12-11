'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { changeFirebaseDb, makeDbTransaction } from '../utils/firebasedb.js';
import { createNewTransaction } from '../utils/makeTransaction.js';

module.exports = function(Machine) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Machine);

  // assgin an id to each newly created model
  assignKey(Machine);

  // assgin last updated time / created time to model
  updateTimeStamp(Machine);

  Machine.observe('before save', (ctx, next)=>{
    if(!ctx.isNewInstance){
      if(ctx.data && ctx.data.status && !ctx.data.productId){
        ctx.hookState.statusChange = true;
      }else if(ctx.data && ctx.data.reservation && !ctx.data.productId){
        ctx.hookState.statusChange = true;
      }
    }
    next();
  });

  Machine.observe('after save', (ctx, next) => {
    if(ctx.isNewInstance){
      let location = `machines/${ctx.instance.id}`;
      let { name, status, display,  } = ctx.instance ;
      let firebaseDataObj = {
        machine_name: name, 
        totalNumOfPlay: 0, 
        totalNumOfSuccess: 0 
      };
      changeFirebaseDb('set', location, firebaseDataObj, 'Machine');
      next();
    } else if (!ctx.isNewInstance){
      let { id, name, status, display, currentUser, productId, reservation } = ctx.instance ;
      let player = currentUser ? currentUser : null;
      if(ctx.hookState && ctx.hookState.statusChange){
        updateProductStatus(productId);
        app.pusher.trigger(`presence-machine-${id}`, 'machine_event', {status: status, numOfReserve: reservation, currentUser: player});
      }
      next();
    } 
  });

  function updateProductStatus(productId){
    let Product = app.models.Product;

    function updateProductStatus(newStatus, productId){
      Product.findById(productId, (err, foundProduct)=>{
        let oldStatus = foundProduct.status
        oldStatus.machineStatus = newStatus
        foundProduct.updateAttributes({status : oldStatus})
      })
    };

    Machine.find({where: {productId: productId, status: 'open'}}, (err, result)=>{
      if(result.length !== 0){
        updateProductStatus(true, productId)
      } else {
        updateProductStatus(false, productId)
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
      let currentUserId = currentUser ? currentUser.id : null ;
      if(currentUserId !== userId){
        User.findById(userId, {include: {relation: 'userIdentities', scope: {limit: 1}}}, (err, user)=>{
          let parsedUser =  JSON.parse(JSON.stringify(user));
          // console.log('USER obj :', parsedUser);
          let picture = parsedUser.userIdentities[0].picture ? parsedUser.userIdentities[0].picture.url : null ;
          let player = {
            id: userId,
            name: user.name,
            picture: picture
          }
          machine.updateAttributes({currentUser: player, status: 'playing'});
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
        createNewTransaction(userId, product.gamePlayRate, 'minus', 'closed')
          .then(createdTrans=>{
            let result = {
              gameResult : generateResult(product.productRate),
              transactionId: createdTrans.id,
              userId: userId,
              productId: product.id,
              newWalletBalance: createdTrans.newWalletBalance
            };
            cb(null, result);
          })
          .catch(error=>{
            cb(error);
          })
        // User.findById(userId, {include: 'wallet'}, (err, user)=>{
        //   let parsedUser =  JSON.parse(JSON.stringify(user));
        //   let transacObject = {
        //     action: 'minus',
        //     amount: product.gamePlayRate,
        //     status: 'closed',
        //     walletId: parsedUser.wallet.id,
        //     userId: parsedUser.id
        //   }
        //   Transaction.create(transacObject, (error, createdTrans)=>{
        //     if(error){
        //       // console.log(createdTrans);
        //       console.log(error);
        //       cb(error)
        //     }
        //     let result = {
        //       gameResult : generateResult(product.productRate),
        //       transactionId: createdTrans.id,
        //       userId: parsedUser.id,
        //       productId: product.id,
        //       newWalletBalance: parsedUser.wallet.balance - createdTrans.amount
        //     }
        //     cb(null, result);
        //   });
        // });
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
