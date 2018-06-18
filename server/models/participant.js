import { assignKey } from '../utils/beforeSave';
import { loggingModel } from '../utils/createLogging';

module.exports = function(Participant) {
  assignKey(Participant);
  loggingModel(Participant);
  Participant.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      ctx.instance.created = new Date();
    }
    next();
  });
};
