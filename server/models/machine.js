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
  //   console.log('ctx.args : ', ctx.args)
  //   let { machineId, data } = ctx.args;
  //   let { productId, userId } = data;
  //   // console.log('data obj :', data)
  //   let User = app.models.User;
  //   Machine.findById(machineId, (errMsg, machine)=>{ 
  //     let location = `machines/${machineId}`;
  //     let { currentUser, reservation } = machine;
  //     let currentUserId = currentUser ? currentUser.id : null ;
  //     if(currentUserId !== userId){
  //       User.findById(userId, {include: {relation: 'userIdentities', scope: {limit: 1}}}, (err, user)=>{
  //         let parsedUser =  JSON.parse(JSON.stringify(user));
  //         // console.log('USER obj :', parsedUser);
  //         let picture = parsedUser.userIdentities[0].picture ? parsedUser.userIdentities[0].picture.url : null ;
  //         let player = {
  //           id: userId,
  //           name: user.name,
  //           picture: picture
  //         }
  //         machine.updateAttributes({currentUser: player, status: 'playing'});
  //         makeDbTransaction(location, 'totalNumOfPlay', 'plus');
  //         next();
  //       });
  //     }else{
  //       makeDbTransaction(location, 'totalNumOfPlay', 'plus');
  //       next();      
  //     }
  //   });
  // });

  Machine.beforeRemote('gameplay', (ctx, unused, next)=>{
    console.log('|=========== Game Play Start =============|')
    next();
  })



  Machine.gameplay = (machineId, data, cb) => {
    let { productId, userId } = data;
    let Product = app.models.product;
    let Play = app.models.play;
    let User = app.models.user;

    // POST gizwits API to login customer and bind device MAC
    function gizwitsConfigs(userId, deviceMAC, deviceId){
      // user authenicate API
      const createUser = {
        method: 'POST',
        url: 'http://api.gizwits.com/app/users',
        headers: {
          'X-Gizwits-Application-Id': GIZWITS_APPLICATION_ID
        },
        body: JSON.stringify({
          phone_id: userId
        })
      };
      // first, login the user to get token
      return new Promise((resolve, reject)=>{
        request(createUser, (err, res, body)=>{
          const { token, uid, expire_at } = JSON.parse(body);
          User.find({where: {id: userId, bindedDevice: deviceId}}, (error, user)=>{
            if(err||error){ reject(err||error)}
            if(user.length === 0){ 
              bindMac(deviceMAC, token) 
              User.update({ id: userId },{ $push: { "bindedDevice": deviceId }}, { allowExtendedOperators: true })
            }
            resolve({token: token, appId: GIZWITS_APPLICATION_ID, did: deviceId})
          })
        });
      })
    }

    function bindMac(deviceMAC, token){
      const now = Math.round(new Date().getTime()/1000);
      // bind mac API 
      const bindMac = {
        method: 'POST',
        url: 'http://api.gizwits.com/app/bind_mac',
        headers: {
          'X-Gizwits-Application-Id': GIZWITS_APPLICATION_ID,
          'X-Gizwits-Timestamp': now,
          'X-Gizwits-Signature': md5(GIZWITS_PRODUCT_SECRET+now),
          'X-Gizwits-User-token': token
        },
        body: JSON.stringify({
          product_key: GIZWITS_PRODUCT_KEY,
          mac: deviceMAC
        })
      }
      request(bindMac, (err, res, bindBody)=>{
        if(err){
          Promise.reject(err)
        };
      });
    }

    //start game function
    function startGame(userId, machineId, productId, gamePlayRate, initialize, deviceMAC, deviceId){
      let location = `products/${productId}`;
      makeDbTransaction(location, 'totalNumOfPlay', 'plus');
      // perform : 1. communicate to gizwits ; 2. create a new transation 
      Promise.all([gizwitsConfigs(userId, deviceMAC, deviceId), createNewTransaction(userId, gamePlayRate, 'minus', 'closed')])
      .then(result=>{
          let transactionId = result[1].id;
          let expectedResult = initialize.result;
          response = {
            InitCatcher : initialize.initCatcher,
            newWalletBalance: result[1].newWalletBalance,
            gizwits: result[0],
            afterRemote: {
              transactionId,
              userId,
              machineId,
              productId
            }
          };
          return Play.create({userId, machineId, productId, transactionId, expectedResult})
      }).then(res=>{
        response.afterRemote.playId = res.id;
        cb(null, response);
      }).catch(error=>{
        cb(error)
      });
    }
    let response = {};
    // perform : 1. get user; 2. get machine; 3. get produdct, from database
    Promise.all([findUserInclude(userId, 'wallet'), Machine.findById(machineId), Product.findById(productId)])
      .then(data=>{
        let walletBalance = data[0].wallet.balance;
        let { status, currentUser, iotPlatform } = data[1];
        let { deviceMAC, deviceId, init } = iotPlatform.gizwits;
        let { gamePlayRate, productRate } = data[2];
        // check same user holding the machine
        let sameUser = !currentUser ? false : (currentUser.userId === userId);
        //check machine is open 
        if(status === 'open' && !currentUser){
          //check enough coins to play
          if(walletBalance >= gamePlayRate){
            let initialize = initializeResult(productRate, init);
            startGame(userId, machineId, productId, gamePlayRate, initialize, deviceMAC, deviceId); 
          //not enough balance
          }else{
            cb(null, 'insufficient balance')
          }
        //machine is open but waiting user response
        }else if(status === 'open' && sameUser){
          //check enough coins to play
          if(walletBalance >= gamePlayRate){
            let initialize = initializeResult(productRate, init);
            startGame(userId, machineId, productId, gamePlayRate, initialize, deviceMAC, deviceId); 
          //not enough balance
          }else{
            cb(null, 'insufficient balance')
          }
        // machine is in 'playing status'
        }else{
          cb(null, 'machine is playing')
        }
        return null
      })
      .catch(error=>{
        cb(error)
      })

    // function to generate a game result
    const initializeResult = (productRate, InitCatcher) => {
      // random int function
      function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
      } // <--- random int function end

      let int1 = getRandomIntInclusive(1, productRate);
      let int2 = getRandomIntInclusive(1, productRate);
      let initCatcher = (int1 === int2) ? (InitCatcher+'101') : (InitCatcher+'001');
      let result = (int1 === int2);
      let expectedResult = {
        initCatcher: initCatcher,
        result: result
      }
      return expectedResult;
    }; // <--- generate result function end

  };// <--- machine gamePlay remote method end

  //update play in DB
  function updatePlay(playId, persistData){
    let Play = app.models.play;
    return new Promise ((resolve, reject)=>{
      Play.findById(playId, (err, instance)=>{
        instance.updateAttributes(persistData, (error, play)=>{
          if(err || error){reject(err || error)}
          resolve(play);
        })
      });
    })
  }

  //update machine in DB
  function updateMachine(machineId, persistData){
    return new Promise ((resolve, reject)=>{
      Machine.findById(playId, (err, instance)=>{
        instance.updateAttributes(persistData, (error, machine)=>{
          if(err || error){reject(err || error)}
          resolve(machine);
        })
      });
    })
  }

  // find the user include relations
  function findUserInclude(userId, include){
    let User = app.models.User;
    return new Promise((resolve, reject)=>{
      User.findById(userId, {include: include},(err, user)=>{
        if(err){
          reject(err);
        }
        let parsedUser = user.toJSON();
        resolve(parsedUser);
      });
    });
  }

  //find User with deviceId
  function findUserDeviceId(userId, did){
    User.find({where: {id: userId, bindedDevice: {elemMatch: did}}})
  }
  
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
