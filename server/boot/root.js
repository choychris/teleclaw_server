'use strict';

module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  var ds = server.dataSources.mongodb;
  ds.autoupdate('user', (err, result)=>{});
  ds.autoupdate('event', (err, result)=>{});
  router.get('/', server.loopback.status());
  server.use(router);
};
