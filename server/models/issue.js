import { updateTimeStamp, assignKey } from '../utils/beforeSave';
import { loggingModel, loggingFunction } from '../utils/createLogging';
import { sendEmail } from '../utils/nodeMailer';
import { createNewTransaction } from '../utils/makeTransaction';

const app = require('../server');

module.exports = function(Issue) {
  // make loggings for monitor purpose
  loggingModel(Issue);

  // assgin last updated time / created time to model
  updateTimeStamp(Issue);

  // assign an unique if its new instance
  assignKey(Issue);

  Issue.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      const { User } = app.models;
      const { userId, email } = ctx.instance;
      ctx.instance.solved = false;
      // update user's email if user has no email in facebook;
      if (email) {
        User.findById(userId, (err, user) => {
          user.updateAttributes({ contactEmail: email });
        });
      } else {
        User.findById(userId, (err, user) => {
          const originalMail = user.contactEmail ?
            user.contactEmail : user.email;
          ctx.instance.email = originalMail;
        });
      }

      next();
    } else {
      next();
    }
  });

  Issue.observe('after save', (ctx, next) => {
    if (ctx.isNewInstance) {
      const {
        type, email, message, userId, machineId, deliveryId, transactionId,
      } = ctx.instance;
      const subject = `Issue report from user : type = ${type}`;
      const html = `<h3>Message : ${message}</h3>
          <h3>userId : ${userId}</h3>
          <p>User email : ${email}</p>
          <p>Related machineId : ${machineId}</p>
          <p>Related deliveryId : ${deliveryId}</p>
          <p>Related transactionId : ${transactionId}</p>`;
      // send email notification if user report an issue
      sendEmail(subject, html);
      next();
    } else {
      next();
    }
  });

  Issue.userRefund = (data, cb) => {
    const { userId, issueId, amount } = data;
    createNewTransaction(userId, amount, 'refund', 'plus', true)
      .then(trans => [trans, Issue.findById(issueId)])
      .spread((trans, issue) =>
        issue.updateAttributes({ refund: { amount, tansactionId: trans.id } }))
      .then((changedIssue) => {
        cb(null, changedIssue);
      })
      .catch((error) => {
        loggingFunction('Issue | ', 'create Refund error | ', error, 'error');
        cb(error);
      });
  };

  Issue.remoteMethod(
    'userRefund',
    {
      http: { path: '/userRefund', verb: 'post' },
      accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
      returns: { arg: 'response', type: 'object' },
    }
  );
};
