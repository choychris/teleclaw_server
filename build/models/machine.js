'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var _makeTransaction = require('../utils/makeTransaction.js');

var request = require('request');
var Promise = require('bluebird');
var md5 = require('md5');

var _process$env = process.env,
    GIZWITS_APPLICATION_ID = _process$env.GIZWITS_APPLICATION_ID,
    GIZWITS_PRODUCT_SECRET = _process$env.GIZWITS_PRODUCT_SECRET,
    GIZWITS_PRODUCT_KEY = _process$env.GIZWITS_PRODUCT_KEY;


module.exports = function (Machine) {

  var app = require('../server');
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Machine);

  // assgin an id to each newly created model
  (0, _beforeSave.assignKey)(Machine);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Machine);

  Machine.observe('before save', function (ctx, next) {
    if (!ctx.isNewInstance) {
      if (ctx.data) {
        var _ctx$data = ctx.data,
            status = _ctx$data.status,
            sku = _ctx$data.sku,
            reservation = _ctx$data.reservation,
            productId = _ctx$data.productId,
            iotPlatform = _ctx$data.iotPlatform;

        if (!!status && !reservation && !productId) {
          ctx.hookState.pusher = true;
          ctx.data.lastStatusChanged = new Date().getTime();
        } else if (!!reservation && !productId) {
          ctx.hookState.pusher = true;
        } else if (sku == 0) {
          ctx.hookState.pusher = true;
          ctx.data.status = 'close';
        }
      }
      next();
    } else {
      if (!ctx.instance.iotPlatform) {
        ctx.instance.iotPlatform = { gizwits: {} };
      }
      next();
    }
  });

  Machine.observe('after save', function (ctx, next) {
    if (!ctx.isNewInstance) {
      var _ctx$instance = ctx.instance,
          id = _ctx$instance.id,
          name = _ctx$instance.name,
          status = _ctx$instance.status,
          sku = _ctx$instance.sku,
          currentUser = _ctx$instance.currentUser,
          productId = _ctx$instance.productId,
          reservation = _ctx$instance.reservation;

      var player = currentUser ? currentUser : null;
      if (ctx.hookState && ctx.hookState.pusher) {
        updateProductStatus(productId);
        app.pusher.trigger('presence-machine-' + id, 'machine_event', { status: status, reservation: reservation, currentUser: player, lastUpdated: new Date().getTime() });
      }
    }
    next();
  });

  // function to check whether all machine not available
  function updateProductStatus(productId) {
    var Product = app.models.Product;
    function updateProductStatus(newStatus, productId) {
      Product.findById(productId, function (err, foundProduct) {
        var oldStatus = foundProduct.status;
        oldStatus.machineStatus = newStatus;
        foundProduct.updateAttributes({ status: oldStatus });
      });
    };

    Machine.find({ where: { productId: productId, status: 'open', currentUser: null } }, function (err, result) {
      if (result.length !== 0) {
        updateProductStatus(true, productId);
      } else {
        updateProductStatus(false, productId);
      }
    });
  };

  Machine.beforeRemote('gamePlay', function (ctx, unused, next) {
    console.log('|=========== Game Play Start =============|');
    next();
  });

  // machine game play remote method
  Machine.gamePlay = function (machineId, data, cb) {
    var productId = data.productId,
        userId = data.userId;

    var Product = app.models.Product;
    var Play = app.models.Play;
    var User = app.models.User;

    var response = {};
    // perform : 1. get user; 2. get machine; 3. get produdct, from database
    Promise.all([findUserInclude(userId, 'wallet'), Machine.findById(machineId), Product.findById(productId)]).then(function (data) {
      var walletBalance = data[0].wallet.balance;
      var _data$ = data[1],
          status = _data$.status,
          currentUser = _data$.currentUser,
          iotPlatform = _data$.iotPlatform;
      var init = iotPlatform.gizwits.init;
      var _data$2 = data[2],
          gamePlayRate = _data$2.gamePlayRate,
          productRate = _data$2.productRate;
      // check same user holding the machine

      var sameUser = !currentUser ? false : currentUser.id == userId;
      //check machine is open 
      if (status === 'open' && !currentUser) {
        //check enough coins to play
        if (walletBalance >= gamePlayRate) {
          var initialize = initializeResult(productRate, init);
          // console.log('initialize : ', initialize);
          startGame(userId, machineId, productId, gamePlayRate, initialize, iotPlatform.gizwits);
          updateCurrentUser(userId, machineId);
          //not enough balance
        } else {
          cb(null, 'insufficient balance');
        }
        //machine is open but waiting user response
      } else if (status !== 'close' && sameUser) {
        //check enough coins to play
        if (walletBalance >= gamePlayRate) {
          var _initialize = initializeResult(productRate, init);
          startGame(userId, machineId, productId, gamePlayRate, _initialize, iotPlatform.gizwits);
          if (!currentUser.name) {
            updateCurrentUser(userId, machineId);
          } else {
            updateMachineAttri(machineId, { status: 'playing' });
          }
          //not enough balance
        } else {
          cb(null, 'insufficient_balance');
        }
        // machine is in 'playing status'
      } else if (status !== 'close') {
        makeReserve(userId, machineId, productId).then(function (res) {
          cb(null, { reservation: res });
          return null;
        });
      } else {
        cb(null, 'machine_closed');
      }
      return null;
    }).catch(function (error) {
      cb(error);
    });

    //start game function
    function startGame(userId, machineId, productId, gamePlayRate, initialize, gizwits) {
      var deviceMAC = gizwits.deviceMAC,
          deviceId = gizwits.deviceId,
          heartbeat_interval = gizwits.heartbeat_interval;
      // perform : 1. communicate to gizwits ; 2. create a new transation 

      Promise.all([gizwitsConfigs(userId, machineId, deviceMAC, deviceId), (0, _makeTransaction.createNewTransaction)(userId, gamePlayRate, 'play', 'minus', true)]).then(function (result) {
        var transactionId = result[1].id;
        var expectedResult = initialize.result;
        response = {
          newWalletBalance: result[1].newWalletBalance,
          gizwits: result[0],
          userId: userId
        };
        response.gizwits.control.InitCatcher = initialize.initCatcher;
        response.gizwits.init.heartbeat_interval = heartbeat_interval;
        // then create a new persited Play obj
        return Play.create({ userId: userId, machineId: machineId, productId: productId, transactionId: transactionId, expectedResult: expectedResult });
      }).then(function (res) {
        response.playId = res.id;
        cb(null, response);
      }).catch(function (error) {
        cb(error);
      });
    } //<--- start game function end

    // POST gizwits API to login customer and bind device MAC
    function gizwitsConfigs(userId, machineId, deviceMAC, deviceId) {
      // user authenicate API
      var createUser = {
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
      return new Promise(function (resolve, reject) {
        request(createUser, function (err, res, body) {
          var _JSON$parse = JSON.parse(body),
              token = _JSON$parse.token,
              uid = _JSON$parse.uid,
              expire_at = _JSON$parse.expire_at;

          User.find({ where: { id: userId, bindedDevice: deviceId } }, function (error, user) {
            if (err || error) {
              reject(err || error);
            }
            // check whether the user has already bind this machine
            var gizwits = {
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
            if (user.length === 0) {
              bindMac(deviceMAC, token, machineId, gizwits, resolve);
              User.update({ id: userId }, { $push: { "bindedDevice": deviceId } }, { allowExtendedOperators: true });
            } else {
              resolve(gizwits);
            }
          }); //<--- find user end
        }); //<--- request end
      }); //<--- promise end
    }

    // bind mac API to gizwits
    function bindMac(deviceMAC, token, machineId, gizwits, resolve) {
      var now = Math.round(new Date().getTime() / 1000);
      // bind mac API to gizwits
      var bindMac = {
        method: 'POST',
        url: 'http://api.gizwits.com/app/bind_mac',
        headers: {
          'X-Gizwits-Application-Id': GIZWITS_APPLICATION_ID,
          'X-Gizwits-Timestamp': now,
          'X-Gizwits-Signature': md5(GIZWITS_PRODUCT_SECRET + now),
          'X-Gizwits-User-token': token
        },
        body: JSON.stringify({
          product_key: GIZWITS_PRODUCT_KEY,
          mac: deviceMAC
        })
      };
      request(bindMac, function (err, res, bindBody) {
        var _JSON$parse2 = JSON.parse(bindBody),
            host = _JSON$parse2.host,
            wss_port = _JSON$parse2.wss_port;

        if (err) {
          Promise.reject(err);
        };
        var update = { 'iotPlatform.gizwits.host': host, 'iotPlatform.gizwits.wss_port': wss_port };
        updateMachineAttri(machineId, update);
        gizwits.websocket = { host: host, wss_port: wss_port };
        resolve(gizwits);
      });
    } //<--- bind mac API function end

    // function to generate a game result
    var initializeResult = function initializeResult(productRate, InitCatcher) {
      // random int function
      // console.log('productRate : ', productRate);
      function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
      } //<--- random int function end

      var int1 = getRandomIntInclusive(1, productRate);
      var int2 = getRandomIntInclusive(1, productRate);
      var initCatcher = int1 === int2 ? InitCatcher.concat([1, 1]) : InitCatcher.concat([0, 1]);
      var result = int1 === int2;
      // console.log('int1 :: ', int1 )
      // console.log('int2 :: ', int2 )
      var expectedResult = {
        initCatcher: initCatcher,
        result: result
      };
      return expectedResult;
    }; //<--- generate result function end
  }; //<--- machine gamePlay remote method end

  // find the user include relations
  function findUserInclude(userId, include) {
    var User = app.models.User;
    return new Promise(function (resolve, reject) {
      User.findById(userId, { include: include }, function (err, user) {
        if (err) {
          reject(err);
        }
        var parsedUser = user.toJSON();
        resolve(parsedUser);
      });
    });
  }

  //find user identity to update machine status
  function updateCurrentUser(userId, machineId) {
    findUserInclude(userId, { relation: 'userIdentities', scope: { limit: 1 } }).then(function (parsedUser) {
      // console.log('USER obj :', parsedUser);
      var picture = parsedUser.userIdentities[0].picture ? parsedUser.userIdentities[0].picture.url : null;
      var player = {
        id: userId,
        name: parsedUser.name,
        picture: picture
      };
      updateMachineAttri(machineId, { status: 'playing', currentUser: player });
      return null;
    }).catch(function (err) {
      console.log('error in finding user identity when play start : ', err);
    });
  }

  // update Machine attributies function
  function updateMachineAttri(machineId, updateObj) {
    Machine.findById(machineId, function (err, instance) {
      instance.updateAttributes(updateObj);
    });
  }

  //make a reservation of user
  function makeReserve(userId, machineId, productId) {
    var Reservation = app.models.Reservation;
    return new Promise(function (resolve, reject) {
      Reservation.findOne({ where: { userId: userId } }, function (err, instance) {
        instance.updateAttributes({ status: 'open', machineId: machineId, productId: productId }, function (error, updatedReserve) {
          if (err || error) {
            reject(err || error);
          }
          var id = updatedReserve.id,
              status = updatedReserve.status,
              machineId = updatedReserve.machineId,
              productId = updatedReserve.productId,
              lastUpdated = updatedReserve.lastUpdated;

          var resObj = {
            id: id,
            status: status,
            machineId: machineId,
            productId: productId,
            lastUpdated: lastUpdated
          };
          resolve(resObj);
        });
      });
    });
  };

  Machine.afterRemote('gamePlay', function (ctx, unused, next) {
    console.log('|=========== Game Play End =============|');
    console.log(ctx.result.result);
    if (ctx.result.result.gizwits !== undefined) {

      //check if the result is updated manually
      var checkPlayResult = function checkPlayResult(playId) {
        //console.log('check play result trigger HERE')
        Play.findById(playId, function (err, instance) {
          //console.log('final play instance : ', instance);
          if (instance.finalResult === undefined) {
            var attri = { ended: new Date().getTime(), finalResult: false };
            instance.updateAttributes(attri);
          }
        });
      };

      var Play = app.models.Play;
      var _ctx$result$result = ctx.result.result,
          userId = _ctx$result$result.userId,
          playId = _ctx$result$result.playId;
      //let { transactionId, userId, machineId, productId, playId } = afterRemote;

      // check the result after 47s

      setTimeout(function () {
        checkPlayResult(playId);
      }, 47000);;
      next();
    } else {
      next();
    }
  });

  Machine.remoteMethod('gamePlay', {
    http: { path: '/:machineId/gamePlay', verb: 'post' },
    accepts: [{ arg: 'machineId', type: 'string', required: true }, { arg: 'data', type: 'object', required: true }],
    returns: { arg: 'result', type: 'object' }
  });
};