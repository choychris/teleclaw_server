'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel, loggingFunction, loggingRemote } from '../utils/createLogging.js';
import { createNewTransaction } from '../utils/makeTransaction.js';
const request = require('request');
const Promise = require('bluebird');
const { EASYSHIP_TOKEN } = process.env; 

module.exports = function(Delivery) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Delivery);
  loggingRemote(Delivery, 'new')
  loggingRemote(Delivery, 'getRate')

  // assgin last updated time / created time to model
  updateTimeStamp(Delivery);

  //assign an unique if its new instance 
  assignKey(Delivery)

  Delivery.new = (data, cb)=>{
    let { Wallet, User, Play, Product } = app.models;
    let { address, cost, status, userId, products, courier, target } = data;
    let items = [];
    if(target == 'user'){
      // update user address everytimes user make a shipping request
      User.findById(userId, (err, foundUser)=>{
        foundUser.updateAttributes({address: address, phone: address.phone, email: address.email})
      });
    };

    Wallet.findOne({where: {userId: userId}}).then(wallet=>{
      // check if user has enough coins to make the shippment
      if(cost > wallet.balance){
        cb(null, 'insufficient_balance');
      }else if(courier.courier_name !== 'fixed_delivery'){
        Promise.map(products, each=>{
          return createitems(Product, each, items, null) //<-- func to format items array, also return arrays of plays Id;
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
        // if user is only shipping fixed delivery products ;
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
      loggingFunction('Delivery | ', ' Create Delivery Error | ', error, 'error')
      cb(error);
    })// <--- Wallet.findOne promise end

    // func to create transaction of user's wallet and update play data
    function recordDelivery(plays){
      createNewTransaction(userId, cost, 'delivery', 'minus', true, null)
      .then(createdTrans=>{
        data.transactionId = createdTrans.id ;
        return Promise.all([Delivery.create(data), createdTrans.newWalletBalance])
      }).then(result=>{
        let newDelivery = result[0];
        let walletBalance = result[1];
        // update plays delivery id:
        return Play.find({where:{or: plays}}, (error, foundPlays)=>{
          Promise.map(foundPlays, eachPlay=>{
            return eachPlay.updateAttributes({deliveryId: newDelivery.id});
          }).then(res=>{
            cb(null, {delivery: newDelivery, newWalletBalance: walletBalance});
          })
        })
      })
    };

    // api request to create Easyship shippment records;
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
          destination_country_alpha2: countryCode.toUpperCase(),
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
            loggingFunction('Delivery | ', 'Request Easyship create shippment error | ', err, 'error');
            reject(err)
          }
          let parsedBody = JSON.parse(body);
          resolve(parsedBody.shipment.easyship_shipment_id)
        })
      })
    }; // <--- api request func end;

  };// <--- Delivery.new remote method end;

  Delivery.remoteMethod(
    'new',
    {
      http: { path: '/new', verb: 'post'},
      accepts: { arg: 'data', type: 'object', required: true },
      returns: { arg: 'result', type: 'object' }
    }
  );

  // function to formate the items array for Eastship API
  // used by both new and getRate remote method
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


  // remote method to get a rate quote from Easyship
  Delivery.getRate = (data, cb) =>{
    let { products, countryCode, postalCode } = data;
    let { Product, ExchangeRate } = app.models;
    let items = [];
    let isFixed = [];

    Promise.map(products, each=>{
      return createitems(Product, each, items, isFixed) //<-- func to format items array, also return arrays of plays Id;
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
          destination_country_alpha2: countryCode.toUpperCase(),
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
      // Find the best value exchange to calculate the coin value;
      return ExchangeRate.findOne({order: 'realValuePerCoin.usd ASC'}).then(rate=>{
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
          let fixed_charge = {
            courier_name: 'fixed_delivery', 
            min_delivery_time: 7, 
            max_delivery_time: 10, 
            total_charge: result, 
            coins_value: Math.round(result / realValuePerCoin.hkd)
          };
          return fixed_charge;
        }
      })
    }).then(choices=>{
      cb(null, choices);
    }).catch(error=>{
      cb(error)
    }); //<--- end of getting rate quote promise

    // api request to Easyship to get rate quote
    function requestToEasyship(options){
      return new Promise((resolve, reject)=>{
        request(options, function(err, res, body){
          if (err){
            console.log(err);
            reject(err)
          }
          let parsedBody = JSON.parse(body);
          // sort the couriers from cheapest
          parsedBody.rates.sort(function(a, b){
            return (a.total_charge - b.total_charge);
          })
          // only return the first 5 cheapest courier options
          parsedBody.rates.splice(5)
          resolve(parsedBody.rates)
        });
      });
    };

  };//<--- end of Delivery.getRate remote method;

  Delivery.remoteMethod(
    'getRate',
    {
      http: { path: '/getRate', verb: 'post'},
      accepts: { arg: 'data', type: 'object', required: true },
      returns: { arg: 'result', type: 'array' }
    }
  );
};
