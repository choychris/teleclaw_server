import { updateTimeStamp } from '../utils/beforeSave';
import { loggingModel, loggingFunction, loggingRemote } from '../utils/createLogging';
import { makeCalculation, createNewTransaction } from '../utils/makeTransaction';

const braintree = require('braintree');
const shortid = require('shortid');
const Promise = require('bluebird');

const {
  NODE_ENV,
  BRAINTREE_MERCHANTID,
  BRAINTREE_PUBLICKEY,
  BRAINTREE_PRIVATEKEY,
} = process.env;
const braintreeEnv = NODE_ENV === 'production' ?
  braintree.Environment.Production : braintree.Environment.Sandbox;

const braintreeGateway = braintree.connect({
  environment: braintreeEnv,
  merchantId: BRAINTREE_MERCHANTID,
  publicKey: BRAINTREE_PUBLICKEY,
  privateKey: BRAINTREE_PRIVATEKEY,
});

const app = require('../server');

module.exports = function(Transaction) {
  // make loggings for monitor purpose
  loggingModel(Transaction);
  loggingRemote(Transaction, 'clientToken');
  loggingRemote(Transaction, 'createSale');

  // assgin last updated time / created time to model
  updateTimeStamp(Transaction);

  // assign an unique if its new instance
  Transaction.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      ctx.instance.id = shortid.generate();
    }
    next();
  });

  Transaction.observe('after save', (ctx, next) => {
    if (ctx.isNewInstance) {
      const { Wallet } = app.models;
      const {
        walletId, action, amount, success,
      } = ctx.instance;
      if (success) {
        // update wallet balance when a transaction is made;
        makeCalculation(Wallet, walletId, 'balance', amount, action);
      }
    }
    next();
  });

  // remote method to create braintree client token
  Transaction.clientToken = (userId, cb) => {
    const { Paymentgateway } = app.models;
    Paymentgateway.findOne({ where: { userId } }).then((gateway) => {
      if (gateway === null) {
        return Paymentgateway.create({ userId });
      }
      // calling the function to generate braintree token
      generateToken(gateway.id, cb);
      return null;
    }).then((newGateway) => {
      if (newGateway !== null) {
        const customerId = newGateway.id;
        // create a customer in braintree
        braintreeGateway.customer.create({ id: customerId }, (brainTreeErr) => {
          if (brainTreeErr) {
            loggingFunction('Transaction | ', 'Create BrainTree Customer | ', brainTreeErr, 'error');
            cb(brainTreeErr);
          }
          // calling the function to generate braintree token
          generateToken(customerId, cb);
        });
      }
    }).catch((err) => {
      loggingFunction('Transaction | ', 'Paymentgateway.findOne | ', err, 'error');
      cb(err);
    });

    // braintree sdk request to generate a braintree client token
    function generateToken(id, callback) {
      braintreeGateway.clientToken.generate({ customerId: id }, (err, response) => {
        if (err) {
          loggingFunction('Transaction | ', 'Braintree generate clientToken | ', err, 'error');
          cb(err);
        }
        // let token = response.clientToken.length != 1 ? response.clientToken : response.clientToken[0];
        // console.log('Braintree generate clientToken | ', response);
        // loggingFunction('Transaction | ', 'Braintree generate clientToken | ', response)
        callback(null, response.clientToken);
      });
    }
  };// <-- clientToken remote method end

  Transaction.remoteMethod(
    'clientToken',
    {
      http: { path: '/:userId/clientToken', verb: 'get' },
      accepts: [
        { arg: 'userId', type: 'string', required: true },
      ],
      returns: { arg: 'result', type: 'object' },
    }
  );

  // remote method for user to topUp
  Transaction.createSale = (userId, data, cb) => {
    const { paymentNonce, rateId } = data;
    const { ExchangeRate, PaymentGateway } = app.models;

    Promise.all([
      ExchangeRate.findById(rateId),
      PaymentGateway.findOne({ where: { userId } }),
    ]).then((result) => {
      const foundRate = result[0];
      const foundGateway = result[1];
      const saleConfig = {
        amount: `${foundRate.currency.hkd}.00`,
        paymentMethodNonce: paymentNonce,
        customerId: foundGateway.id,
        options: {
          submitForSettlement: true,
          storeInVaultOnSuccess: true,
          paypal: {
            description: 'Teleclaw Coins Purchase.',
          },
        },
      };
      return [braintreeGateway.transaction.sale(saleConfig), foundRate];
    }).spread((result, rate) => {
      const { coins, bonus } = rate;
      const tolalCoins = (coins + bonus);
      if (result.success) {
        const { success, transaction } = result;
        const {
          id, status, amount, currencyIsoCode, merchantAccountId, paymentInstrumentType, creditCard,
        } = transaction;
        const { cardType } = creditCard;
        const gatewayReponse = {
          id, status, amount, currencyIsoCode, merchantAccountId, paymentInstrumentType, cardType,
        };
        loggingFunction('Transaction | ', 'Braintree Transaction Success | ', gatewayReponse);
        createNewTransaction(userId, tolalCoins, 'topUp', 'plus', success, gatewayReponse)
          .then((trans) => {
            cb(null, { success, message: status, balance: trans.newWalletBalance });
            return null;
          });
      } else {
        const { success, message, params } = result;
        const responseMessage = result.transaction.processorResponseCode ?
          `${message} (code : ${result.transaction.processorResponseCode})` : message;
        loggingFunction('Transaction | ', 'Braintree Transaction Error | ', responseMessage, 'error');
        const gatewayReponse = { message, amount: params.transaction.amount };
        if (result.transaction) {
          gatewayReponse.transaction = {
            id: result.transaction.id,
            status: result.transaction.status,
            gatewayRejectionReason: result.transaction.gatewayRejectionReason,
            processorResponseCode: result.transaction.processorResponseCode,
            processorResponseText: result.transaction.processorResponseText,
            additionalProcessorResponse: result.transaction.additionalProcessorResponse,
            processorSettlementResponseCode: result.transaction.processorSettlementResponseCode,
            processorSettlementResponseText: result.transaction.processorSettlementResponseText,
          };
        }
        createNewTransaction(userId, tolalCoins, 'topUp', 'plus', success, gatewayReponse)
          .then((trans) => {
            cb(null, { success, message: responseMessage, balance: trans.newWalletBalance });
            return null;
          });
      }
      return null;
    }).catch((error) => {
      loggingFunction('Transaction | ', 'Create Sale Function Error | ', error, 'error');
      cb(error);
    });// <-- promise chain end
  };// <-- createSale remote method end

  Transaction.remoteMethod(
    'createSale',
    {
      http: { path: '/:userId/createSale', verb: 'post' },
      accepts: [
        { arg: 'userId', type: 'string', required: true },
        { arg: 'data', type: 'object', required: true },
      ],
      returns: { arg: 'result', type: 'object' },
    }
  );
};
