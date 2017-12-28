'use strict';

module.exports = {
  mongodb: {
    connector: 'loopback-connector-mongodb',
    hostname: process.env.KT_VAR_MONGODB_HOST || 'localhost',
    port: process.env.KT_VAR_MONGODB_PORT || 27017,
    user: process.env.KT_VAR_MONGODB_USERNAME || 'teleClawAdmin',
    password: process.env.KT_VAR_MONGODB_PASSWORD || '123456',
    database: process.env.KT_VAR_MONGODB_DATABASE || 'teleclaw_dev'
  }
};