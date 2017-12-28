'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var _makeTransaction = require('../utils/makeTransaction.js');

var shortid = require('shortid');
var Promise = require('bluebird');

module.exports = function (Transaction) {

  var app = require('../server');
  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(Transaction);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(Transaction);

  //assign an unique if its new instance 
  Transaction.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance) {
      ctx.instance.id = shortid.generate();
    }
    next();
  });

  Transaction.observe('after save', function (ctx, next) {
    if (ctx.isNewInstance) {
      var Wallet = app.models.Wallet;
      var _ctx$instance = ctx.instance,
          walletId = _ctx$instance.walletId,
          action = _ctx$instance.action,
          amount = _ctx$instance.amount,
          success = _ctx$instance.success;

      if (success) {
        (0, _makeTransaction.makeCalculation)(Wallet, walletId, 'balance', amount, action);
      }
    }
    next();
  });

  Transaction.clientToken = function (userId, cb) {
    var Paymentgateway = app.models.PaymentGateway;
    Paymentgateway.findOne({ where: { userId: userId } }).then(function (gateway) {
      if (gateway === null) {
        return Paymentgateway.create({ userId: userId });
      } else {
        // calling the function to generate braintree token
        generateToken(gateway.id, cb);
        return null;
      }
    }).then(function (newGateway) {
      if (newGateway !== null) {
        var customerId = newGateway.id;
        // create a customer in braintree
        app.braintreeGateway.customer.create({ id: customerId }, function (brainTreeErr, result) {
          if (brainTreeErr) {
            console.log('Create BrainTree customer error : ', brainTreeErr);
            cb(brainTreeErr);
          }
          // calling the function to generate braintree token
          generateToken(customerId, cb);
        });
      }
    }).catch(function (err) {
      cb(err);
    });

    // function to generate a braintree client token
    function generateToken(id, cb) {
      app.braintreeGateway.clientToken.generate({ customerId: id }, function (err, response) {
        if (err) {
          console.log('Generate BrainTree Token Error : ', err);
          cb(err);
        }
        //let token = response.clientToken.length != 1 ? response.clientToken : response.clientToken[0];
        console.log('Generate BrainTree Token Response : ', response);
        cb(null, response.clientToken);
      });
    }
  };

  Transaction.remoteMethod('clientToken', {
    http: { path: '/:userId/clientToken', verb: 'get' },
    accepts: [{ arg: 'userId', type: 'string', required: true }],
    returns: { arg: 'result', type: 'object' }
  });

  Transaction.createSale = function (userId, data, cb) {
    var paymentNonce = data.paymentNonce,
        rateId = data.rateId;

    var ExchangeRate = app.models.ExchangeRate;
    var Paymentgateway = app.models.PaymentGateway;
    Promise.all([ExchangeRate.findById(rateId), Paymentgateway.findOne({ where: { userId: userId } })]).then(function (result) {
      var foundRate = result[0];
      var foundGateway = result[1];
      var saleConfig = {
        amount: foundRate.currency.usd + '.00',
        paymentMethodNonce: paymentNonce,
        customerId: foundGateway.id,
        options: {
          submitForSettlement: true,
          storeInVaultOnSuccess: true
        }
      };
      return [app.braintreeGateway.transaction.sale(saleConfig), foundRate];
    }).spread(function (result, rate) {
      var coins = rate.coins,
          bonus = rate.bonus;

      var tolalCoins = coins + bonus;
      if (result.success) {
        var success = result.success,
            transaction = result.transaction;
        var id = transaction.id,
            status = transaction.status,
            amount = transaction.amount,
            currencyIsoCode = transaction.currencyIsoCode,
            merchantAccountId = transaction.merchantAccountId,
            paymentInstrumentType = transaction.paymentInstrumentType,
            creditCard = transaction.creditCard;
        var cardType = creditCard.cardType;

        var gatewayReponse = { id: id, status: status, amount: amount, currencyIsoCode: currencyIsoCode, merchantAccountId: merchantAccountId, paymentInstrumentType: paymentInstrumentType, cardType: cardType };
        console.log('result success ==== :', result);
        (0, _makeTransaction.createNewTransaction)(userId, tolalCoins, 'topUp', 'plus', success, gatewayReponse).then(function (trans) {
          cb(null, { success: success, message: status, balance: trans.newWalletBalance });
          return null;
        });
      } else {
        console.error('result error ==== :', result);
        var _success = result.success,
            message = result.message,
            params = result.params;

        var _gatewayReponse = { message: message, amount: params.transaction.amount };
        (0, _makeTransaction.createNewTransaction)(userId, tolalCoins, 'topUp', 'plus', _success, _gatewayReponse).then(function (trans) {
          cb(null, { success: _success, message: message, balance: trans.newWalletBalance });
          return null;
        });
      }
      return null;
    }).catch(function (error) {
      console.log('Error in creating Braintree transaction : ', error);
      cb(error);
    });
  };

  Transaction.remoteMethod('createSale', {
    http: { path: '/:userId/createSale', verb: 'post' },
    accepts: [{ arg: 'userId', type: 'string', required: true }, { arg: 'data', type: 'object', required: true }],
    returns: { arg: 'result', type: 'object' }
  });
};