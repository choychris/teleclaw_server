'use strict';

// Import winston logger

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loggingAccess = loggingAccess;
exports.loggingSave = loggingSave;
exports.loggingRemote = loggingRemote;
exports.loggingModel = loggingModel;
exports.loggingFunction = loggingFunction;
var winston = require('winston');

function logger(level, message) {
  //papertrail.log(level,message);
  var winstonLogger = new winston.Logger({
    levels: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 },
    colors: { info: 'cyan', error: 'red' }
  });
  winstonLogger.add(winston.transports.Console, {
    prettyPrint: true,
    colorize: true
  });
  winstonLogger.log(level, message);
};

// Define Functions : Logging Access Action
function loggingAccess(model) {
  model.observe('access', function (ctx, next) {

    // Logging Model Name
    var logMessage = 'accessing | model : ' + ctx.Model.modelName + ' | \n';

    // Logging Query
    var _ctx$query = ctx.query,
        where = _ctx$query.where,
        include = _ctx$query.include;

    logMessage += where !== undefined ? 'where : ' + JSON.stringify(where) + ' | ' : '';
    logMessage += include !== undefined ? 'where : ' + JSON.stringify(include) + ' | ' : '';
    // logMessage += (order !== undefined) ? `where : ${JSON.stringify(order)} | ` : ``;

    // Logging User Data
    var accessToken = ctx.options.accessToken;

    if (accessToken !== undefined && accessToken !== null) {
      var userId = accessToken.userId;

      logMessage += 'user : ' + userId + ' | ';
      // logMessage += `access_token : ${id}`;
    }

    // Logging in Local and Papertrail
    logger('info', logMessage);
    next();
  });
}

// Define Functions : Logging Before Save and After Save Action
function loggingSave(model) {
  model.observe('before save', function (ctx, next) {

    // Logging Model Name
    var logMessage = 'Before Saving | model : ' + ctx.Model.modelName + ' | \n';

    // Logging Instance
    logMessage += ctx.isNewInstance ? 'action : Creating | data : ' + JSON.stringify(ctx.instance) : 'action : Updating | data : ' + JSON.stringify(ctx.data);

    // Logging in Local and Papertrail
    logger('info', logMessage);
    next();
  });

  model.observe('after save', function (ctx, next) {

    // Logging Model Name
    var logMessage = 'After Saving | model : ' + ctx.Model.modelName + ' | ';

    // Logging Instance
    logMessage += ctx.isNewInstance ? 'action : Success Creating | data : ' + JSON.stringify(ctx.instance) : 'action : Success Updating | data : ' + JSON.stringify(ctx.instance);

    // Logging in Local and Papertrail
    logger('info', logMessage);
    next();
  });
}

// Define Function : Logging Remote Function Behaviour
function loggingRemote(model, modelName, methodName) {
  model.beforeRemote(methodName, function (ctx, modelInstance, next) {

    // Logging Model Name
    var logMessage = 'Remote Method | method : ' + methodName + ' | model : ' + modelName + ' | \n';

    // Logging User Data
    var accessToken = ctx.req.accessToken;

    if (accessToken !== undefined && accessToken !== null) {
      var id = accessToken.id,
          userId = accessToken.userId;

      logMessage += 'user : ' + userId + ' | ';
      // logMessage += `access_token : ${id} |`;
    }

    // Logging Parameters
    logMessage += ctx.args.params ? ' args : ' + JSON.stringify(ctx.args.params) + ' | ' : ' args : ' + JSON.stringify(ctx.args) + ' | ';

    // Logging in Local and Papertrail
    logger('info', logMessage);
    next();
  });
}

// Define Function : Logging Model Behaviour
function loggingModel(model) {
  loggingAccess(model);
  loggingSave(model);
}

// Define Function : Logging Function Behaviour
function loggingFunction(logData, level) {
  // Common Log Data Format : modelName , functionName , description , data , message
  var logMessage = '';
  Object.keys(logData).map(function (logProp, index) {
    if (index === 0) logMessage += 'Process Function | \n';
    logMessage += logProp + ' : ' + logData[logProp] + ' | \n';
  });
  logger(level === undefined ? 'info' : level, logMessage);
}