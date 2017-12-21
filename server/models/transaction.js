'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
import { makeCalculation } from '../utils/makeTransaction.js';

module.exports = function(Transaction) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Transaction);

  // assgin last updated time / created time to model
  updateTimeStamp(Transaction);

  //assign an unique if its new instance 
  assignKey(Transaction)

  Transaction.observe('after save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let Wallet = app.models.Wallet;
      let { walletId, action, amount } = ctx.instance;
      makeCalculation(Wallet, walletId, 'balance', amount, action)
      next();
    }
  });

  Transaction.clientToken = (userId, cb) => {
    let User = app.models.User ;
    User.findById(userId, (error, user)=>{
      
    })
  }

  Transaction.remoteMethod(
    'clientToken',
    {
      http: { path: '/:userId/clientToken', verb: 'get'},
      accetps: { arg: 'userId', type: 'string', required: true },
      returns: { arg: 'result', type: 'string' }
    }
  )

};
