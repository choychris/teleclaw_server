'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel, loggingRemote } from '../utils/createLogging.js';

module.exports = function(Wallet) {

  var app = require('../server');
  var firebase = app.firebaseApp;
  var firebasedb = firebase.database();

  //make loggings for monitor purpose
  loggingModel(Wallet);

  // assgin last updated time / created time to model
  updateTimeStamp(Wallet);

  //assign an unique if its new instance 
  assignKey(Wallet)

  Wallet.observe('after save', (ctx, next)=>{
    let ref = firebasedb.ref(`userInfo/${ctx.instance.userId}/wallet`);
    if(ctx.isNewInstance){
      ref.set({balance: ctx.instance.balance});
    } else {
      ref.update({balance: ctx.instance.balance});
    }
  });
};
