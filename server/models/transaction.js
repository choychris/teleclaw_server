'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { makeCalculation } from '../utils/makeTransaction.js';

const shortid = require('shortid');

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
      let { walletId, action, amount } = ctx.instance;
      makeCalculation(Wallet, walletId, 'balance', amount, action)
    }
    next();
  });

  Transaction.clientToken = function(userId, cb){
    console.log("userId :::: ", userId);
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
      app.braintreeGateway.clientToken.generate({customerId: id}, function(err, res){
        if(err){
          console.log('Generate BrainTree Token Error : ', err)
          cb(err)
        }
        console.log('Generate BrainTree Token Response : ', res)
        cb(null, res)
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

};
