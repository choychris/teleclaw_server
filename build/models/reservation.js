'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var _gamePlayTimer = require('../utils/gamePlayTimer.js');

var _makeTransaction = require('../utils/makeTransaction.js');

var Promise = require('bluebird');

module.exports = function (Reservation) {

  var app = require('../server');
  //make loggings for monitor purpose
  //loggingModel(Reservation);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Reservation);

  Reservation.disableRemoteMethod("deleteById", true);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Reservation);

  Reservation.observe('before save', function (ctx, next) {
    var Machine = app.models.Machine;
    if (!ctx.isNewInstance) {
      var _ctx$currentInstance = ctx.currentInstance,
          id = _ctx$currentInstance.id,
          status = _ctx$currentInstance.status,
          userId = _ctx$currentInstance.userId,
          machineId = _ctx$currentInstance.machineId;

      if (ctx.data && ctx.data.machineId) {
        var sameMachine = machineId === ctx.data.machineId;
        if (status === 'open' && !!machineId) {
          (0, _makeTransaction.makeCalculation)(Machine, machineId, 'reservation', 1, 'minus');
        }
      }
      if (ctx.data && ctx.data.status === 'cancel') {
        var _ctx$currentInstance2 = ctx.currentInstance,
            _id = _ctx$currentInstance2.id,
            _status = _ctx$currentInstance2.status,
            _userId = _ctx$currentInstance2.userId,
            _machineId = _ctx$currentInstance2.machineId;

        (0, _makeTransaction.makeCalculation)(Machine, _machineId, 'reservation', 1, 'minus');
        ctx.data.machineId = null;
        ctx.data.productId = null;
      }
    };
    next();
  });

  Reservation.observe('after save', function (ctx, next) {
    var _ctx$instance = ctx.instance,
        id = _ctx$instance.id,
        status = _ctx$instance.status,
        userId = _ctx$instance.userId,
        machineId = _ctx$instance.machineId,
        lastUpdated = _ctx$instance.lastUpdated,
        productId = _ctx$instance.productId;

    var Machine = app.models.Machine;
    if (!ctx.isNewInstance) {
      if (status === 'close' && !!machineId) {
        var pusherObj = {
          id: id,
          status: status,
          machineId: machineId,
          productId: productId,
          lastUpdated: lastUpdated
        };
        app.pusher.trigger('reservation-' + userId.toString(), 'your_turn', pusherObj);
        (0, _makeTransaction.makeCalculation)(Machine, machineId, 'reservation', 1, 'minus');
      } else if (status === 'open' && !!machineId) {
        (0, _makeTransaction.makeCalculation)(Machine, machineId, 'reservation', 1, 'plus');
      }
      next();
    } else {
      next();
    }
  });

  Reservation.endEngage = function (machineId, userId, cb) {
    var Machine = app.models.Machine;
    Machine.findById(machineId, function (err, machine) {
      // check if machine is still in playing
      var currentId = machine.currentUser ? machine.currentUser.id : null;
      if (machine.status == 'open' && currentId == userId) {
        //find next reservation
        Reservation.find({ where: { machineId: machineId, status: 'open' }, order: 'lastUpdated ASC', limit: 1 }, function (error, foundReserve) {
          if (foundReserve === null || foundReserve.length === 0) {
            console.log('when no reserve');
            updateMachine(machineId, 'open', null);
            if (!!cb) {
              cb(null, 'machine_open');
            }
          } else {
            //update the next reserve and trigger pusher in after save
            foundReserve[0].updateAttributes({ status: 'close' }, function (newError, instance) {
              updateMachine(machineId, 'open', { id: instance.userId });
              timeOutReserve(machineId, userId, Machine, Reservation);
              if (!!cb) {
                cb(null, 'next_reserve');
              }
            });
          }
        });
      } else {
        if (!!cb) {
          cb(null, 'machine_playing');
        }
      }
    });
  };

  function updateMachine(machineId, status, userId) {
    var Machine = app.models.Machine;
    Machine.findById(machineId, function (err, machine) {
      machine.updateAttributes({ status: status, currentUser: userId }, function (err, instance) {
        if (err) {
          console.log(err);
        }
        console.log('machine instance :', instance);
      });
    });
  }

  function timeOutReserve(machineId, userId, Machine, Reservation) {
    setTimeout(function () {
      (0, _gamePlayTimer.checkMachineStatus)(machineId, userId, Machine, Reservation);
    }, 8000);
  }

  Reservation.remoteMethod('endEngage', {
    http: { path: '/:machineId/:userId/endEngage', verb: 'get' },
    accepts: [{ arg: 'machineId', type: 'string', required: true }, { arg: 'userId', type: 'string', required: true }],
    returns: { arg: 'result', type: 'object' }
  });
};