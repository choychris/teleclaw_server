import {updateTimeStamp, assignKey} from '../utils/beforeSave';
import {loggingModel, loggingFunction} from '../utils/createLogging';

const app = require('../server');

module.exports = function(Benchmark) {
  // make loggings for monitor purpose
  loggingModel(Benchmark);

  // assgin an id to each newly created model
  assignKey(Benchmark);

  // assgin last updated time / created time to model
  updateTimeStamp(Benchmark);

  Benchmark.observe('after save', (ctx, next) => {
    if (!ctx.isNewInstance) {
      const {Product} = app.models;
      const {id} = ctx.instance;
      Product.find({where: {benchmarkId: id}})
        .then((products) => {
          if (products.length > 0) {
            products.map((product) => {
              product.updateAttributes({benchmarkId: id});
            });
            next();
          } else {
            next();
          }
          return null;
        }).catch((err) => {
          loggingFunction('Benchmark | ', ' update Product Error | ', err, 'error');
          next(err);
        });
    } else {
      next();
    }
  });

  // function calculateProbi(costRange, overheadCost, marginRate, gamePlayRate, where, next){
  //   ExchangeRate.findOne({order: 'realValuePerCoin.usd DESC'})
  //     .then(rate=>{
  //       let { realValuePerCoin } = rate;
  //       let { min, max } = costRange;
  //       let cost = (min + max)/2 ;
  //       let revenueRequired = ( cost * marginRate * overheadCost );
  //       let valuePerGame = ( gamePlayRate * realValuePerCoin.hkd );
  //       ctx[where]['productRate'] = Math.round(( revenueRequired / valuePerGame )) || 0;
  //       next();
  //       return null
  //     }).catch(err=>{
  //       loggingFunction('Benchmark | ', ' calculateProbi Error | ', err, 'error')
  //       next();
  //     })
  // }
};
