'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var _firebasedb = require('../utils/firebasedb.js');

var Promise = require('bluebird');

module.exports = function (Reservation) {

  var app = require('../server');
  var firebase = app.firebaseApp;
  var firebasedb = firebase.database();
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Reservation);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Reservation);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Reservation);

  Reservation.observe('before save', function (ctx, next) {
    if (!ctx.isNewInstance && ctx.data) {
      console.log(ctx.data);
      var _ctx$data = ctx.data,
          status = _ctx$data.status,
          machineId = _ctx$data.machineId;

      var machineLocation = 'machines/' + machineId;
      if (status === 'close') {
        (0, _firebasedb.makeDbTransaction)(machineLocation, 'numOfReserve', 'minus');
        ctx.data.machineId = 'none';
        next();
      } else if (status === 'open') {
        (0, _firebasedb.makeDbTransaction)(machineLocation, 'numOfReserve', 'plus');
        next();
      } else {
        next();
      }
    }
  });

  Reservation.observe('after save', function (ctx, next) {
    var _ctx$instance = ctx.instance,
        id = _ctx$instance.id,
        status = _ctx$instance.status,
        userId = _ctx$instance.userId,
        machineId = _ctx$instance.machineId;

    var location = 'userInfo/' + userId + '/reservation';
    if (ctx.isNewInstance) {
      var firebaseDataObj = {
        id: id,
        status: status,
        machineId: machineId
      };
      (0, _firebasedb.changeFirebaseDb)('set', location, firebaseDataObj, 'Reservation');
    } else {
      (0, _firebasedb.changeFirebaseDb)('update', location, { status: status, machineId: machineId }, 'Reservation');
    }
    next();
  });

  Reservation.endEngage = function (machineId, cb) {
    // console.log('machineId : ', machineId);
    var Machine = app.models.Machine;
    var removeCurrentEngage = function removeCurrentEngage(machineId) {
      return new Promise(function (resolve, reject) {
        Reservation.findOne({ where: { machineId: machineId, status: 'engage' } }, function (error, reserve) {
          console.log('find one reserve : ', reserve);
          if (reserve !== null) {
            reserve.updateAttributes({ status: 'close', machineId: machineId }, function (err, inst) {
              resolve(true);
              return true;
            });
          } else if (!error) {
            resolve(true);
            return false;
          } else {
            reject(error);
            return false;
          }
        });
      });
    };

    removeCurrentEngage(machineId).then(function (res) {
      Reservation.find({ where: { machineId: machineId, status: 'open' }, order: 'created ASC', limit: 1 }, function (error, foundReserve) {
        //console.log('foundReserve : ', foundReserve);
        if (foundReserve === null || foundReserve.length == 0) {
          Machine.findById(machineId, function (err, machine) {
            machine.updateAttributes({ status: 'open', currentUserId: 'nouser' }, function (err, instance) {
              cb(null, instance);
            });
          });
        } else {
          //console.log(typeof foundReserve);
          foundReserve[0].updateAttributes({ status: 'engage', machineId: machineId }, function (newError, instance) {
            //console.log('update next player to engage : ', instance);
            cb(null, { reserveUpdate: instance });
          });
        }
      });
    }).catch(function (err) {
      cb(err);
    });
  };

  Reservation.remoteMethod('endEngage', {
    http: { path: '/:machineId/endEngage', verb: 'get' },
    accepts: [{ arg: 'machineId', type: 'string', required: true }],
    returns: { arg: 'result', type: 'object' }
  });
};