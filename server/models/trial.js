import { assignKey } from '../utils/beforeSave';
import { loggingModel } from '../utils/createLogging';

const app = require('../server');

module.exports = function(Trial) {
  assignKey(Trial);
  loggingModel(Trial);
  Trial.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      ctx.instance.created = new Date();
    }
    next();
  });

  Trial.newGame = (data, cb) => {
    const { userId, coins, gameId } = data;
    const { Wallet, Transaction } = app.models;

    Wallet.findOne({ where: { userId } })
      .then((wallet) => {
        if (wallet.balance >= coins) {
          return Transaction.create({
            action: 'minus',
            amount: coins,
            success: true,
            walletId: wallet.id,
            userId,
            transactionType: 'Game',
          });
        }
        cb(null, 'insufficient balance');
        return null;
      })
      .then((transaction) => {
        if (transaction !== null) {
          return Trial.create({
            userId,
            coins,
            gameId,
            transactionId: transaction.id,
          });
        }
        return null;
      })
      .then((newTrial) => {
        if (newTrial !== null) {
          const resObject = {
            trialId: newTrial.id,
            gameId,
            userId,
          };
          cb(null, resObject);
        }
      })
      .catch((error) => {
        console.log(error);
        cb(error);
      });
  };

  Trial.afterRemote('newGame', (ctx, output, next) => {
    const { gameId, userId } = output.response;
    const { Tournament, Participant } = app.models;
    Tournament.findOne(
      { where: { gameId }, order: 'created DESC' },
      (err, tournament) => {
        console.log('tournament', tournament);
        Participant.findOrCreate(
          { where: { userId, tournamentId: tournament.id } },
          {
            userId,
            tournamentId: tournament.id,
            numberOfTrial: 1,
            highestScore: 0,
          }
        );
        // .then((partiUser) => {
        //   console.log('partiUser', partiUser);
        //   if (!partiUser) {
        //     return Participant.create({
        //       userId,
        //       tournamentId: tournament.id,
        //       numberOfTrial: 1,
        //       highestScore: 0,
        //     });
        //   }
        //   return null;
        // })
        // .catch((error) => {
        //   console.log(error);
        // });
        // Participant.findOne(
        //   { where: { userId: userId, tournamentId: tournament.id } }, 
        //   (err, data) => {
        //     if (err) { console.log(err); }
        //     console.log(data);
        //   })
        next();
      }
    );
  });

  Trial.remoteMethod(
    'newGame',
    {
      http: { path: '/newGame', verb: 'post' },
      accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
      returns: { arg: 'response', type: 'object' },
    }
  );
};
