import { loggingFunction } from './utils/createLogging';

module.exports = function createErrorLogger(options) {
  return function logError(err, req, res, next) {
    // your custom error-logging logic goes here
    const status = err.status || err.statusCode;
    // if (status >= 500) {
    //   // log only Internal Server errors
    //   console.log('Unhandled error for request %s %s: %s',
    //     req.method, req.url, err.stack || err);
    // }
    loggingFunction(`Url: ${req.url}`,`method: ${req.method} | status: ${status}`, err.message,'error')

    // Let the next error handler middleware
    // produce the HTTP response
    next(err);
  };
}