export function makeTransaction(model, modelId, modelAttribute, amount, plusOrMinus){
  
  model.findById(modelId, (err, foundModel)=>{
    let parsedModel = JSON.parse(JSON.stringify(foundModel));
    if(plusOrMinus === 'minus'){
      let newNumber = parsedModel[modelAttribute] - amount < 0 ? 0 : parsedModel[modelAttribute] - amount;
      foundModel.updateAttributes({[modelAttribute]: newNumber}, (err, instance)=>{
        if(err){
          next(err);
        }
      });
    }else if(plusOrMinus === 'plus'){
      let newNumber = parsedModel[modelAttribute] + amount;
       foundModel.updateAttributes({[modelAttribute]: newNumber}, (err, instance)=>{
        if(err){
          next(err);
        }
      });
    }
  });

}

