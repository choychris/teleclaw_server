'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var app = module.exports = loopback();
var Pusher = require('pusher');
var braintree = require("braintree");
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

var _process$env = process.env,
    PUSHER_APP_ID = _process$env.PUSHER_APP_ID,
    PUSHER_KEY = _process$env.PUSHER_KEY,
    PUSHER_SECRET = _process$env.PUSHER_SECRET,
    PUSHER_CLUSTER = _process$env.PUSHER_CLUSTER;
var _process$env2 = process.env,
    NODE_ENV = _process$env2.NODE_ENV,
    BRAINTREE_MERCHANTID = _process$env2.BRAINTREE_MERCHANTID,
    BRAINTREE_PUBLICKEY = _process$env2.BRAINTREE_PUBLICKEY,
    BRAINTREE_PRIVATEKEY = _process$env2.BRAINTREE_PRIVATEKEY;


var braintreeEnv = NODE_ENV === 'production' ? braintree.Environment.Production : braintree.Environment.Sandbox;

var pusher = new Pusher({
  appId: PUSHER_APP_ID,
  key: PUSHER_KEY,
  secret: PUSHER_SECRET,
  cluster: PUSHER_CLUSTER,
  encrypted: true
});

var gateway = braintree.connect({
  environment: braintreeEnv,
  merchantId: BRAINTREE_MERCHANTID,
  publicKey: BRAINTREE_PUBLICKEY,
  privateKey: BRAINTREE_PRIVATEKEY
});

app.pusher = pusher;
app.braintreeGateway = gateway;

app.start = function () {
  // start the web server
  return app.listen(function () {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

app.stop = function () {
  process.exit();
};

if (cluster.isMaster) {
  console.log('Number of workers in cluster : ' + numCPUs);

  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function (worker, code, signal) {
    console.log('Worker ' + worker.process.pid + ' died ');
    console.log('Starting a new worker');
    cluster.fork();
  });

  cluster.on('listening', function (worker) {
    console.log('Worker ' + worker.process.pid + ' is forked');
  });
} else {

  // Bootstrap the application, configure models, datasources and middleware.
  // Sub-apps like REST API are mounted via boot scripts.
  boot(app, __dirname, function (err) {
    if (err) throw err;

    // start the server if `$ node server.js`
    if (require.main === module) {
      app.start();
    }
  });
}