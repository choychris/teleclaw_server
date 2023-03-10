import { assignKey } from '../utils/beforeSave';
import { loggingModel, loggingFunction, loggingRemote } from '../utils/createLogging';
import { createNewTransaction } from '../utils/makeTransaction';

const Promise = require('bluebird');

const app = require('../server');

module.exports = function(Trial) {
  assignKey(Trial);
  loggingModel(Trial);

  loggingRemote(Trial, 'newGame');

  Trial.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      ctx.instance.created = new Date();
    }
    next();
  });

  Trial.observe('after save', (ctx, next) => {
    if (!ctx.isNewInstance) {
      const { score, participantId, userId } = ctx.instance;
      if (score !== undefined && participantId !== undefined) {
        if (score >= 70) createNewTransaction(userId, 10, 'reward', 'plus', true, 'ticket');
        const { Participant } = app.models;
        Participant.findById(participantId)
          .then((data) => {
            const { numberOfTrial, highestScore } = data;
            const newHighScore = (score > highestScore) ?
              score : highestScore;
            data.updateAttributes({
              numberOfTrial: numberOfTrial + 1,
              highestScore: newHighScore,
            });
            return null;
          })
          .catch((error) => {
            console.log(error);
            loggingFunction('Trial |', 'Update Participant Error', error, 'error');
          });
      } else if (score !== undefined) {
        createNewTransaction(userId, score, 'reward', 'plus', true, 'ticket');
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
            category: 'coin',
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
        return null;
      })
      .catch((error) => {
        console.log(error);
        loggingFunction('Trial |', 'newGame remote Error', error, 'error');
        cb(error);
      });
  };

  Trial.afterRemote('newGame', (ctx, output, next) => {
    const { trialId, gameId, userId } = output.response;
    const { Tournament, Participant, User } = app.models;
    if (gameId === 'A0001') {
      Promise.all([
        Tournament.findOne({ where: { gameId }, order: 'created DESC' }),
        User.findById(userId, { fields: { name: true } }),
      ])
        .then((dataArray) => {
          const tournament = dataArray[0];
          const user = dataArray[1];
          // console.log('tournament', tournament);
          return Participant.findOrCreate(
            { where: { userId, tournamentId: tournament.id } },
            {
              userId,
              gameId,
              username: user.name,
              tournamentId: tournament.id,
              numberOfTrial: 0,
              highestScore: 0,
            }
          );
        })
        .then((participant) => {
          // console.log(participant[0].id);
          Trial.findById(
            trialId,
            (error, data) => {
              data.updateAttributes({ participantId: participant[0].id });
            }
          );
          return null;
        })
        .catch((error) => {
          console.log(error);
          loggingFunction('Trial |', 'newGame After remote Error', error, 'error');
        });
    } else if (userId !== undefined) {
      User.findById(userId, { fields: { name: true } })
        .then((user) => {
          Trial.findById(
            trialId,
            (error, data) => {
              data.updateAttributes({ username: user.name });
            }
          );
          return null;
        })
        .catch((error) => {
          console.log(error);
          loggingFunction('Trial |', 'newGame After remote Error', error, 'error');
        });
    }
    next();
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
            category: 'coin',
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
        loggingFunction('Trial |', 'retry remote Error', error, 'error');
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
