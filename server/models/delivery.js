'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
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

  Delivery.getRate = (data, cb) =>{
    let { products, countryCode, postalCode } = data;
    console.log('data : ', data)
    let Product = app.models.Product;
    let items = [];

    Product.find({ 
      where: {or: products}, 
      fields: {weight: true, size: true}
    }).then(result=>{
      return Promise.map(result, each=>{
        let { weight, size } = each;
        let { height, width, length } = size;
        let { value } = weight;
        let item = { 
          actual_weight: value,
          height: height,
          width: width,
          length: length,
          category: 'toys',
          declared_currency: 'HKD',
          declared_customs_value: 0
        }
        items.push(item);
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
      console.log('options : ', options);
      request(options, function(err, res, body){
        if (err){
          console.log(err);
          cb(err)
        } 
        console.log('res body from easyship : ==', body.rates);
        cb(null, body.rates);
      })
      // cb(null, 'ok');
    }).catch(error=>{
      cb(error)
    });

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
