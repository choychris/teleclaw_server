'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
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

  Delivery.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let { userId, cost } = ctx.instance;
      createNewTransaction(userId, cost, 'delivery', 'minus', 'closed', null)

    };
    next();
  })

  Delivery.getRate = (data, cb) =>{
    let { products, countryCode, postalCode } = data;
    console.log('Delivery Get Rate data : ', data)
    let { Product, ExchangeRate } = app.models;
    let items = [];
    let choices = [];
    let isDocument = 0;

    Product.find({ 
      where: {or: products}, 
      fields: {weight: true, size: true, cost: true, deliveryType: true}
    }).then(result=>{
      return Promise.map(result, each=>{
        let { weight, size, cost, deliveryType } = each;
        let { height, width, length } = size;
        let item = { 
          actual_weight: weight.value,
          height: height,
          width: width,
          length: length,
          category: 'toys',
          declared_currency: 'HKD',
          declared_customs_value: cost.value || 0
        }
        if(deliveryType == 'physical'){
          items.push(item);
        }else if(deliveryType == 'coupon'){
          isDocument = 15;
        }
      })
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
        return isDocument;
      }
    }).then(result=>{
      console.log('result from easyship : ', result);
      return ExchangeRate.findOne({order: 'realValuePerCoin.usd DESC'}).then(rate=>{
        let { realValuePerCoin } = rate;
        if(result.length > 0){
          return Promise.mapSeries(result, data=>{
            let { courier_name, min_delivery_time, max_delivery_time, total_charge,  courier_does_pickup } = data;
            let oneChoice = {
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
          let letter = {name: 'no_courier', max_delivery_time: 7, total_charge: result, coins_value: Math.round(result / realValuePerCoin.hkd)}
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
  )
};
