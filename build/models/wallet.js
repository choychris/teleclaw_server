'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var _firebasedb = require('../utils/firebasedb.js');

module.exports = function (Wallet) {

  var app = require('../server');
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Wallet);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Wallet);

  //assign an unique if its new instance 
  (0, _beforeSave.assignKey)(Wallet);

  Wallet.observe('after save', function (ctx, next) {
    var _ctx$instance = ctx.instance,
        id = _ctx$instance.id,
        userId = _ctx$instance.userId,
        balance = _ctx$instance.balance;

    var location = 'userInfo/' + userId + '/wallet';
    if (ctx.isNewInstance) {
      (0, _firebasedb.changeFirebaseDb)('set', location, { id: id, balance: balance }, 'Wallet');
    } else {
      (0, _firebasedb.changeFirebaseDb)('update', location, { balance: balance }, 'Wallet');
    }
    next();
  });
};