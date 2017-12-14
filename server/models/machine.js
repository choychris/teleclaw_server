'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { changeFirebaseDb, makeDbTransaction } from '../utils/firebasedb.js';
import { createNewTransaction } from '../utils/makeTransaction.js';
const request = require('request');
const Promise = require('bluebird');
const md5 = require('md5');

let { GIZWITS_APPLICATION_ID, GIZWITS_PRODUCT_SECRET, GIZWITS_PRODUCT_KEY } = process.env;

module.exports = function(Machine) {

  var app = require('../server');
  //make loggings for monitor purpose
  //loggingModel(Machine);

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
        app.pusher.trigger(`presence-machine-${id}`, 'machine_event', {status: status, reservation: reservation, currentUser: player, time: new Date()});
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

  // Machine.beforeRemote('gameplay', (ctx, unused, next)=>{
    //console.log('ctx.args : ', ctx.args)
    // let { machineId, data } = ctx.args;
    // let { productId, userId } = data;
    // // console.log('data obj :', data)
    // let User = app.models.User;
    // Machine.findById(machineId, (errMsg, machine)=>{ 
    //   let location = `machines/${machineId}`;
    //   let { currentUser, reservation } = machine;
    //   let currentUserId = currentUser ? currentUser.id : null ;
    //   if(currentUserId !== userId){
    //     User.findById(userId, {include: {relation: 'userIdentities', scope: {limit: 1}}}, (err, user)=>{
    //       let parsedUser =  JSON.parse(JSON.stringify(user));
    //       // console.log('USER obj :', parsedUser);
    //       let picture = parsedUser.userIdentities[0].picture ? parsedUser.userIdentities[0].picture.url : null ;
    //       let player = {
    //         id: userId,
    //         name: user.name,
    //         picture: picture
    //       }
    //       machine.updateAttributes({currentUser: player, status: 'playing'});
    //       makeDbTransaction(location, 'totalNumOfPlay', 'plus');
    //       next();
    //     });
    //   }else{
    //     makeDbTransaction(location, 'totalNumOfPlay', 'plus');
    //     next();      
    //   }
    // });
  // });

  Machine.beforeRemote('gameplay', (ctx, unused, next)=>{
    console.log('|=========== Game Play Start =============|')
    next();
  })



  Machine.gameplay = (machineId, data, cb) => {
    let { productId, userId } = data;
    // console.log('machineId : ', machineId)
    // console.log('data obj :', data)
    let User = app.models.User;
    let Transaction = app.models.Transaction;
    let Product = app.models.Product;

    function gizwitsConfigs(userId, deviceMAC){
      const createUser = {
        method: 'POST',
        url: 'http://api.gizwits.com/app/users',
        headers: {
          'X-Gizwits-Application-Id': GIZWITS_APPLICATION_ID
        },
        body: JSON.stringify({
          phone_id: userId
        })
      }
      const now = Math.round(new Date().getTime()/1000);
      const bindMac = {
        method: 'POST',
        url: 'http://api.gizwits.com/app/bind_mac',
        headers: {
          'X-Gizwits-Application-Id': GIZWITS_APPLICATION_ID,
          'X-Gizwits-Timestamp': now,
          'X-Gizwits-Signature': md5(GIZWITS_PRODUCT_SECRET+now)
        },
        body: JSON.stringify({
          product_key: GIZWITS_PRODUCT_KEY,
          mac: deviceMAC
        })
      }
      return new Promise((resolve, reject)=>{
        request(createUser, (err, res, body)=>{
          const { token, uid, expire_at } = JSON.parse(body);
          bindMac.headers['X-Gizwits-User-token'] = token ;
          request(bindMac, (err, res, bindBody)=>{
            if(err){
              reject(err)
            };
            let { wss_port, did, host } = JSON.parse(bindBody);
            let configs = {
              appid: GIZWITS_APPLICATION_ID,
              uid: uid,
              token: token,
              did: did,
              wss_port: wss_port,
              host: host
            }
            resolve(configs)
            return configs;
          });
        });
      });
    }

    function checkWallet(userId){
      return new Promise ((resolve, reject)=>{
        User.findById(userId, {include: 'wallet'}, (err, user)=>{
          if(err){
            reject(err);
            return err;
          }
          let parsedUser =  JSON.parse(JSON.stringify(user));
          let walletBalance = parsedUser.wallet.balance;
          resolve(walletBalance)
          return walletBalance;
        });
      });
    }

    function checkMachineStatus(machineId){
      return new Promise ((resolve, reject)=>{
        Machine.findById(machineId, (err, machine)=>{
          if(err){
            reject(err);
            return err;
          }
          let machineInfo = {
            status: machine.status,
            currentUser: machine.currentUser,
            gizwits: machine.iotPlatform.gizwits
          }
          resolve(machineInfo)
          return machineInfo;
        });
      });
    }

    function checkProductRate(productId){
      return new Promise ((resolve, reject)=>{
        Product.findById(productId, (err, product)=>{
          if(err){
            reject(err);
            return err;
          }
          let rate = {
            gamePlayRate: product.gamePlayRate,
            productRate: product.productRate
          }
          resolve(rate)
          return rate;
        });
      });
    }

    //start game function
    function startGame(userId, productId, gamePlayRate, generatedResult, deviceMAC){
      let location = `products/${productId}`;
      makeDbTransaction(location, 'totalNumOfPlay', 'plus');
      // create transaction and gamePlay callback
      Promise.all(gizwitsConfigs(userId, deviceMAC), createNewTransaction(userId, gamePlayRate, 'minus', 'closed'))
      .then(result=>{
          let info = {
            gameResult : generatedResult,
            transactionId: result[1].id,
            userId: userId,
            productId: productId,
            newWalletBalance: result[1].newWalletBalance,
            
          };
      })
      createNewTransaction(userId, gamePlayRate, 'minus', 'closed')
        .then(createdTrans=>{
          let result = {
            gameResult : generatedResult,
            transactionId: createdTrans.id,
            userId: userId,
            productId: productId,
            newWalletBalance: createdTrans.newWalletBalance
          };
          cb(null, result);
        })
        .catch(error=>{
          cb(error);
        })
    }

    Promise.all([checkWallet(userId), checkMachineStatus(machineId), checkProductRate(productId)])
      .then(data=>{
        let walletBalance = data[0];
        let { status, currentUser, gizwits } = data[1];
        let { gamePlayRate, productRate } = data[2];
        //check machine is open 
        if(status === 'open' && !currentUser ){
          //check enough coins to play
          if(walletBalance >= gamePlayRate){
            let generatedResult = generateResult(productRate);
            startGame(userId, productId, gamePlayRate, generatedResult, gizwits.deviceMAC); 
          //not enough balance
          }else{
            cb(null, 'insufficient balance')
          }

        }
      })
      .catch(error=>{
        cb(error)
      })

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

  Machine.afterRemote('gameplay', (ctx, unused, next)=>{
    console.log('|=========== Game Play End =============|')
    next();
  })

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
