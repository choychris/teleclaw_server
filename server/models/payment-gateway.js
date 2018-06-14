import {assignKey} from '../utils/beforeSave';
import {loggingModel} from '../utils/createLogging';

module.exports = function(Paymentgateway) {
  loggingModel(Paymentgateway);

  // assgin an id to each newly created model
  assignKey(Paymentgateway);

  // update timeStamp of the gateway
  Paymentgateway.observe('before save', (ctx, next) => {
    const now = new Date().getTime();
    if (ctx.isNewInstance) {
      ctx.instance.created = now;
    }
    next();
  });
};
