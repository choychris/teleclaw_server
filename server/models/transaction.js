'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

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
      console.log('amount : ', amount);
      Wallet.findById(walletId, (err, wallet)=>{
        //console.log('update wallet : ', wallet)
        let parsedWallet = JSON.parse(JSON.stringify(wallet));
        // console.log(wallet.updateAttribute);
        // console.log(typeof(wallet.updateAttribute));
        if(action === 'minus'){
          let balance = parsedWallet.balance - amount;
          wallet.updateAttributes({balance: balance}, (err, instance)=>{
            console.log('balance : ', balance);
            if(err){
              console.log(err);
            }else{
              console.log(instance);
            }
          next();  
          });
        }else if(action === 'plus'){
          let balance = parsedWallet.balance + amount;
          wallet.updateAttributes({balance: balance}, (err, instance)=>{
            if(err){
              console.log(err);
            }else{
              console.log(instance);
            }
          next();  
          });
        };
      });
    }
  });
};
