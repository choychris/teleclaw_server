'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Exchangerate) {

  //make loggings for monitor purpose
  loggingModel(Exchangerate);

  // assgin last updated time / created time to model
  updateTimeStamp(Exchangerate);

  //assign an unique if its new instance 
  assignKey(Exchangerate)

  Exchangerate.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance || !!ctx.instance){
      let { coins, bonus, currency } = ctx.instance;
      // get the real value per coin i.e. one coin = 0.13 hkd ;
      let realValue = {
        usd: calculateRealValue(currency.usd, coins, bonus),
        hkd: calculateRealValue(currency.hkd, coins, bonus),
        rmb: calculateRealValue(currency.rmb, coins, bonus)
      }
      //console.log(realValue)
      ctx.instance.realValuePerCoin = realValue;
      next(); 
    }else{
      next();
    }
  });

  function calculateRealValue(price, coins, bonus){
    let total = (coins + bonus);
    return (Math.round(price / total * 1000) / 1000);
  };


};
