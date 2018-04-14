'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel, loggingFunction, loggingRemote } from '../utils/createLogging.js';
import { createNewTransaction } from '../utils/makeTransaction.js';
import { sendEmail } from '../utils/nodeMailer.js'
const request = require('request');
const Promise = require('bluebird');
const md5 = require('md5');

let { GIZWITS_APPLICATION_ID, GIZWITS_PRODUCT_SECRET, GIZWITS_PRODUCT_KEY } = process.env;

module.exports = function(Machine) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Machine);
  //loggingRemote(Machine, 'gamePlay')

  // assgin an id to each newly created model
  assignKey(Machine);

  // assgin last updated time / created time to model
  updateTimeStamp(Machine);

  Machine.observe('before save', (ctx, next)=>{
    if(!ctx.isNewInstance){
      if(ctx.data){
        let { status, sku, reservation, productId, iotPlatform } = ctx.data;
        let oldStatus = ctx.currentInstance.status;
        //if machine's status if updated
        if(!!status && !reservation && !productId){
          //look for reservation if the machine go online from offline again
          if(status == 'open' && oldStatus == 'close'){
            ctx.hookState.resume = true
          }
          ctx.hookState.pusher = true;
          ctx.hookState.lastStatusChanged = true;
          ctx.data.lastStatusChanged = new Date().getTime();
          
        // if machine's reservation is updated
        }else if(!!reservation && !productId){
          ctx.hookState.pusher = true;
        }else if(sku <= 0){
          // disable machine is sku == 0;
          ctx.hookState.pusher = true;
          ctx.data.status = 'close';
          ctx.data.currentUser = null;
        }else if(sku <= 3){
          // send email noti if sku <= 3;
          let { Email } = app.models;
          let { id, name } = ctx.currentInstance;
          let subject = `Machine ${name} sku is below threhold`;
          let html = `<h3>Machine name : ${name}</h3>
              <p>Machine id: ${id}</p>
              <p>Product id: ${ctx.currentInstance.productId}</p>
              <p>This machine sku is now at <strong><em>${sku}</em></strong></p>
              <p>Please refill or restock</p>`
          sendEmail(subject, html);
        };
      }//<--- if machine is updated
      next();
    }else{
      if(!ctx.instance.iotPlatform){
        ctx.instance.iotPlatform = { gizwits:{} }
      }
      ctx.instance.currentUser = null;
      next();
    }
  });

  Machine.observe('after save', (ctx, next) => {
    if(!ctx.isNewInstance){
      let { id, name, status, sku, currentUser, productId, reservation } = ctx.instance ;
      let player = currentUser ? currentUser : null;
      if(ctx.hookState && ctx.hookState.pusher){
        //look for reservation if the machine go online from offline again
        if(ctx.hookState.resume === true){
          let Reservation = app.models.Reservation
          Reservation.endEngage(id, 'null', null);
        }
        app.pusher.trigger(`presence-machine-${id}`, 'machine_event', {status: status, reservation: reservation, currentUser: player, lastUpdated: new Date().getTime()});
      }

      if(ctx.hookState && ctx.hookState.lastStatusChanged){
        checkAllMachines(productId);
      }
      next();
    }else{
      next();
    } 
  });

  // function to check whether all machine not available
  function checkAllMachines(productId){
    let Product = app.models.Product;
    function updateProductStatus(newMachineStatus, productId){
      Product.findById(productId, (err, foundProduct)=>{
        let oldStatus = foundProduct.status
        if(newMachineStatus){
          oldStatus.machineStatus = newMachineStatus
          oldStatus.maintainStatus = false;
        }else{
          oldStatus.machineStatus = newMachineStatus
        }
        foundProduct.updateAttributes({status : oldStatus})
      })
    };

    Machine.find({where: {productId: productId, status: 'open', currentUser: null}}, (err, result)=>{
      if(result.length !== 0){
        updateProductStatus(true, productId)
      } else {
        updateProductStatus(false, productId)
      }
    });
  };

  // Machine.beforeRemote('gamePlay', (ctx, unused, next)=>{
  //   console.log('|=========== Game Play Start =============|')
  //   next();
  // })

  // machine game play remote method
  Machine.gamePlay = (httpReq, machineId, data, cb) => {
    httpReq.setTimeout(1000*240);
    let { productId, userId } = data;
    let Product = app.models.Product;
    let Play = app.models.Play;
    let User = app.models.User;

    let loggingInfo = {
      userId,
      machineId,
      productId,
      timeStamp: new Date()
    }
    loggingFunction('Machine | ', 'gamePlay Remote | ', JSON.stringify(loggingInfo), 'info');
    let response = {};
    // perform : 1. get user; 2. get machine; 3. get produdct, from database
    Promise.all([findUserInclude(userId, 'wallet'), Machine.findById(machineId), Product.findById(productId)])
      .then(data=>{
        let walletBalance = data[0].wallet.balance;
        let { status, currentUser, iotPlatform } = data[1];
        let { init } = iotPlatform.gizwits;
        let { gamePlayRate, productRate } = data[2];
        // check same user holding the machine
        let sameUser = !currentUser ? false : (currentUser.id == userId);
        //check machine is open 
        if(status === 'open' && !currentUser){
          //check enough coins to play
          if(walletBalance >= gamePlayRate){
            let initialize = initializeResult(productRate, init);
            // console.log('initialize : ', initialize);
            startGame(userId, machineId, productId, gamePlayRate, initialize, iotPlatform.gizwits);
            updateCurrentUser(userId, machineId)
          //not enough balance
          }else{
            cb(null, 'insufficient balance')
          }
        //machine is open but waiting user response
        }else if(status !== 'close' && sameUser){
          //check enough coins to play
          if(walletBalance >= gamePlayRate){
            let initialize = initializeResult(productRate, init);
            startGame(userId, machineId, productId, gamePlayRate, initialize, iotPlatform.gizwits);
            if(!currentUser.name){
              updateCurrentUser(userId, machineId)
            }else{
              updateMachineAttri(machineId, {status: 'playing'})
            }
          //not enough balance
          }else{
            cb(null, 'insufficient_balance')
          }
        // machine is in 'playing status'
        }else if(status !== 'close'){
          makeReserve(userId, machineId, productId).then(res=>{
            cb(null, {reservation: res})
            return null
          })
        }else{
          cb(null, 'machine_closed')
        }
        return null
      })
      .catch(error=>{
        loggingFunction('Machine | ', 'initialize game play error | ', error, 'error');
        cb(error)
      })//<--- checking for game play promise end

    //start game function
    function startGame(userId, machineId, productId, gamePlayRate, initialize, gizwits){
      let { deviceMAC, deviceId, heartbeat_interval } = gizwits;
      // perform : 1. communicate to gizwits ; 2. create a new transation 
      Promise.all([gizwitsConfigs(userId, machineId, deviceMAC, deviceId), createNewTransaction(userId, gamePlayRate, 'play', 'minus', true)])
      .then(result=>{
          let transactionId = result[1].id;
          let expectedResult = initialize.result;
          response = {
            newWalletBalance: result[1].newWalletBalance,
            gizwits: result[0],
            userId: userId
          };
          response.gizwits.control.InitCatcher = initialize.initCatcher;
          response.gizwits.init.heartbeat_interval = heartbeat_interval;
          // then create a new persited Play obj
          return Play.create({userId, machineId, productId, transactionId, expectedResult})
      }).then(res=>{
        response.playId = res.id;
        cb(null, response);
      }).catch(error=>{
        
        loggingFunction('Machine | ', 'start game function error | ', error, 'error');
        createNewTransaction(userId, gamePlayRate, 'refund', 'plus', true)
        .then(refundRes=>{
          return Play.create({userId, machineId, productId, transactionId: refundRes.id, expectedResult: false})
        }).then(playRes=>{
          cb(null, {playId: playRes.id, gizwits: "no response"})
        })
        
      });
    }//<--- start game function end

    // POST gizwits API to login customer and bind device MAC
    function gizwitsConfigs(userId, machineId, deviceMAC, deviceId){
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
          User.find({where: {id: userId, bindedDevice: deviceId}}, (error, user)=>{
            if(err || error || !body){ 
              loggingFunction('Machine | ', 'login gizwits user error | ', err || error, 'error');
              reject(err || error || Error("no response from gizwits"));
            };
            const { token, uid, expire_at } = JSON.parse(body);
            // check whether the user has already bind this machine
            let gizwits = {
              init: {
                appid: GIZWITS_APPLICATION_ID, 
                uid: uid, 
                token: token, 
                p0_type: "attrs_v4", 
                auto_subscribe: false
              }, 
              control: {
                did: deviceId
              }
            };
            if(user.length === 0){ 
              bindMac(deviceMAC, token, machineId, gizwits, resolve, reject) 
              User.update({ id: userId },{ $push: { "bindedDevice": deviceId }}, { allowExtendedOperators: true })
            }else{
              resolve(gizwits);
            }
            
          })//<--- find user end
        });//<--- request end
      })//<--- promise end
    };

    // bind mac API to gizwits
    function bindMac(deviceMAC, token, machineId, gizwits, resolve, reject){
      const now = Math.round(new Date().getTime()/1000);
      // bind mac API to gizwits
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
      };
      request(bindMac, (err, res, bindBody)=>{
        if(err || !bindBody){
          loggingFunction('Machine | ', 'gizwits bind mac error | ', err, 'error');
          reject(err || Error("no response from gizwits"))
        } else {
          const { host, wss_port } = JSON.parse(bindBody);
          let update =  {'iotPlatform.gizwits.host': host, 'iotPlatform.gizwits.wss_port': wss_port};
          updateMachineAttri(machineId, update);
          gizwits.websocket = {host: host, wss_port: wss_port};
          resolve(gizwits);
        }
      });
    }//<--- bind mac API function end

    // function to generate a game result
    const initializeResult = (productRate, InitCatcher) => {
      // random int function
      // console.log('productRate : ', productRate);
      function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
      } //<--- random int function end

      let int1 = getRandomIntInclusive(1, productRate);
      let int2 = getRandomIntInclusive(1, productRate);
      let initCatcher = (int1 === int2) ? InitCatcher.concat([1,1]) : InitCatcher.concat([0,1]);
      let result = (int1 === int2);
      // console.log('int1 :: ', int1 )
      // console.log('int2 :: ', int2 )
      let expectedResult = {
        initCatcher: initCatcher,
        result: result
      }
      return expectedResult;
    }; //<--- generate result function end

  };//<--- machine gamePlay remote method end

  // find the user include relations
  function findUserInclude(userId, include){
    let User = app.models.User;
    return new Promise((resolve, reject)=>{
      User.findById(userId, {include: include},(err, user)=>{
        if(err){
          loggingFunction('Machine | ', 'findUserInclude error | ', err, 'error');
          reject(err);
        }
        let parsedUser = user.toJSON();
        resolve(parsedUser);
      });
    });
  };

  //find user identity to update machine status
  function updateCurrentUser(userId, machineId){
    findUserInclude(userId, {relation: 'userIdentities', scope: {limit: 1}})
      .then(parsedUser=>{
          //console.log('USER obj :', parsedUser);
          let dummyUrl = "https://scontent.xx.fbcdn.net/v/t1.0-1/c15.0.50.50/p50x50/10354686_10150004552801856_220367501106153455_n.jpg?_nc_cat=0&oh=3f6c91428fc256182541f697d6bb84d3&oe=5B3B0A2F";
          let picture = parsedUser.userIdentities[0].picture ? parsedUser.userIdentities[0].picture.url : dummyUrl ;
          let player = {
            id: userId,
            name: parsedUser.name,
            picture: picture
          }
        updateMachineAttri(machineId, {status: 'playing', currentUser: player})
        return null
      }).catch(err=>{
        loggingFunction('Machine | ', 'updateCurrentUser error | ', err, 'error');
      })
  };

  // update Machine attributies function
  function updateMachineAttri(machineId, updateObj){
    Machine.findById(machineId, (err, instance)=>{
      instance.updateAttributes(updateObj);
    })
  };

  //make a reservation of user
  function makeReserve(userId, machineId, productId){
    let Reservation = app.models.Reservation;
    return new Promise((resolve, reject)=>{
      Reservation.findOne({where: {userId: userId}}, (err, instance)=>{
        instance.updateAttributes({status: 'open', machineId: machineId, productId: productId}, (error, updatedReserve)=>{
          if(err || error){
            loggingFunction('Machine | ', 'makeReserve error | ', err || error, 'error');
            reject(err || error);
          };
          let { id, status, machineId, productId, lastUpdated } = updatedReserve;
          let resObj = {
            id: id,
            status: status,
            machineId: machineId,
            productId: productId,
            lastUpdated: lastUpdated
          };
          resolve(resObj)
        })
      })
    });
  };

  Machine.afterRemote('gamePlay', (ctx, unused, next)=>{
    // console.log('|=========== Game Play End =============|')
    // console.log(ctx.result.result)

    //if the user is able to start a game play;
    if(ctx.result.result.gizwits !== undefined){
      let { Play, Transaction } = app.models;
      let { userId, playId } = ctx.result.result;
      //let { transactionId, userId, machineId, productId, playId } = afterRemote;
      
      // check the result after 47s
      setTimeout(()=>{checkPlayResult(playId)}, 62000)

      //check if the result is updated manually
      function checkPlayResult(playId){
        //console.log('check play result trigger HERE')
        Play.findById(playId, (err, instance)=>{
          //console.log('final play instance : ', instance);
          if(instance.finalResult === undefined){
            let attri = {ended: new Date().getTime(), finalResult: false, systemUpdate: true};
            instance.updateAttributes(attri);
            Transaction.findById(instance.transactionId)
            .then(trans=>{
              createNewTransaction(userId, trans.amount, 'refund', 'plus', true)
            })
          }
        });
      };
      next();
    }else{
      next();
    }
  });

  Machine.remoteMethod(
    'gamePlay',
      {
        http: {path: '/:machineId/gamePlay', verb: 'post'},
        accepts: [
          {arg: "req", type: "object", http: {source: "req"}},
          {arg: 'machineId', type: 'string', required: true},
          {arg: 'data', type: 'object', required: true}
        ],
        returns: {arg: 'result', type: 'object'}
      }
  );
  
};
