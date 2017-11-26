'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

module.exports = function (Product) {

  var app = require('../server');
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Product);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Product);

  // ctx.data.benchmarkId || ctx.instance.benchmarkId
  Product.observe('before save', function (ctx, next) {
    // console.log('ctx.data:', ctx.data);
    if (ctx.instance && ctx.instance.benchmarkId) {
      var benchmarkId = ctx.instance.benchmarkId;
      var Benchmark = app.models.Benchmark;
      console.log('ctx.instance:', ctx.instance);
      //console.log('ctx.hookState:', ctx.hookState);
      Benchmark.findById(benchmarkId, function (err, bMark) {
        var revenueRequired = ctx.instance.cost * bMark.marginRate * 1.5;
        var valuePerGame = bMark.gamePlayRate * bMark.realValuePerCoin;
        ctx.instance.productRate = Math.round(revenueRequired / valuePerGame * 100) / 100;
        ctx.instance.unsetAttribute('cost');
      });
    } else if (ctx.data && ctx.data.benchmarkId) {
      var _benchmarkId = ctx.data.benchmarkId;
      var _Benchmark = app.models.Benchmark;
      console.log('ctx.data:', ctx.data);
      _Benchmark.findById(_benchmarkId, function (err, bMark) {
        var revenueRequired = ctx.currentInstance.cost.value * bMark.marginRate * 1.5;
        var valuePerGame = bMark.gamePlayRate * bMark.realValuePerCoin;
        ctx.data.productRate = Math.round(revenueRequired / valuePerGame * 100) / 100;
        console.log(ctx.data.productRate);
      });
    };
    next();
  });

  Product.startgame = function (productid, cb) {
    Product.findById(productid, { include: ['benchmark'] }, function (err, product) {
      console.log(product.benchmark);
      cb(null, { result: 'true' });
    });
  };

  Product.remoteMethod('startgame', {
    http: { path: '/startgame', verb: 'get' },
    accepts: { arg: 'productid', type: 'string' },
    returns: { arg: 'result', type: 'boolean' }
  });
};