module.exports = function(server) {
  // Install a `/` route that returns server status
  const router = server.loopback.Router();
  const ds = server.dataSources.mongodb;
  ds.autoupdate('user', () => {});
  ds.autoupdate('wallet', () => {});
  ds.autoupdate('event', () => {});
  ds.autoupdate('tournament', () => {});
  ds.autoupdate('participant', () => {});
  router.get('/', server.loopback.status());
  server.use(router);
};
