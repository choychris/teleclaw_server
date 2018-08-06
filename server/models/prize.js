import { updateTimeStamp, assignKey } from '../utils/beforeSave';
import { loggingModel, loggingFunction } from '../utils/createLogging';
import { createNewTransaction, makeCalculation } from '../utils/makeTransaction';

const Promise = require('bluebird');

const app = require('../server');

module.exports = function(Prize) {
  // make loggings for monitor purpose
  loggingModel(Prize);

  // assgin last updated time / created time to model
  updateTimeStamp(Prize);

  // assign an unique if its new instance
  assignKey(Prize);

  Prize.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      // expire day in milli second
      ctx.instance.expires = new Date().getTime() + (2592000 * 1000);
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
            makeCalculation(Product, productId, 'sku', 1, 'minus');
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
          if (prize) {
            cb(null, { msg: 'success' });
          }
          return null;
        })
        .catch((err) => {
          loggingFunction('Prize |', 'new prize Error', err, 'error');
          cb(err, null);
        });
    } else if (!productId) {
      // with prizeId -> return the prize to get tickets
      Prize.findById(prizeId, (err, prize) => {
        if (err) {
          loggingFunction('Prize |', 'exchange ticket Error', err, 'error');
          cb(err, null);
        }
        if (!prize || (prize.status !== 'normal')) {
          cb(null, { msg: 'invalid_prize' });
          return null;
        }
        Product.findById(prize.productId)
          .then((product) => {
            if (product) {
              makeCalculation(Product, product.id, 'sku', 1, 'plus');
              const ticket = (product.ticketPrice * 0.9);
              // Prize.destroyById(prizeId);
              return createNewTransaction(userId, ticket, 'ticket', 'plus', true, 'ticket');
            }
            return cb(null, { msg: 'invalid_prize' });
          })
          .then((trans) => {
            if (trans) {
              prize.updateAttributes({
                status: 'exchanged',
                transactionId: trans.id,
              });
              cb(null, { ticket: trans.newWalletBalance });
            }
            return null;
          })
          .catch((error) => {
            loggingFunction('Prize |', 'exchange ticket Error', error, 'error');
            cb(error, null);
          });
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

  Prize.beforeRemote('getPrize', (ctx, unused, next) => {
    const { userId } = ctx.args;
    const now = new Date().getTime();
    Prize.find({
      where: {
        userId,
        status: 'normal',
        expires: { lt: now },
      },
    }, (error, prizes) => {
      if (error) {
        console.log(error);
        next();
      }
      if (prizes.length > 0) {
        Promise.map(prizes, prize =>
          prize.updateAttributes({ status: 'expired' }))
          .then(() => {
            next();
            return null;
          })
          .catch((err) => {
            console.log(err);
            next();
          });
      } else {
        next();
      }
    });
  });

  Prize.getPrize = (userId, cb) => {
    Prize.find({
      where: {
        userId,
        or: [
          { status: 'normal' },
          { status: 'pending' },
          { status: 'sent' },
        ],
      },
      include: 'product',
      order: 'created ASC',
    })
      .then((prizes) => {
        cb(null, prizes);
      })
      .catch((error) => {
        cb(error);
      });
  };

  Prize.remoteMethod(
    'getPrize',
    {
      http: { path: '/getPrize/:userId', verb: 'get' },
      accepts: { arg: 'userId', type: 'string', require: true },
      returns: { arg: 'prizes', type: 'array', root: true },
    }
  );
};
