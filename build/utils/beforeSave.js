'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateTimeStamp = updateTimeStamp;
var uuidv4 = require('uuid/v4');

// Define Functions : Assign Timestamp for Create and Update
function updateTimeStamp(model) {
  model.observe('before save', function (ctx, next) {
    // let logData = { model : ctx.Model.modelName , functionName : 'updateTimestamp' }; 
    console.log('ctx.instance : =====', ctx.instance);
    if (ctx.isNewInstance) {
      ctx.instance.created = new Date().getTime();
      // logData.description = 'Assign Created Time';
      // logData.data = ctx.instance.created;
    } else {
      if (ctx.data) {
        ctx.data.lastUpdated = new Date().getTime();
      }
      if (ctx.instance) {
        ctx.instance.lastUpdated = new Date().getTime();
      }
      // logData.description = 'Assign Updated Time';
      // logData.data = ctx.data.lastUpdated;
    }
    // Logging Process
    // loggingFunction(logData);
    next();
  });
}

// Define Functions : Assign Primary Key Using UUID v4
var assignKey = exports.assignKey = function assignKey(model) {
  model.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance) {
      ctx.instance.id = uuidv4();
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