'use strict';

import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';

module.exports = function(Exchangerate){

  const app = require('../server');
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
      Object.keys(currency).map(k=>{
        ctx.instance.realValuePerCoin[k] = calculateRealValue(currency[k], coins, bonus)
      })
      Exchangerate.findOne({where: {status: true}, order: 'realValuePerCoin.usd ASC'}, (err, res)=>{
        ctx.hookState.lowestRate = res.realValuePerCoin.hkd;
      })
      next(); 
    }else{
      next();
    }
  });

  function calculateRealValue(price, coins, bonus){
    let total = (coins + bonus);
    return (Math.round(price / total * 1000) / 1000);
  };

  Exchangerate.observe('after save', (ctx, next)=>{
      
    Exchangerate.findOne({where: {status: true}, order: 'realValuePerCoin.usd ASC'})
    .then(res=>{
      if(res.realValuePerCoin.hkd !== ctx.hookState.lowestRate){
        let { Benchmark } = app.models;
        Benchmark.find({},(err, all)=>{
          all.map(each=>{
            let {  costRange, overheadCost, marginRate, gamePlayRate } = each;
            let { min, max } = costRange;
            let cost = (min + max)/2 ;
            let revenueRequired = ( cost * marginRate * overheadCost );
            let valuePerGame = ( gamePlayRate * res.realValuePerCoin.hkd );
            each.updateAttributes({productRate:Math.round(( revenueRequired / valuePerGame )) || 0})
          })
        })
        next();
      }else{
        next();
      }
    }).catch(error=>{
      loggingFunction('Exchange Rate | ', ' update all benchmark Error | ', error, 'error')
      next(error);
    })

  })

};
