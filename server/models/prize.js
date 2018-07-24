import { updateTimeStamp, assignKey } from '../utils/beforeSave';
import { loggingModel, loggingFunction } from '../utils/createLogging';
import { createNewTransaction } from '../utils/makeTransaction';

const Promise = require('bluebird');

const app = require('../server');

module.exports = function(Prize) {
  // make loggings for monitor purpose
  loggingModel(Prize);

  // assgin last updated time / created time to model
  updateTimeStamp(Prize);

  // assign an unique if its new instance
  assignKey(Prize);

  Prize.observe('before Save', (ctx, next) => {
    if (ctx.isNewInstance) {
      // expire day in milli second
      ctx.instance.expires = new Date().getTime() + (77760000 * 1000);
    }
    next();
  });

  Prize.exchange = (data, cb) => {
    const { userId, productId, prizeId } = data;
    const { Wallet, Product, Transaction } = app.models;

    if ((!productId && !prizeId) || !userId) {
      cb(null, { msg: 'invalid_data' });
    }
    // no prizeId -> acquire new prize with tickets
    if (!prizeId) {
      Promise.all([
        Wallet.findOne({ where: { userId } }),
        Product.findById(productId),
      ])
        .then((result) => {
          const wallet = result[0];
          const product = result[1];
          if (wallet.ticket >= product.ticketPrice) {
            return Transaction.create({
              action: 'minus',
              amount: product.ticketPrice,
              transactionType: 'prize',
              success: true,
              walletId: wallet.id,
              userId,
              category: 'ticket',
            });
          }
          cb(null, { msg: 'not_enough_ticket' });
          return null;
        })
        .then((trans) => {
          if (trans) {
            return Prize.create({
              userId,
              productId,
              transactionId: trans.id,
              status: 'normal',
            });
          }
          return null;
        })
        .then((prize) => {
          if (prize) cb(null, { msg: 'success' });
          return null;
        })
        .catch((err) => {
          loggingFunction('Prize |', 'new prize Error', err, 'error');
          cb(err, null);
        });
    } else if (!productId) {
      // with prizeId -> return the prize to get tickets
      Prize.findById(prizeId)
        .then((prize) => {
          if (!prize || (prize.status !== 'normal')) {
            cb(null, { msg: 'invalid_prize' });
            return null;
          }
          prize.updateAttributes({ status: 'exchanged' });
          return Product.findById(prize.productId);
        })
        .then((product) => {
          if (product) {
            const ticket = (product.ticketPrice * 0.9);
            // Prize.destroyById(prizeId);
            return createNewTransaction(userId, ticket, 'ticket', 'plus', true, 'ticket');
          }
          return null;
        })
        .then((trans) => {
          if (trans) cb(null, { ticket: trans.newWalletBalance });
          return null;
        })
        .catch((error) => {
          loggingFunction('Prize |', 'exchange ticket Error', error, 'error');
          cb(error, null);
        });
    }
  };

  Prize.remoteMethod(
    'exchange',
    {
      http: { path: '/exchange', verb: 'post' },
      accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
      returns: { arg: 'res', type: 'object' },
    }
  );
};
