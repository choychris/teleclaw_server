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

  Delivery.new = function (data, cb) {
    var _app$models = app.models,
        Wallet = _app$models.Wallet,
        User = _app$models.User,
        Play = _app$models.Play,
        Product = _app$models.Product;
    var address = data.address,
        cost = data.cost,
        status = data.status,
        userId = data.userId,
        products = data.products,
        courier = data.courier;

    var items = [];
    User.findById(userId, function (err, foundUser) {
      if (foundUser.address == undefined) {
        foundUser.updateAttributes({ addess: address, phone: address.phone, email: address.email });
      }
    });

    Wallet.findOne({ where: { userId: userId } }).then(function (wallet) {
      if (cost > wallet.balance) {
        cb(null, 'insufficient_balance');
      } else if (courier.courier_name !== 'fixed_delivery') {
        Promise.map(products, function (each) {
          return createitems(Product, each, items, null);
        }).then(function (plays) {
          if (plays[0] !== undefined) {
            createShippmentApi(address, items).then(function (shipmentId) {
              data.easyship_shipment_id = shipmentId;
              return recordDelivery(plays);
            });
          } else {
            cb(null, 'incorrect_products_format');
          }
        });
      } else {
        Promise.map(products, function (each) {
          var aPlay = { id: each.playId };
          return aPlay;
        }).then(function (plays) {
          if (plays[0] !== undefined) {
            recordDelivery(plays);
          } else {
            cb(null, 'incorrect_products_format');
          }
        });
      }
      return null;
    }).catch(function (error) {
      (0, _createLogging.loggingFunction)({ Model: 'Devliery', Function: 'Create Delivery Error', Error: error }, 'error');
      cb(error);
    });

    function recordDelivery(plays) {
      (0, _makeTransaction.createNewTransaction)(userId, cost, 'delivery', 'minus', true, null).then(function (createdTrans) {
        data.transactionId = createdTrans.id;
        return Delivery.create(data);
      }).then(function (newDelivery) {
        Play.find({ where: { or: plays } }, function (error, foundPlays) {
          Promise.map(foundPlays, function (eachPlay) {
            eachPlay.updateAttributes({ deliveryId: newDelivery.id });
          });
        });
        return newDelivery;
      }).then(function (result) {
        cb(null, result);
      });
    }

    function createShippmentApi(address, items) {
      var countryCode = address.countryCode,
          city = address.city,
          postalCode = address.postalCode,
          state = address.state,
          name = address.name,
          line1 = address.line1,
          line2 = address.line2,
          phone = address.phone,
          email = address.email;

      var options = {
        method: 'POST',
        url: 'https://api.easyship.com/shipment/v1/shipments',
        headers: {
          'authorization': 'Bearer ' + EASYSHIP_TOKEN,
          'content-type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          selected_courier_id: courier.courier_id,
          destination_country_alpha2: countryCode,
          destination_city: city,
          destination_postal_code: postalCode,
          destination_state: state || null,
          destination_name: name,
          destination_address_line_1: line1,
          destination_address_line_2: line2,
          destination_phone_number: phone,
          destination_email_address: email || null,
          items: items
        })
      };
      return new Promise(function (resolve, reject) {
        request(options, function (err, res, body) {
          if (err) {
            console.log(err);
            reject(err);
          }
          var parsedBody = JSON.parse(body);
          console.log('create shippment body :', parsedBody);
          resolve(parsedBody.shipment.easyship_shipment_id);
        });
      });
    }
  };

  Delivery.remoteMethod('new', {
    http: { path: '/new', verb: 'post' },
    accepts: { arg: 'data', type: 'object', required: true },
    returns: { arg: 'result', type: 'object' }
  });

  function createitems(Product, each, items, isFixed) {
    return Product.findById(each.id, { fields: { name: true, weight: true, size: true, cost: true, deliveryPrice: true } }).then(function (product) {
      var weight = product.weight,
          size = product.size,
          cost = product.cost,
          deliveryPrice = product.deliveryPrice;
      var height = size.height,
          width = size.width,
          length = size.length;

      var item = {
        description: product.name.en,
        sku: 50,
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
        return { id: each.playId };
      } else if (deliveryPrice.type == 'fixed') {
        if (isFixed !== null) {
          isFixed.push(deliveryPrice.value);
        }
        return { id: each.playId };
      }
    });
  };

  Delivery.getRate = function (data, cb) {
    var products = data.products,
        countryCode = data.countryCode,
        postalCode = data.postalCode;
    var _app$models2 = app.models,
        Product = _app$models2.Product,
        ExchangeRate = _app$models2.ExchangeRate;

    var items = [];
    var isFixed = [];

    Promise.map(products, function (each) {
      return createitems(Product, each, items, isFixed);
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
        return isFixed[0];
      }
    }).then(function (result) {
      return ExchangeRate.findOne({ order: 'realValuePerCoin.usd DESC' }).then(function (rate) {
        var realValuePerCoin = rate.realValuePerCoin;

        if (result.length > 0) {
          return Promise.mapSeries(result, function (data) {
            var courier_id = data.courier_id,
                courier_name = data.courier_name,
                min_delivery_time = data.min_delivery_time,
                max_delivery_time = data.max_delivery_time,
                total_charge = data.total_charge,
                courier_does_pickup = data.courier_does_pickup;

            var oneChoice = {
              courier_id: courier_id,
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
          var letter = { courier_name: 'fixed_delivery', min_delivery_time: 7, max_delivery_time: 10, total_charge: result, coins_value: Math.round(result / realValuePerCoin.hkd) };
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