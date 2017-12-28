'use strict';

module.exports = {
  mongodb: {
    connector: 'loopback-connector-mongodb',
    hostname: process.env.KT_VAR_MONGODB_HOST,
    port: process.env.KT_VAR_MONGODB_PORT,
    user: process.env.KT_VAR_MONGODB_USERNAME,
    password: process.env.KT_VAR_MONGODB_PASSWORD,
    database: process.env.KT_VAR_MONGODB_DATABASE
  }
};