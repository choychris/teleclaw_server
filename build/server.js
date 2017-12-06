'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();
var firebaseAmdin = require('firebase-admin');
var _process$env = process.env,
    FIREBASE_PROJECT_ID = _process$env.FIREBASE_PROJECT_ID,
    FIREBASE_SERVICE_KEY_NAME = _process$env.FIREBASE_SERVICE_KEY_NAME;


console.log(process.env.FIREBASE_PROJECT_ID);
var serviceAccount = require('../' + FIREBASE_SERVICE_KEY_NAME);
var firebaseApp = firebaseAmdin.initializeApp({
  credential: firebaseAmdin.credential.cert(serviceAccount),
  databaseURL: 'https://' + FIREBASE_PROJECT_ID + '.firebaseio.com/'
});

app.firebaseApp = firebaseApp;

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

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function (err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module) app.start();
});