'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

//import { changeFirebaseDb } from '../utils/firebasedb.js';
module.exports = function (Wallet) {

  var app = require('../server');
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Wallet);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Wallet);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Wallet);

  // deprecated firebase api :
  // Wallet.observe('after save', (ctx, next)=>{
  //   let { id, userId, balance } = ctx.instance;
  //   let location = `userInfo/${userId}/wallet`;
  //   if(ctx.isNewInstance){
  //     changeFirebaseDb('set', location, {id: id, balance: balance}, 'Wallet');
  //   } else {
  //     changeFirebaseDb('update', location, {balance: balance}, 'Wallet');
  //   }
  //   next();
  // });
};