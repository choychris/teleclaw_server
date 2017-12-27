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
      let Wallet = app.models.Wallet
      let { userId, cost } = ctx.instance;
      console.log(ctx.instance.products)
      Wallet.findOne({where: {userId: userId}}).then(wallet=>{
        if(cost > wallet.balance){
          return next('insufficient_balance');
        }else{
          return createNewTransaction(userId, cost, 'delivery', 'minus', 'closed', null)
        }
      }).then(createdTrans=>{
        if(!!createdTrans){
          let { id } = createdTrans ;
          ctx.instance.transactionId = id;
          next();
        }
      }).catch(error=>{
        console.log('create transaction error in delivery : ', error);
        next(error);
      })
    }else{
      next();
    }
  })

  Delivery.getRate = (data, cb) =>{
    let { products, countryCode, postalCode } = data;
    console.log('Delivery Get Rate data : ', data)
    let { Product, ExchangeRate } = app.models;
    let items = [];
    let choices = [];
    let isFixed = 0;

    Product.find({ 
      where: {or: products}, 
      fields: {weight: true, size: true, cost: true, deliveryPrice: true}
    }).then(result=>{
      return Promise.map(result, each=>{
        let { weight, size, cost, deliveryPrice } = each;
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
        if(deliveryPrice.type == 'dynamic'){
          items.push(item);
        }else if(deliveryPrice.type == 'fixed'){
          isFixed = deliveryPrice.value;
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
        return isFixed;
      }
    }).then(result=>{
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
          let letter = {name: 'fixed_delivery', min_delivery_time: 7, max_delivery_time: 10, total_charge: result, coins_value: Math.round(result / realValuePerCoin.hkd)}
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
