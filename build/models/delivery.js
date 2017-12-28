'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var _makeTransaction = require('../utils/makeTransaction.js');

var request = require('request');
var Promise = require('bluebird');
var EASYSHIP_TOKEN = process.env.EASYSHIP_TOKEN;


module.exports = function (Delivery) {

  var app = require('../server');
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Delivery);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Delivery);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Delivery);

  Delivery.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance) {
      var Wallet = app.models.Wallet;
      var _ctx$instance = ctx.instance,
          userId = _ctx$instance.userId,
          cost = _ctx$instance.cost;

      console.log(ctx.instance.products);
      Wallet.findOne({ where: { userId: userId } }).then(function (wallet) {
        if (cost > wallet.balance) {
          return next('insufficient_balance');
        } else {
          return (0, _makeTransaction.createNewTransaction)(userId, cost, 'delivery', 'minus', 'closed', null);
        }
      }).then(function (createdTrans) {
        if (!!createdTrans) {
          var id = createdTrans.id;

          ctx.instance.transactionId = id;
          next();
        }
      }).catch(function (error) {
        console.log('create transaction error in delivery : ', error);
        next(error);
      });
    } else {
      next();
    }
  });

  Delivery.getRate = function (data, cb) {
    var products = data.products,
        countryCode = data.countryCode,
        postalCode = data.postalCode;

    console.log('Delivery Get Rate data : ', data);
    var _app$models = app.models,
        Product = _app$models.Product,
        ExchangeRate = _app$models.ExchangeRate;

    var items = [];
    var choices = [];
    var isFixed = 0;

    Product.find({
      where: { or: products },
      fields: { weight: true, size: true, cost: true, deliveryPrice: true }
    }).then(function (result) {
      return Promise.map(result, function (each) {
        var weight = each.weight,
            size = each.size,
            cost = each.cost,
            deliveryPrice = each.deliveryPrice;
        var height = size.height,
            width = size.width,
            length = size.length;

        var item = {
          actual_weight: weight.value,
          height: height,
          width: width,
          length: length,
          category: 'toys',
          declared_currency: 'HKD',
          declared_customs_value: cost.value || 0
        };
        if (deliveryPrice.type == 'dynamic') {
          items.push(item);
        } else if (deliveryPrice.type == 'fixed') {
          isFixed = deliveryPrice.value;
        }
      });
    }).then(function (res) {
      var options = {
        method: 'POST',
        url: 'https://api.easyship.com/rate/v1/rates',
        headers: {
          'cache-control': 'no-cache',
          'authorization': 'Bearer ' + EASYSHIP_TOKEN,
          'content-type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          origin_country_alpha2: 'HK',
          origin_postal_code: null,
          destination_country_alpha2: countryCode,
          destination_postal_code: postalCode,
          items: items
        })
      };
      if (items.length > 0) {
        return requestToEasyship(options);
      } else {
        return isFixed;
      }
    }).then(function (result) {
      return ExchangeRate.findOne({ order: 'realValuePerCoin.usd DESC' }).then(function (rate) {
        var realValuePerCoin = rate.realValuePerCoin;

        if (result.length > 0) {
          return Promise.mapSeries(result, function (data) {
            var courier_name = data.courier_name,
                min_delivery_time = data.min_delivery_time,
                max_delivery_time = data.max_delivery_time,
                total_charge = data.total_charge,
                courier_does_pickup = data.courier_does_pickup;

            var oneChoice = {
              courier_name: courier_name,
              min_delivery_time: min_delivery_time,
              max_delivery_time: max_delivery_time,
              courier_does_pickup: courier_does_pickup,
              total_charge: total_charge,
              coins_value: Math.round(total_charge / realValuePerCoin.hkd)
            };
            return oneChoice;
          });
        } else {
          var letter = { name: 'fixed_delivery', min_delivery_time: 7, max_delivery_time: 10, total_charge: result, coins_value: Math.round(result / realValuePerCoin.hkd) };
          return letter;
        }
      });
    }).then(function (choices) {
      cb(null, choices);
    }).catch(function (error) {
      cb(error);
    });

    function requestToEasyship(options) {
      return new Promise(function (resolve, reject) {
        request(options, function (err, res, body) {
          if (err) {
            console.log(err);
            reject(err);
          }
          var parsedBody = JSON.parse(body);
          parsedBody.rates.sort(function (a, b) {
            return a.total_charge - b.total_charge;
          });
          parsedBody.rates.splice(5);
          resolve(parsedBody.rates);
        });
      });
    };
  };

  Delivery.remoteMethod('getRate', {
    http: { path: '/getRate', verb: 'post' },
    accepts: { arg: 'data', type: 'object', required: true },
    returns: { arg: 'result', type: 'array' }
  });
};