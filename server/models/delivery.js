'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel, loggingFunction } from '../utils/createLogging.js';
import { createNewTransaction } from '../utils/makeTransaction.js';
const request = require('request');
const Promise = require('bluebird');
const { EASYSHIP_TOKEN } = process.env; 

module.exports = function(Delivery) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Delivery);

  // assgin last updated time / created time to model
  updateTimeStamp(Delivery);

  //assign an unique if its new instance 
  assignKey(Delivery)

  Delivery.new = (data, cb)=>{
    let { Wallet, User, Play, Product } = app.models;
    let { address, cost, status, userId, products, courier } = data;
    let items = [];
    User.findById(userId, (err, foundUser)=>{
      if(foundUser.address == undefined){
        foundUser.updateAttributes({addess: address, phone: address.phone, email: address.email})
      }
    });

    Wallet.findOne({where: {userId: userId}}).then(wallet=>{
      if(cost > wallet.balance){
        cb(null, 'insufficient_balance');
      }else if(courier.courier_name !== 'fixed_delivery'){
        Promise.map(products, each=>{
          return createitems(Product, each, items, null)
        }).then(plays=>{
          if(plays[0] !== undefined){
            createShippmentApi(address, items).then(shipmentId=>{
              data.easyship_shipment_id = shipmentId;
              return recordDelivery(plays)
            })
          }else{
            cb(null, 'incorrect_products_format')
          }
        })
      }else{
        Promise.map(products, each=>{
          let aPlay = { id: each.playId };
          return aPlay;
        }).then(plays=>{
          if(plays[0] !== undefined){
            recordDelivery(plays)
          }else{
            cb(null, 'incorrect_products_format')
          }
        })
      }
      return null
    }).catch(error=>{
      loggingFunction({Model: 'Devliery', Function: 'Create Delivery Error', Error: error }, 'error')
      cb(error);
    })

    function recordDelivery(plays){
      createNewTransaction(userId, cost, 'delivery', 'minus', true, null).then(createdTrans=>{
        data.transactionId = createdTrans.id ;
        return Delivery.create(data);
      }).then(newDelivery=>{
        Play.find({where:{or: plays}}, (error, foundPlays)=>{
          Promise.map(foundPlays, eachPlay=>{
            eachPlay.updateAttributes({deliveryId: newDelivery.id});
          })
        })
        return newDelivery
      }).then(result=>{
        cb(null, result);
      })
    }

    function createShippmentApi(address, items){
      let { countryCode, city, postalCode, state, name, line1, line2, phone, email } = address;
      var options = { 
        method: 'POST',
        url: 'https://api.easyship.com/shipment/v1/shipments',
        headers: {
          'authorization': `Bearer ${EASYSHIP_TOKEN}`,
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
          items:items
        })
      }
      return new Promise((resolve, reject)=>{
        request(options, (err, res, body)=>{
          if (err){
            console.log(err);
            reject(err)
          }
          let parsedBody = JSON.parse(body);
          console.log('create shippment body :', parsedBody);
          resolve(parsedBody.shipment.easyship_shipment_id)
        })
      })
    }

  };

  Delivery.remoteMethod(
    'new',
    {
      http: { path: '/new', verb: 'post'},
      accepts: { arg: 'data', type: 'object', required: true },
      returns: { arg: 'result', type: 'object' }
    }
  );

  function createitems(Product, each, items, isFixed){
    return Product.findById(
      each.id, 
      {fields: {name: true, weight: true, size: true, cost: true, deliveryPrice: true}},
    ).then(product=>{
      let { weight, size, cost, deliveryPrice } = product;
      let { height, width, length } = size;
      let item = { 
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
      if(deliveryPrice.type == 'dynamic'){
        items.push(item);
        return {id: each.playId}
      }else if(deliveryPrice.type == 'fixed'){
        if(isFixed !== null){ isFixed.push(deliveryPrice.value); }
        return {id: each.playId}
      }
    })
  };

  Delivery.getRate = (data, cb) =>{
    let { products, countryCode, postalCode } = data;
    let { Product, ExchangeRate } = app.models;
    let items = [];
    let isFixed = [];

    Promise.map(products, each=>{
      return createitems(Product, each, items, isFixed)
    }).then(res=>{
      var options = { 
        method: 'POST',
        url: 'https://api.easyship.com/rate/v1/rates',
        headers: {
          'cache-control': 'no-cache',
          'authorization': `Bearer ${EASYSHIP_TOKEN}`,
          'content-type': 'application/json',
          'accept': 'application/json' 
        },
        body: JSON.stringify({
          origin_country_alpha2: 'HK',
          origin_postal_code: null,
          destination_country_alpha2: countryCode,
          destination_postal_code: postalCode,
          items:items
        })
      }
      if(items.length > 0){
        return requestToEasyship(options)
      }else{
        return isFixed[0];
      }
    }).then(result=>{
      return ExchangeRate.findOne({order: 'realValuePerCoin.usd DESC'}).then(rate=>{
        let { realValuePerCoin } = rate;
        if(result.length > 0){
          return Promise.mapSeries(result, data=>{
            let { courier_id, courier_name, min_delivery_time, max_delivery_time, total_charge,  courier_does_pickup } = data;
            let oneChoice = {
              courier_id,
              courier_name,
              min_delivery_time,
              max_delivery_time,
              courier_does_pickup,
              total_charge,
              coins_value: Math.round(total_charge / realValuePerCoin.hkd)
            };
            return oneChoice;
          })
        }else{
          let letter = {courier_name: 'fixed_delivery', min_delivery_time: 7, max_delivery_time: 10, total_charge: result, coins_value: Math.round(result / realValuePerCoin.hkd)}
          return letter;
        }
      })
    }).then(choices=>{
      cb(null, choices);
    }).catch(error=>{
      cb(error)
    });

    function requestToEasyship(options){
      return new Promise((resolve, reject)=>{
        request(options, function(err, res, body){
          if (err){
            console.log(err);
            reject(err)
          }
          let parsedBody = JSON.parse(body);
          parsedBody.rates.sort(function(a, b){
            return (a.total_charge - b.total_charge);
          })
          parsedBody.rates.splice(5)
          resolve(parsedBody.rates)
        });
      });
    };

  };

  Delivery.remoteMethod(
    'getRate',
    {
      http: { path: '/getRate', verb: 'post'},
      accepts: { arg: 'data', type: 'object', required: true },
      returns: { arg: 'result', type: 'array' }
    }
  );
};
