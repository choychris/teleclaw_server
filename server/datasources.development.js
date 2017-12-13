'use strict';

module.exports = {
  mongodb: {
    connector: 'loopback-connector-mongodb',
    url: process.env.KT_VAR_MONGODB_URL || 'mongo://teleClawAdmin:123456@localhost:27017/teleclaw_dev',
  },
};
