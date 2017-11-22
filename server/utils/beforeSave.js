'use strict';

const uuidv4 = require('uuid/v4');

// Define Functions : Assign Timestamp for Create and Update
export function updateTimestamp(model){
  model.observe('before save',(ctx, next)=>{
    // let logData = { model : ctx.Model.modelName , functionName : 'updateTimestamp' }; 
    if (ctx.isNewInstance) {
      ctx.instance.created = new Date().getTime();
      // logData.description = 'Assign Created Time';
      // logData.data = ctx.instance.created;
    } else {
      ctx.data.lastUpdated = new Date().getTime();
      // logData.description = 'Assign Updated Time';
      // logData.data = ctx.data.lastUpdated;
    }
    // Logging Process
    // loggingFunction(logData);
    next();
  });
}

// Define Functions : Assign Primary Key Using UUID v4
export const assignKey = (model)=>{
  model.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){ 
      ctx.instance.id = uuidV4(); 
      // Logging Process
      // loggingFunction({
      //   model : ctx.Model.modelName,
      //   functionName : 'assignKey',
      //   description : 'assign primary key to created object',
      //   data : ctx.instance.id
      // });
    }
    next();
  });
};