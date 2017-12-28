'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

module.exports = function (Exchangerate) {

  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Exchangerate);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Exchangerate);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Exchangerate);

  Exchangerate.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance || !!ctx.instance) {
      var _ctx$instance = ctx.instance,
          coins = _ctx$instance.coins,
          bonus = _ctx$instance.bonus,
          currency = _ctx$instance.currency;

      var realValue = {
        usd: calculateRealValue(currency.usd, coins, bonus),
        hkd: calculateRealValue(currency.hkd, coins, bonus),
        rmb: calculateRealValue(currency.rmb, coins, bonus)
      };
      console.log(realValue);
      ctx.instance.realValuePerCoin = realValue;
      next();
    } else {
      next();
    }
  });

  function calculateRealValue(price, coins, bonus) {
    var total = coins + bonus;
    return Math.round(price / total * 1000) / 1000;
  }
};