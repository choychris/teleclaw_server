'use strict';

import { updateTimeStamp } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js'

module.exports = function(Transaction) {

  var app = require('../server');
  //make loggings for monitor purpose
  loggingModel(Transaction);

  // assgin last updated time / created time to model
  updateTimeStamp(Transaction);

  Transaction.observe('after save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let Wallet = app.models.Wallet;
      let { walletId, action, amount } = ctx.instance;
      Wallet.findById(walletId, (err, wallet)=>{
        if(action === 'minus'){
          let balance = wallent.balance - amount;
          wallet.updateAttribute({balance: balance}, (err, instance)=>{
            if(err){
              console.log(err);
            }else{
              console.log(instance);
            }
          });
        }else if(action === 'plus'){
          let balance = wallent.balance + amount;
          wallet.updateAttribute({balance: balance}, (err, instance)=>{
            if(err){
              console.log(err);
            }else{
              console.log(instance);
            }
          });
        };
      });
    }
    next();
  });

};
