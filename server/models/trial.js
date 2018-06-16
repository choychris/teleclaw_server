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

  Trial.observe('after save', (ctx, next) => {
    if (!ctx.isNewInstance) {
      const { score, participantId } = ctx.instance;
      if (score !== undefined) {
        const { Participant } = app.models;
        Participant.findById(participantId)
          .then((data) => {
            const { numberOfTrial, highestScore } = data;
            const newHighScore = (score > highestScore) ? score : highestScore;
            data.updateAttributes({
              numberOfTrial: numberOfTrial + 1,
              highestScore: newHighScore,
            });
            return null;
          })
          .catch((error) => {
            console.log(error);
          });
      }
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
    const { trialId, gameId, userId } = output.response;
    const { Tournament, Participant } = app.models;
    Tournament.findOne(
      { where: { gameId }, order: 'created DESC' },
      (err, tournament) => {
        // console.log('tournament', tournament);
        Participant.findOrCreate(
          { where: { userId, tournamentId: tournament.id } },
          {
            userId,
            tournamentId: tournament.id,
            numberOfTrial: 1,
            highestScore: 0,
          }
        )
          .then((participant) => {
            console.log(participant[0].id);
            Trial.findById(
              trialId,
              (error, data) => {
                data.updateAttributes({ participantId: participant[0].id });
              }
            );
          });
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

  Trial.retry = (userId, coins, cb) => {
    const { Wallet, Transaction } = app.models;

    Wallet.findOne({ where: { userId } })
      .then((wallet) => {
        if (wallet.balance >= coins) {
          Transaction.create({
            action: 'minus',
            amount: coins,
            success: true,
            walletId: wallet.id,
            userId,
            transactionType: 'Game',
          });
          cb(null, true);
        } else {
          cb(null, false);
        }
        return null;
      })
      .catch((error) => {
        console.log(error);
        cb(error, false);
      });
  };

  Trial.remoteMethod(
    'retry',
    {
      http: { path: '/:userId/:coins/retry', verb: 'get' },
      accepts: [
        { arg: 'userId', type: 'string', require: true },
        { arg: 'coins', type: 'number', require: true },
      ],
      returns: { arg: 'response', type: 'boolean' },
    }
  );
};
