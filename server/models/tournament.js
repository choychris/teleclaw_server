import { assignKey } from '../utils/beforeSave';

module.exports = function(Tournament) {
  assignKey(Tournament);

  Tournament.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      const { duration } = ctx.instance;
      const created = new Date().getTime();
      ctx.instance.created = created;
      ctx.instance.endTime = created + (duration * 1000);
    }
    next();
  });
};
