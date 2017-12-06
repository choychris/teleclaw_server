'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

module.exports = function (Transaction) {

  var app = require('../server');
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Transaction);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Transaction);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Transaction);

  Transaction.observe('after save', function (ctx, next) {
    if (ctx.isNewInstance) {
      var Wallet = app.models.Wallet;
      var _ctx$instance = ctx.instance,
          walletId = _ctx$instance.walletId,
          action = _ctx$instance.action,
          amount = _ctx$instance.amount;
      // console.log('amount : ', amount);

      Wallet.findById(walletId, function (err, wallet) {
        //console.log('update wallet : ', wallet)
        var parsedWallet = JSON.parse(JSON.stringify(wallet));
        // console.log(wallet.updateAttribute);
        // console.log(typeof(wallet.updateAttribute));
        if (action === 'minus') {
          var balance = parsedWallet.balance - amount;
          wallet.updateAttributes({ balance: balance }, function (err, instance) {
            if (err) {
              next(err);
            }
            next();
          });
        } else if (action === 'plus') {
          var _balance = parsedWallet.balance + amount;
          wallet.updateAttributes({ balance: _balance }, function (err, instance) {
            if (err) {
              next(err);
            }
            next();
          });
        };
      });
    }
  });
};