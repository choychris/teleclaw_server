'use strict';

module.exports = {
  mongodb: {
    connector: 'mongodb',
    url: process.env.KT_VAR_MONGODB_URL || 'mongodb://teleClawAdmin:123456@mongo:27017/teleclaw_dev'
  }
};

