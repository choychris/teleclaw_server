'use strict';

// Import winston Logger
var winston = require('winston');
require('winston-papertrail').Papertrail;

var winstonLogger = new winston.Logger({
  levels : { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5  },
  colors : { info : 'cyan' , error : 'red' },
  prettyPrint: true,
  colorize: true
});


if(process.env.NODE_ENV === 'development'){
  winstonLogger.add(winston.transports.Console)
}

if(!!process.env.PAPERTRAIL_PORT){
  var winstonPapertrail = new winston.transports.Papertrail({
    host: 'logs.papertrailapp.com',
    port: process.env.PAPERTRAIL_PORT
  });

  winstonLogger = new winston.Logger({
    levels : { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5  },
    colors : { info : 'cyan' , error : 'red' },
    prettyPrint: true,
    colorize: true,
    transports: [
      winstonPapertrail,
      new winston.transports.Console()
    ]
  });
}

// Define Functions : Logging Access Action
export function loggingAccess(model){
  model.observe('access',(ctx, next)=>{
    // Logging Model Name
    let user = null;

    if(!!ctx.query){
      
      // Logging User Data
      const { accessToken } = ctx.options;
      if(accessToken !== undefined && accessToken !== null){
        const { userId } = accessToken;
        user = userId
      }
      // Logging Query
      winstonLogger.log('info', ` | Access - ${ctx.Model.modelName} |`, `User Id - ${user} |`, ctx.query);
    }else{
      const { accessToken } = ctx.options;
      if(accessToken !== undefined && accessToken !== null){
        const { userId } = accessToken;
        user = userId
      }
      // Logging Query
      winstonLogger.log('info', `Access: ${ctx.Model.modelName}`, `user id : ${user}`);
    }
    next();
  });
}

// Define Functions : Logging Before Save and After Save Action
export function loggingSave(model){
  // model.observe('before save',(ctx, next)=>{

  //   // Logging Model Name
  //   let logMessage = `Before Saving | model : ${ctx.Model.modelName} | \n`;

  //   // Logging Instance
  //   logMessage += (ctx.isNewInstance) ? 
  //     `action : Creating | data : ${JSON.stringify(ctx.instance)}` : 
  //     `action : Updating | data : ${JSON.stringify(ctx.data)}`;

  //   // Logging in Local and Papertrail
  //   winstonLogger('info',logMessage);
  //   next();
  // });

  model.observe('after save',(ctx,next)=>{
    // Logging Instance
    if(ctx.isNewInstance){
      winstonLogger.log('info', `${ctx.Model.modelName}`, '| Success Creating |', JSON.stringify(ctx.instance));
      next();
    }else{
      winstonLogger.log('info', `${ctx.Model.modelName}`, '| Success Updating |', JSON.stringify(ctx.instance));
      next();
    }
  });
  
}

// Define Function : Logging Remote Function Behaviour
export function loggingRemote(model,modelName,methodName){
  model.beforeRemote(methodName,(ctx,modelInstance,next)=>{

    // Logging Model Name
    let logMessage = `Remote Method | method : ${methodName} | model : ${modelName} | \n`;

    // Logging User Data
    const { accessToken } = ctx.req;
    if(accessToken !== undefined && accessToken !== null){
      const { id , userId } = accessToken;
      logMessage += `user : ${userId} | `;
      // logMessage += `access_token : ${id} |`;
    }

    // Logging Parameters
    logMessage += (ctx.args.params) ? ` args : ${JSON.stringify(ctx.args.params)} | ` : ` args : ${JSON.stringify(ctx.args)} | `;

    // Logging in Local and Papertrail
    winstonLogger('info',logMessage);
    next();

  });
}

// Define Function : Logging Model Behaviour
export function loggingModel(model){
  loggingAccess(model);
  loggingSave(model);
}


// Define Function : Logging Function Behaviour
export function loggingFunction(where, description, data, level){
  winstonLogger.log((level === undefined) ? 'info' : level, where, description, data);
}




