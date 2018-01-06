let { GMAIL_ADDRESS } = process.env;

export function sendEmail(subject, html, next){
  var app = require('../server');
  let { Email } = app.models;
  Email.send({
    to: `${GMAIL_ADDRESS}`,
    from: `${GMAIL_ADDRESS}`,
    subject: subject,
    html: html
  }, function(err, mail){
    if(err){
      console.log(`error in sending mail : ${subject}`, err)
      if(!!next){next(err)}
    }else{
      if(!!next){next()};
    }
  })
}