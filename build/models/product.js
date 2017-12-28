'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var _firebasedb = require('../utils/firebasedb.js');

var storage = require('../utils/multerStorage');
var path = require('path');
var cloudinary = require('cloudinary');
var multer = require('multer');
var fs = require('fs');
var Promise = require('bluebird');

module.exports = function (Product) {

  var app = require('../server');
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Product);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Product);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Product);

  // if a benchmark is added, also assgin the product rate (probaility) to the product
  Product.observe('before save', function (ctx, next) {
    // console.log('ctx.data:', ctx.data);
    if (ctx.instance && ctx.instance.benchmarkId) {
      var benchmarkId = ctx.instance.benchmarkId;
      var Benchmark = app.models.Benchmark;
      var cost = ctx.instance.cost.value;
      // console.log('ctx.instance:', ctx.instance);
      // console.log('ctx.hookState:', ctx.hookState);
      Benchmark.findById(benchmarkId, function (err, bMark) {
        // console.log('benchmark : ', bMark);
        var revenueRequired = cost * bMark.marginRate * bMark.overheadCost;
        var valuePerGame = bMark.gamePlayRate * bMark.realValuePerCoin;
        ctx.instance.productRate = Math.round(revenueRequired / valuePerGame) || 0;
        ctx.instance.gamePlayRate = bMark.gamePlayRate;
        // ctx.instance.unsetAttribute('id');
        // console.log('New ctx.instance : ', ctx.instance);
        next();
      });
    } else if (ctx.data && ctx.data.benchmarkId) {
      var _benchmarkId = ctx.data.benchmarkId;
      var _Benchmark = app.models.Benchmark;
      var _cost = ctx.data.cost.value;
      // console.log('ctx.data : ', ctx.data);
      _Benchmark.findById(_benchmarkId, function (err, bMark) {
        var revenueRequired = bMark.marginRate * bMark.overheadCost;
        var valuePerGame = bMark.gamePlayRate * bMark.realValuePerCoin;
        ctx.data.productRate = Math.round(revenueRequired / valuePerGame) || 0;
        ctx.data.gamePlayRate = bMark.gamePlayRate;
        next();
      });
    } else {
      next();
    }
  });

  Product.observe('before save', function (ctx, next) {
    if (!ctx.isNewInstance) {
      if (ctx.data && ctx.data.machines) {
        ctx.hookState.machines = ctx.data.machines;
        delete ctx.data.machines;
      }
    }

    next();
  });

  Product.observe('after save', function (ctx, next) {
    if (!ctx.isNewInstance) {
      //console.log('hookstate machines : ', ctx.hookState.machines);
      if (ctx.hookState && ctx.hookState.machines) {
        var AttachMachines = app.models.Machine;
        //console.log('AttachMachines : ', AttachMachines);
        Promise.mapSeries(ctx.hookState.machines, function (machine) {
          machine.productId = ctx.instance.id;
          AttachMachines.upsert(machine, function (err, info) {
            if (err) {
              //console.log('machine attach to product error : ', err);
              next('machine attach to product error');
            }
          });
        }).then(function () {
          next();
        }).catch(function (err) {
          next(err);
        });
      } else {
        var productId = ctx.instance.id;
        var status = ctx.instance.status;
        var location = 'products/' + productId + '/status';
        (0, _firebasedb.changeFirebaseDb)('update', location, status, 'Product');
        next();
      };
    } else if (ctx.isNewInstance) {
      // save a product to firebase real-time database
      var _location = 'products/' + ctx.instance.id;
      // console.log(ctx.instance);
      var _ctx$instance = ctx.instance,
          name = _ctx$instance.name,
          _status = _ctx$instance.status,
          sku = _ctx$instance.sku;

      var firebaseDataObj = {
        product_name: name,
        status: _status,
        sku: sku,
        totalNumOfPlay: 0,
        totalNumOfSuccess: 0
      };
      (0, _firebasedb.changeFirebaseDb)('set', _location, firebaseDataObj, 'Product');
      next();
    } else {
      next();
    }
  });

  // perform upload to Cloudinary
  Product.imageupload = function (req, res, cb) {
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

  Product.remoteMethod('imageupload', {
    accepts: [{ arg: 'req', type: 'object', http: { source: 'req' } }, { arg: 'res', type: 'object', http: { source: 'res' } }],
    returns: { arg: 'result', type: 'string' }
  });
};