'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var _firebasedb = require('../utils/firebasedb.js');

module.exports = function (Machine) {

  var app = require('../server');
  // var firebase = app.firebaseApp;
  // var firebasedb = firebase.database();
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Machine);

  // assgin an id to each newly created model
  (0, _beforeSave.assignKey)(Machine);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Machine);

  Machine.observe('before save', function (ctx, next) {
    if (!ctx.isNewInstance) {}
    next();
  });

  Machine.observe('after save', function (ctx, next) {
    if (ctx.isNewInstance) {
      var location = 'machines/' + ctx.instance.id;
      var _ctx$instance = ctx.instance,
          name = _ctx$instance.name,
          status = _ctx$instance.status,
          display = _ctx$instance.display;

      var firebaseDataObj = {
        machine_name: name,
        status: status,
        display: display,
        numOfViewer: 0,
        numOfReserve: 0,
        totalNumOfPlay: 0,
        totalNumOfSuccess: 0
      };
      (0, _firebasedb.changeFirebaseDb)('set', location, firebaseDataObj, 'Machine');
    } else if (!ctx.isNewInstance) {
      var _location = 'machines/' + ctx.instance.id;
      var _ctx$instance2 = ctx.instance,
          _name = _ctx$instance2.name,
          _status = _ctx$instance2.status,
          _display = _ctx$instance2.display,
          currentUserId = _ctx$instance2.currentUserId,
          productId = _ctx$instance2.productId;

      if (currentUserId === 'nouser') {
        (0, _firebasedb.changeFirebaseDb)('update', _location, { currentPlayer: null }, 'Machine');
      }
      if (_status === 'open' || _status === 'playing') {
        updateProductStatus(productId);
      }
      var _firebaseDataObj = {
        machine_name: _name,
        status: _status,
        display: _display
      };
      (0, _firebasedb.changeFirebaseDb)('update', _location, _firebaseDataObj, 'Machine');
    }
    next();
  });

  function updateProductStatus(productId) {
    var Product = app.models.Product;

    function updateProductStatus(newStatus, productId) {
      Product.findById(productId, function (err, foundProduct) {
        foundProduct.updateAttributes({ status: { machineStatus: newStatus } });
      });
    };

    Machine.find({ where: { productId: productId, status: 'open' } }, function (err, result) {
      //let location = `products/${productId}/status`;
      if (result.length !== 0) {
        updateProductStatus(true, productId);
        //changeFirebaseDb('update', location, { machineStatus: true }, 'Product');
      } else {
        updateProductStatus(false, productId);
        //changeFirebaseDb('update', location, { machineStatus: false }, 'Product');
      }
    });
  };

  Machine.beforeRemote('gameplay', function (ctx, unused, next) {
    //console.log('ctx.args : ', ctx.args)
    var _ctx$args = ctx.args,
        machineId = _ctx$args.machineId,
        data = _ctx$args.data;
    var productId = data.productId,
        userId = data.userId;
    // console.log('data obj :', data)

    var User = app.models.User;
    Machine.findById(machineId, function (errMsg, machine) {
      var location = 'machines/' + machineId;
      if (machine.currentUserId !== userId) {
        User.findById(userId, { include: { relation: 'userIdentities', scope: { limit: 1 } } }, function (err, user) {
          var parsedUser = JSON.parse(JSON.stringify(user));
          // console.log('USER obj :', parsedUser);
          var player = {
            id: userId,
            name: user.name,
            picture: parsedUser.userIdentities[0].picture.url
          };
          machine.updateAttributes({ currentUserId: userId, status: 'playing' }, function (er, instance) {
            (0, _firebasedb.changeFirebaseDb)('update', location, { status: 'playing', currentPlayer: player }, 'Machine');
          });
          (0, _firebasedb.makeDbTransaction)(location, 'totalNumOfPlay', 'plus');
          next();
        });
      } else {
        (0, _firebasedb.makeDbTransaction)(location, 'totalNumOfPlay', 'plus');
        next();
      }
    });
  });

  Machine.gameplay = function (machineId, data, cb) {
    var productId = data.productId,
        userId = data.userId;
    // console.log('machineId : ', machineId)
    // console.log('data obj :', data)

    var User = app.models.User;
    var Transaction = app.models.Transaction;
    var Product = app.models.Product;

    // function to look for details of the current product
    Product.findById(productId, function (err, product) {
      if (!err) {
        //  console.log('find product : ', product);
        var location = 'products/' + productId;
        (0, _firebasedb.makeDbTransaction)(location, 'totalNumOfPlay', 'plus');
        User.findById(userId, { include: 'wallet' }, function (err, user) {
          var parsedUser = JSON.parse(JSON.stringify(user));
          var transacObject = {
            action: 'minus',
            amount: product.gamePlayRate,
            status: 'closed',
            walletId: parsedUser.wallet.id,
            userId: parsedUser.id
          };
          Transaction.create(transacObject, function (error, createdTrans) {
            if (error) {
              // console.log(createdTrans);
              console.log(error);
              cb(error);
            }
            var result = {
              gameResult: generateResult(product.productRate),
              transactionId: createdTrans.id,
              userId: parsedUser.id,
              productId: product.id,
              newWalletBalance: parsedUser.wallet.balance - createdTrans.amount
            };
            cb(null, result);
          });
        });
      }
    }); //<--- find product function end

    // function to generate a game result
    var generateResult = function generateResult(productRate) {
      // random int function
      function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
      } // <--- random int function end

      var int1 = getRandomIntInclusive(1, productRate);
      var int2 = getRandomIntInclusive(1, productRate);
      console.log(int1);
      console.log(int2);
      return int1 === int2;
    }; // <--- generate result function end
  };

  Machine.remoteMethod('gameplay', {
    http: { path: '/:machineId/gameplay', verb: 'post' },
    accepts: [{ arg: 'machineId', type: 'string', required: true }, { arg: 'data', type: 'object', required: true }],
    returns: { arg: 'result', type: 'object' }
  });
};