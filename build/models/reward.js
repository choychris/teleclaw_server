'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var _makeTransaction = require('../utils/makeTransaction.js');

module.exports = function (Reward) {
  var app = require('../server');

  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Reward);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Reward);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Reward);

  Reward.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance) {
      var _ctx$instance = ctx.instance,
          type = _ctx$instance.type,
          rewardAmount = _ctx$instance.rewardAmount,
          userId = _ctx$instance.userId;

      (0, _makeTransaction.createNewTransaction)(userId, rewardAmount, type, 'plus', true).then(function (createdTrans) {
        ctx.instance.id = createdTrans.id;
        next();
        return null;
      }).catch(function (err) {
        next(err);
      });
    } else {
      next();
    }
  });

  Reward.refer = function (data, cb) {
    var userId = data.userId,
        referralCode = data.referralCode;

    var User = app.models.User;
    var Event = app.models.Event;
    User.findById(userId).then(function (user) {
      if (user.referral.isRefer) {
        cb(null, 'already_referred');
      } else {}
    }).catch(function (error) {
      cb(error);
    });

    function findUserByCode(referralCode) {
      var User = app.models.User;
      User.findOne({ where: { 'referral.code': referralCode } }, function (err, user) {});
    }
  };

  Reward.remoteMethod('refer', {
    http: { path: '/refer', verb: 'post' },
    accepts: { arg: 'data', type: 'object', required: true },
    returns: { arg: 'result', type: 'object' }
  });
};