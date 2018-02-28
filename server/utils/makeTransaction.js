import { loggingFunction } from './createLogging.js';
const Promise = require('bluebird');

export function makeCalculation(model, modelId, modelAttribute, amount, plusOrMinus){
  model.findById(modelId, (err, foundModel)=>{
    if(plusOrMinus === 'minus'){
      let newNumber = foundModel[modelAttribute] - amount;
      let roundNumber = Math.round(newNumber);
      foundModel.updateAttributes({[modelAttribute]: roundNumber}, (err, instance)=>{
        if(err){
          loggingFunction(`${model} | `, 'makeCalculation error | ', err, 'error')
        }
      });
    }else if(plusOrMinus === 'plus'){
      let newNumber = foundModel[modelAttribute] + amount;
      let roundNumber = Math.round(newNumber);
       foundModel.updateAttributes({[modelAttribute]: roundNumber}, (err, instance)=>{
        if(err){
          loggingFunction(`${model} | `, 'makeCalculation error | ', err, 'error')
        }
      });
    }
  });
};

export function createNewTransaction(userId, amount, type, action, status, gateway){
 var app = require('../server');
 let Wallet = app.models.Wallet;
 let Transaction = app.models.Transaction;
 return new Promise((resolve, reject)=>{
  //find user's wallet to get wallet id
    Wallet.findOne({where: {userId:userId}}, (err, wallet)=>{
      if(err){
        loggingFunction('Wallet | ', 'Wallet.findOne in createNewTransaction error | ', err, 'error')
        reject(err);
        return err;
      }
      let transacObject = {
        action: action,
        amount: amount,
        transactionType: type,
        success: status,
        walletId: wallet.id,
        userId: userId,
      }
      if(!!gateway){transacObject.gatewayResponse = gateway};
      // create a new transaction record
      Transaction.create(transacObject, (error, createdTrans)=>{
        if(error){
          loggingFunction('Transaction | ', 'create trans in createNewTransaction error | ', error, 'error')
          reject(error);
          return error;
        }
        if(action === 'minus' && status){
          createdTrans.newWalletBalance = wallet.balance - createdTrans.amount;
        }else if(action === 'plus' && status){
          createdTrans.newWalletBalance = wallet.balance + createdTrans.amount;
        }else{
          createdTrans.newWalletBalance = wallet.balance;
        }
        resolve(createdTrans);
        return createdTrans
      });
    });//<--- find User function ended
 });//<--- promise ended
};

