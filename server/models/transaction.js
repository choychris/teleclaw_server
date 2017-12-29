'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel, loggingFunction } from '../utils/createLogging.js';
import { makeCalculation, createNewTransaction } from '../utils/makeTransaction.js';

const braintree = require("braintree");
const shortid = require('shortid');
const Promise = require('bluebird');

let { NODE_ENV, BRAINTREE_MERCHANTID, BRAINTREE_PUBLICKEY, BRAINTREE_PRIVATEKEY } = process.env ;
let braintreeEnv = NODE_ENV === 'production' ? braintree.Environment.Production : braintree.Environment.Sandbox;

var braintreeGateway = braintree.connect({
  environment: braintreeEnv,
  merchantId: BRAINTREE_MERCHANTID,
  publicKey: BRAINTREE_PUBLICKEY,
  privateKey: BRAINTREE_PRIVATEKEY
});

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
        // calling the function to generate braintree token
        generateToken(gateway.id, cb)
        return null
      }
    }).then(newGateway=>{
      if(newGateway !== null){
        let customerId = newGateway.id
        // create a customer in braintree
        braintreeGateway.customer.create({id: customerId}, function(brainTreeErr, result){
          if(brainTreeErr){
            loggingFunction({Model: 'Transaction', Function: 'Create BrainTree Customer', Error : brainTreeErr}, 0)
            cb(brainTreeErr)
          }
          // calling the function to generate braintree token
          generateToken(customerId, cb)
        })
      }
    }).catch(err=>{
      loggingFunction({Model: 'Transaction', Function: 'Paymentgateway.findOne', Error : err}, 0)
      cb(err)
    });

    // function to generate a braintree client token
    function generateToken(id, cb){
      braintreeGateway.clientToken.generate({customerId: id}, function(err, response){
        if(err){
          loggingFunction({Model: 'Transaction', Function: 'Braintree generate clientToken', Error : err}, 0)
          cb(err)
        }
        //let token = response.clientToken.length != 1 ? response.clientToken : response.clientToken[0];
        loggingFunction({Model: 'Transaction', Function: 'Braintree generate clientToken', Response: response.clientToken}, 2)
        cb(null, response.clientToken)
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
      let saleConfig = {
        amount: `${foundRate.currency.usd}.00`,
        paymentMethodNonce: paymentNonce,
        customerId: foundGateway.id,
        options: {
          submitForSettlement: true,
          storeInVaultOnSuccess: true
        }
      }
      return [braintreeGateway.transaction.sale(saleConfig), foundRate];
    }).spread((result, rate)=>{
      let { coins, bonus } = rate;
      let tolalCoins = (coins + bonus);
      if(result.success){
        let { success, transaction } = result;
        let { id, status, amount, currencyIsoCode, merchantAccountId, paymentInstrumentType, creditCard } = transaction;
        let { cardType } = creditCard;
        let gatewayReponse = { id, status, amount, currencyIsoCode, merchantAccountId, paymentInstrumentType, cardType };
        loggingFunction({Model: 'Transaction', Function: 'Braintree Transaction Success', Response: result.transaction }, 2)
        createNewTransaction(userId, tolalCoins, 'topUp', 'plus', success, gatewayReponse)
          .then(trans=>{
            cb(null, {success: success, message: status, balance: trans.newWalletBalance})
            return null;
          });
      } else {
        loggingFunction({Model: 'Transaction', Function: 'Braintree Transaction Error', Error: result }, 0)
        let { success, message, params } = result;
        let gatewayReponse = {message: message, amount: params.transaction.amount }
        createNewTransaction(userId, tolalCoins, 'topUp', 'plus', success, gatewayReponse)
          .then(trans=>{
            cb(null, {success: success, message: message, balance: trans.newWalletBalance})
            return null;
          });
      }
      return null;
    }).catch(error=>{
      loggingFunction({Model: 'Transaction', Function: 'Create Sale Function Error', Error: error }, 0)
      cb(error)
    });
  };

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
