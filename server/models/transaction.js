'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { makeCalculation, createNewTransaction } from '../utils/makeTransaction.js';

const shortid = require('shortid');
const Promise = require('bluebird');

module.exports = function(Transaction) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Transaction);

  // assgin last updated time / created time to model
  updateTimeStamp(Transaction);

  //assign an unique if its new instance 
  Transaction.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){
      ctx.instance.id = shortid.generate();
    }
    next();
  })

  Transaction.observe('after save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let Wallet = app.models.Wallet;
      let { walletId, action, amount, success } = ctx.instance;
      if(success){
        makeCalculation(Wallet, walletId, 'balance', amount, action)
      }
    }
    next();
  });

  Transaction.clientToken = (userId, cb) => {
    let Paymentgateway = app.models.PaymentGateway;
    Paymentgateway.findOne({where:{userId: userId}}).then(gateway=>{
      if(gateway === null){
        return Paymentgateway.create({userId: userId})
      }else{
        generateToken(gateway.id, cb)
        return null
      }
    }).then(newGateway=>{
      if(newGateway !== null){
        let customerId = newGateway.id
        app.braintreeGateway.customer.create({id: customerId}, function(brainTreeErr, result){
          if(brainTreeErr){
            console.log('Create BrainTree customer error : ', brainTreeErr)
            cb(brainTreeErr)
          }
          generateToken(customerId, cb)
        })
      }
    }).catch(err=>{
      cb(err)
    });

    function generateToken(id, cb){
      app.braintreeGateway.clientToken.generate({customerId: id}, function(err, response){
        if(err){
          console.log('Generate BrainTree Token Error : ', err)
          cb(err)
        }
        let token = response.clientToken.length != 1 ? response.clientToken : response.clientToken[0];
        console.log('Generate BrainTree Token Response : ', response)
        cb(null, token)
      })
    }
  };

  Transaction.remoteMethod(
    'clientToken',
    {
      http: {path: '/:userId/clientToken', verb: 'get'},
      accepts: [
        {arg: 'userId', type: 'string', required: true}
      ],
      returns: {arg: 'result', type: 'object'}
    }
  );


  Transaction.createSale = (userId, data, cb) => {
    let { paymentNonce, rateId } = data;
    let ExchangeRate = app.models.ExchangeRate;
    let Paymentgateway = app.models.PaymentGateway;
    Promise.all([
      ExchangeRate.findById(rateId), 
      Paymentgateway.findOne({where: {userId: userId}})
    ]).then(result=>{
      let foundRate = result[0];
      let foundGateway = result[1];
      return brainTreeSale(userId, foundRate.currency.usd, paymentNonce, foundGateway.id)
    }).then(result=>{
      let { success, amount, res } = result;
      console.log('result ==== :', result);
      if(success){
        console.log('success here :', success)
      }
      //createNewTransaction(userId, amount, 'topUp', 'plus', success, res)
      return null
    }).catch(error=>{
      if(error.res){
        console.log('manul error here :', error)
      }
      cb(error)
    });

    function brainTreeSale(userId, amount, paymentNonce, gatewayId){
      return new Promise((resolve, reject)=>{
        app.braintreeGateway.transaction.sale({
          amount: `${amount}.00`,
          paymentMethodNonce: paymentNonce,
          customerId: gatewayId,
          options: {
            submitForSettlement: true,
            storeInVaultOnSuccess: true
          }
        }, function(err, result){
          if(err){
            console.log("BrainTree create transaction error : ", err)
            reject(err)
          }else if(result.success){
            let { id, status, type, currencyIsoCode, amount, merchantAccountId, paymentInstrumentType } = result.transaction;
            let response = { id, status, type, currencyIsoCode, amount, merchantAccountId, paymentInstrumentType };
            console.log("BrainTree create transaction result : ", result)
            resolve({success: result.success, amount: amount, res: reponse})
          }else{
            console.log("BrainTree create transaction fail : ", result)
            reject(result)
          }
        });
      })
    };

  }

  Transaction.remoteMethod(
    'createSale',
    {
      http: {path: '/:userId/createSale', verb: 'post'},
      accepts: [
        {arg: 'userId', type: 'string', required: true},
        {arg: 'data', type: 'object', required: true},
      ],
      returns: {arg: 'result', type: 'object'}
    }
  );

};
