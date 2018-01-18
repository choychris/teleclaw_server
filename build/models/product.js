'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var storage = require('../utils/multerStorage');
var path = require('path');
var cloudinary = require('cloudinary');
var multer = require('multer');
var fs = require('fs');
var Promise = require('bluebird');

module.exports = function (Product) {

  var app = require('../server');
  //make loggings for monitor purpose
  //loggingModel(Product);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Product);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Product);

  // if a benchmark is added, also assgin the product rate (probaility) to the product
  Product.observe('before save', function (ctx, next) {

    if (ctx.instance && ctx.instance.benchmarkId) {
      attachBenchmark(ctx, 'instance', next);
    } else if (ctx.data && ctx.data.benchmarkId) {
      //Get the benchmark and calculate the rate
      attachBenchmark(ctx, 'data', next);
    } else if (ctx.data && ctx.data.machines) {
      ctx.hookState.machines = ctx.data.machines;
      delete ctx.data.machines;
      next();
    } else if (ctx.data && ctx.data.status) {
      ctx.hookState.statusChange = true;
      next();
    } else if (ctx.data && ctx.data.sku == 0) {
      var status = ctx.currentInstance.status;

      var newStatus = status;
      newStatus.maintainStatus = true;
      ctx.hookState.statusChange = true;
      ctx.data.status = newStatus;
      next();
    } else {
      next();
    }
  });

  //Get the benchmark and calculate the rate, from the best value exchange-rate
  function attachBenchmark(ctx, where, next) {
    var _app$models = app.models,
        Benchmark = _app$models.Benchmark,
        ExchangeRate = _app$models.ExchangeRate;

    var benchmarkId = ctx[where]['benchmarkId'];
    var cost = where == 'data' ? ctx['currentInstance']['cost']['value'] : ctx[where]['cost']['value'];

    Promise.all([Benchmark.findById(benchmarkId), ExchangeRate.findOne({ order: 'realValuePerCoin.usd DESC' })]).then(function (result) {
      var _result$ = result[0],
          marginRate = _result$.marginRate,
          overheadCost = _result$.overheadCost,
          gamePlayRate = _result$.gamePlayRate;
      var realValuePerCoin = result[1].realValuePerCoin;

      var revenueRequired = cost * marginRate * overheadCost;
      var valuePerGame = gamePlayRate * realValuePerCoin.hkd;
      ctx[where]['productRate'] = Math.round(revenueRequired / valuePerGame) || 0;
      ctx[where]['gamePlayRate'] = gamePlayRate;
      next();
      return null;
    }).catch(function (error) {
      console.log('error in attachBenchmark : ', error);
      next();
    });
  }

  Product.observe('after save', function (ctx, next) {
    if (!ctx.isNewInstance) {
      // if there is status change, trigger pusher
      if (ctx.hookState && ctx.hookState.statusChange) {
        var _ctx$instance = ctx.instance,
            id = _ctx$instance.id,
            status = _ctx$instance.status,
            name = _ctx$instance.name;

        app.pusher.trigger('products', 'statusChange', { productId: id, status: status, lastUpdated: new Date().getTime() });
      }
    }
    next();
  });

  Product.observe('after save', function (ctx, next) {
    if (!ctx.isNewInstance) {
      if (ctx.hookState && ctx.hookState.machines) {
        // console.log('hookState machines : ', ctx.hookState.machines);
        var Machine = app.models.Machine;
        //user promise.mappseries to make sure all machine added.
        Promise.mapSeries(ctx.hookState.machines, function (machine, index) {
          machine.productId = ctx.instance.id;
          Machine.upsert(machine, function (err, info) {
            if (err) {
              console.log('add macine to proudct : ', err);
              next(err);
            }
          });
        }).then(function () {
          next();
        }).catch(function (err) {
          console.log('add macine to proudct : ', err);
          next(err);
        });
      } else {
        next();
      }
      // if product newly created
    } else {
      next();
    }
  });

  // perform upload to Cloudinary
  Product.imageUpload = function (req, res, cb) {
    // console.log(req.files[0]);
    var _process$env = process.env,
        CLOUDINARY_CLOUD_NAME = _process$env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY = _process$env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET = _process$env.CLOUDINARY_API_SECRET;

    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET
    });
    // upload variable to access multer diskStorage
    var upload = multer({ storage: storage }).single('tempImage');
    upload(req, res, function (err) {
      if (err) {
        res.end(err);
        console.log('upload error : ', err);
      } else {
        var _req$body = req.body,
            name = _req$body.name,
            tag = _req$body.tag,
            placement = _req$body.placement;

        cloudinary.image(req.file.path, { quality: "auto" });
        cloudinary.v2.uploader.upload(req.file.path, { public_id: placement, folder: name, tags: [tag] }, function (error, result) {
          // console.log(result);
          // res.end(result.secure_url);
          cb(null, result.secure_url);
        });
      }
    });
  };

  Product.remoteMethod('imageUpload', {
    accepts: [{ arg: 'req', type: 'object', http: { source: 'req' } }, { arg: 'res', type: 'object', http: { source: 'res' } }],
    returns: { arg: 'imageUrl', type: 'string' }
  });
};