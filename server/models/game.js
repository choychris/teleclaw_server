module.exports = function(Game) {
  Game.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      ctx.instance.created = new Date();
    }
    next();
  });
};
