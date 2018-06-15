import { updateTimeStamp, assignKey } from '../utils/beforeSave';
import { loggingModel } from '../utils/createLogging';
// import { changeFirebaseDb } from '../utils/firebasedb.js';
// const app = require('../server');

module.exports = function(Wallet) {
  // make loggings for monitor purpose
  loggingModel(Wallet);

  // assgin last updated time / created time to model
  updateTimeStamp(Wallet);

  // assign an unique if its new instance
  assignKey(Wallet);

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
