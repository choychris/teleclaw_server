'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var _gamePlayTimer = require('../utils/gamePlayTimer.js');

var _makeTransaction = require('../utils/makeTransaction.js');

var shortid = require('shortid');

module.exports = function (Play) {

  var app = require('../server');
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Play);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Play);

  Play.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance) {
      ctx.instance.id = shortid.generate();
      next();
    } else {
      if (ctx.data && ctx.data.ended && ctx.data.finalResult !== undefined) {
        var _app$models = app.models,
            Machine = _app$models.Machine,
            Reservation = _app$models.Reservation,
            Product = _app$models.Product;
        var _ctx$currentInstance = ctx.currentInstance,
            productId = _ctx$currentInstance.productId,
            machineId = _ctx$currentInstance.machineId,
            userId = _ctx$currentInstance.userId,
            created = _ctx$currentInstance.created;

        Machine.findById(machineId, function (err, instance) {
          instance.updateAttributes({ status: 'open' });
        });
        var duration = (new Date(ctx.data.ended).getTime() - new Date(created).getTime()) / 1000;
        ctx.data.duration = duration;
        // if the user win, update product sku
        if (ctx.data.finalResult) {
          (0, _makeTransaction.makeCalculation)(Product, productId, 'sku', 1, 'minus');
          (0, _makeTransaction.makeCalculation)(Machine, machineId, 'sku', 1, 'minus');
        }
        // after 8 sec, if user reponse to play again 
        setTimeout(function () {
          (0, _gamePlayTimer.checkMachineStatus)(machineId, userId, Machine, Reservation);
        }, 8000);
      }
      next();
    }
  });
};