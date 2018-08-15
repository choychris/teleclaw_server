import { loggingFunction } from './createLogging';

const Promise = require('bluebird');
const app = require('../server');

export function makeCalculation(model, modelId, modelAttribute, amount, plusOrMinus) {
  model.findById(modelId, (err, foundModel) => {
    const current = foundModel[modelAttribute] || 0;
    // console.log('amount', amount);
    // console.log('current', current);
    if (plusOrMinus === 'minus') {
      const newNumber = current - amount;
      const roundNumber = Math.round(newNumber);
      foundModel.updateAttributes({ [modelAttribute]: roundNumber }, (error) => {
        if (err) {
          loggingFunction(`${model} | `, 'makeCalculation error | ', error, 'error');
        }
      });
    } else if (plusOrMinus === 'plus') {
      const newNumber = current + amount;
      const roundNumber = Math.round(newNumber);
      foundModel.updateAttributes({ [modelAttribute]: roundNumber }, (error) => {
        if (err) {
          loggingFunction(`${model} | `, 'makeCalculation error | ', error, 'error');
        }
      });
    }
  });
}

export function createNewTransaction(userId, amount, type, action, status, category = 'coin', gateway = undefined) {
  const { Wallet, Transaction } = app.models;
  return new Promise((resolve, reject) => {
  // find user's wallet to get wallet id
    Wallet.findOne({ where: { userId } }, (err, wallet) => {
      if (err) {
        loggingFunction('Wallet | ', 'Wallet.findOne in createNewTransaction error | ', err, 'error');
        return reject(err);
      }
      const transacObject = {
        action,
        amount,
        transactionType: type,
        success: status,
        walletId: wallet.id,
        userId,
        category,
      };
      if (gateway !== undefined) { transacObject.gatewayResponse = gateway; }
      // create a new transaction record
      Transaction.create(transacObject, (error, createdTrans) => {
        if (error) {
          loggingFunction('Transaction | ', 'create trans in createNewTransaction error | ', error, 'error');
          return reject(error);
        }
        const attribute = (category === 'ticket') ? 'ticket' : 'balance';
        if (!wallet[attribute]) {
          createdTrans.newWalletBalance = createdTrans.amount;
        } else if (action === 'minus' && status) {
          createdTrans.newWalletBalance = wallet[attribute] - createdTrans.amount;
        } else if (action === 'plus' && status) {
          createdTrans.newWalletBalance = wallet[attribute] + createdTrans.amount;
        } else {
          createdTrans.newWalletBalance = wallet[attribute];
        }
        return resolve(createdTrans);
      });// <--- create transaction object ended
      return null;
    });// <--- find User wallet function ended
  });// <--- promise ended
}

