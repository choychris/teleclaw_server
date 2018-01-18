'use strict';

// Import winston logger
var winston = require('winston');
require('winston-papertrail').Papertrail;

var winstonLogger = new (winston.Logger)({
    levels : { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5  },
    colors : { info : 'cyan' , error : 'red' }
  });
winstonLogger.add(winston.transports.Console, {
  prettyPrint: true,
  colorize: true,
});

var winstonPapertrail = new winston.transports.Papertrail({
  host: 'logs.papertrailapp.com',
  port: 33263,
  levels : { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5  },
  colorize: true
})

var papertrailLogger = new winston.Logger({
  transports: [winstonPapertrail]
});


function logger(level,message){
  //papertrail.log(level,message);
  if(process.env.NODE_ENV === 'production'){
    papertrailLogger.log(level,message);
  }else{
    winstonLogger.log(level,message);
  }
};

// Define Functions : Logging Access Action
export function loggingAccess(model){
  model.observe('access',(ctx, next)=>{

    // Logging Model Name
    let logMessage = `accessing | model : ${ctx.Model.modelName} | \n`;

    // Logging Query
    const { where , include } = ctx.query;
    logMessage += (where !== undefined) ? `where : ${JSON.stringify(where)} | ` : ``;
    logMessage += (include !== undefined) ? `where : ${JSON.stringify(include)} | ` : ``;
    // logMessage += (order !== undefined) ? `where : ${JSON.stringify(order)} | ` : ``;

    // Logging User Data
    const { accessToken } = ctx.options;
    if(accessToken !== undefined && accessToken !== null){
      const { userId } = accessToken;
      logMessage += `user : ${userId} | `;
      // logMessage += `access_token : ${id}`;
    }

    // Logging in Local and Papertrail
    logger('info',logMessage);
    next();
  });
}

// Define Functions : Logging Before Save and After Save Action
export function loggingSave(model){
  model.observe('before save',(ctx, next)=>{

    // Logging Model Name
    let logMessage = `Before Saving | model : ${ctx.Model.modelName} | \n`;

    // Logging Instance
    logMessage += (ctx.isNewInstance) ? 
      `action : Creating | data : ${JSON.stringify(ctx.instance)}` : 
      `action : Updating | data : ${JSON.stringify(ctx.data)}`;

    // Logging in Local and Papertrail
    logger('info',logMessage);
    next();
  });

  model.observe('after save',(ctx,next)=>{

    // Logging Model Name
    let logMessage = `After Saving | model : ${ctx.Model.modelName} | `;

    // Logging Instance
    logMessage += (ctx.isNewInstance) ? 
      `action : Success Creating | data : ${JSON.stringify(ctx.instance)}` : 
      `action : Success Updating | data : ${JSON.stringify(ctx.instance)}`;

    // Logging in Local and Papertrail
    logger('info',logMessage);
    next();
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
    logger('info',logMessage);
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




