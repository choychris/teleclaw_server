'use strict';

module.exports = {
  mongodb: {
    connector: 'mongodb',
    url: process.env.KT_VAR_MONGODB_URL
  },
  Email:{
    "name": "mail",
    "connector": "mail",
    "transports":[{
      "type": "SMTP",
      "host": "smtp.gmail.com",
      "secure": true,
      "port": 465,
      "auth": {
        "user": process.env.GMAIL_ADDRESS,
        "pass": process.env.GMAIL_PASSWORD
      }
    }]
  }
};

