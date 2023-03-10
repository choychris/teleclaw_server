import { updateTimeStamp } from '../utils/beforeSave';
import { loggingModel, loggingFunction, loggingRemote } from '../utils/createLogging';
import { checkMachineStatus } from '../utils/gamePlayTimer';
import { makeCalculation, createNewTransaction } from '../utils/makeTransaction';

const shortid = require('shortid');

const app = require('../server');

module.exports = function(Play) {
  // make loggings for monitor purpose
  loggingModel(Play);
  loggingRemote(Play, 'refund');

  // assgin last updated time / created time to model
  updateTimeStamp(Play);

  Play.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      ctx.instance.id = shortid.generate();
      next();
    } else {
      // if the play result is updated
      if (ctx.data && ctx.data.ended && ctx.data.finalResult !== undefined) {
        const {
          Machine, Reservation, Product, Prize,
        } = app.models;
        const {
          productId, machineId, userId, created,
        } = ctx.currentInstance;
        // set machine status to open, while frontend is asking for users response
        Machine.findById(machineId, (err, instance) => {
          instance.updateAttributes({ status: 'open' });
        });
        const duration = (new Date(ctx.data.ended).getTime() - new Date(created).getTime()) / 1000;
        ctx.data.duration = duration;
        // if the user win, update product and machine sku
        if (ctx.data.finalResult === true) {
          ctx.data.deliveryId = 'transferred';
          Prize.create({
            userId,
            productId,
            status: 'normal',
          });
          makeCalculation(Product, productId, 'sku', 1, 'minus');
          // makeCalculation(Machine, machineId, 'sku', 1, 'minus');
        }
        // after 8 sec, check if user has reponsed
        if (!ctx.data.errorRefund) {
          setTimeout(() => {
            checkMachineStatus(machineId, userId, Machine, Reservation);
          }, 12000);
        }
      }
      next();
    }
  });

  Play.refund = (userId, cb) => {
    const { Reservation, Transaction, Machine } = app.models;

    function updateMachine(machineId, usrId) {
      Machine.findById(machineId)
        .then(machine => machine.updateAttributes({ status: 'open' })).then(() => {
          Reservation.endEngage(machineId, usrId, null);
        }).catch((error) => {
          loggingFunction('Play | ', 'Update machine in Play refund Error | ', error, 'error');
          cb(error);
        });
    }

    Play.findOne({ where: { userId }, order: 'created DESC' })
      .then((result) => {
        if ((new Date().getTime() - new Date(result.created).getTime()) <= 80000) {
          updateMachine(result.machineId, userId);
          result.updateAttributes({ errorRefund: true, finalResult: false, ended: new Date().getTime() });
          return Transaction.findById(result.transactionId);
        }
        cb(null, 'refund_fail');
        return null;
      }).then((trans) => {
        if (trans !== null && trans !== undefined) {
          return createNewTransaction(userId, trans.amount, 'refund', 'plus', true);
        }
        return null;
      }).then((createdTrans) => {
        if (createdTrans !== null && createdTrans !== undefined) {
          cb(null, { newWalletBalance: createdTrans.newWalletBalance });
        }
      })
      .catch((error) => {
        loggingFunction('Play | ', ' Play refund Error | ', error, 'error');
        cb(error);
      });
  };

  Play.remoteMethod(
    'refund',
    {
      http: { path: '/:userId/refund', verb: 'get' },
      accepts: [
        { arg: 'userId', type: 'string', required: true },
      ],
      returns: { arg: 'result', type: 'object' },
    }
  );
};
