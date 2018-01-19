import { loggingFunction } from './createLogging.js';
let { GMAIL_ADDRESS } = process.env;

export function sendEmail(subject, html, next){
  var app = require('../server');
  let { Email } = app.models;
  // sending email to teleclaw admin
  Email.send({
    to: `${GMAIL_ADDRESS}`,
    from: `${GMAIL_ADDRESS}`,
    subject: subject,
    html: html
  }, function(err, mail){
    if(err){
      loggingFunction('Email | ', `sending email error | subject : ${subject}`, err, 'error');
      if(!!next){next(err)}
    }else{
      if(!!next){next()};
    }
  })
}