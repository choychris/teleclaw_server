const Promise = require('bluebird');

export function makeCalculation(model, modelId, modelAttribute, amount, plusOrMinus){
  model.findById(modelId, (err, foundModel)=>{
    let parsedModel = JSON.parse(JSON.stringify(foundModel));
    if(plusOrMinus === 'minus'){
      let newNumber = parsedModel[modelAttribute] - amount;
      let roundNumber = Math.round(newNumber);
      foundModel.updateAttributes({[modelAttribute]: roundNumber}, (err, instance)=>{
        if(err){
          console.log('err in ', modelAttribute, 'calculation : ', err)
        }
      });
    }else if(plusOrMinus === 'plus'){
      let newNumber = parsedModel[modelAttribute] + amount;
      let roundNumber = Math.round(newNumber);
       foundModel.updateAttributes({[modelAttribute]: roundNumber}, (err, instance)=>{
        if(err){
          console.log('err in ', modelAttribute, 'calculation : ', err)
        }
      });
    }
  });
};

export function createNewTransaction(userId, amount, transactionAction, transactionStatus){
 var app = require('../server');
 let User = app.models.User;
 let Transaction = app.models.Transaction;
 return new Promise((resolve, reject)=>{
    User.findById(userId, {include: 'wallet'}, (err, user)=>{
      if(err){
        console.log('Find user in transaction error : ', err);
        reject(err);
        return err;
      }
      let parsedUser =  JSON.parse(JSON.stringify(user));
      let transacObject = {
        action: transactionAction,
        amount: amount,
        status: transactionStatus,
        walletId: parsedUser.wallet.id,
        userId: parsedUser.id
      }
      Transaction.create(transacObject, (error, createdTrans)=>{
        if(error){
          console.log('Create new transaction error : ', error);
          reject(error);
          return error;
        }
         if(transactionAction === 'minus'){
          createdTrans.newWalletBalance = parsedUser.wallet.balance - createdTrans.amount;
         }else if(transactionAction === 'plus'){
          createdTrans.newWalletBalance = parsedUser.wallet.balance + createdTrans.amount;
         }
        resolve(createdTrans);
        return createdTrans
      });
    });//<--- find User function ended
 });//<--- promise ended
};

