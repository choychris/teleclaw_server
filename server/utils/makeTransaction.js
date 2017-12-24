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

export function createNewTransaction(userId, amount, type, action, status, gateway){
 var app = require('../server');
 let Wallet = app.models.Wallet;
 let Transaction = app.models.Transaction;
 return new Promise((resolve, reject)=>{
    Wallet.findOne({where: {userId:userId}}, (err, wallet)=>{
      if(err){
        console.log('Find wallet in transaction error : ', err);
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
      Transaction.create(transacObject, (error, createdTrans)=>{
        if(error){
          console.log('Create new transaction error : ', error);
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

