import { assignKey } from '../utils/beforeSave';
import { loggingModel } from '../utils/createLogging';
import { createNewTransaction } from '../utils/makeTransaction';

const moment = require('moment');

const Promise = require('bluebird');

const app = require('../server');

module.exports = function(Tournament) {
  assignKey(Tournament);
  loggingModel(Tournament);

  Tournament.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      const { duration } = ctx.instance;
      const created = new Date().getTime();
      ctx.instance.created = created;
      ctx.instance.endTime = created + (duration * 1000);
    }
    next();
  });

  Tournament.rank = (gameId, userId, period, cb) => {
    const filter = {
      where: { gameId },
      order: 'created DESC',
      include: {
        relation: 'participants',
        scope: {
          fields: [
            'userId',
            'username',
            'highestScore',
            'numberOfTrial',
          ],
          order: [
            'highestScore DESC',
            'numberOfTrial DESC',
          ],
        },
      },
    };
    if (period !== 'current') filter.skip = 1;

    Tournament.findOne(filter)
      .then((tournament) => {
        const participantList = tournament.toJSON().participants;
        const userPositionIndex = participantList.findIndex(i => i.userId === userId);
        const result = filterParticipant(participantList, userPositionIndex);
        cb(null, {
          result,
          endTime: tournament.endTime,
          totalPlayer: participantList.length,
        });
      })
      .catch((error) => {
        console.log(error);
        cb(error);
      });

    const filterParticipant = (list, userIndex) => {
      if (userIndex <= 4) {
        const result = list.slice(0, 6);
        for (let i = 0; i < result.length; i += 1) {
          result[i].rank = i + 1;
        }
        if (userIndex >= 0) result[userIndex].self = true;
        return result;
      }
      const topThree = list.slice(0, 3);
      for (let a = 0; a < topThree.length; a += 1) {
        topThree[a].rank = a + 1;
      }
      const nextThree = [
        list[userIndex - 1],
        list[userIndex],
        list[userIndex + 1],
      ];
      for (let b = 0; b < nextThree.length; b += 1) {
        nextThree[b].rank = userIndex + b;
      }
      nextThree[1].self = true;
      return topThree.concat(nextThree);
    };
  };

  Tournament.remoteMethod(
    'rank',
    {
      http: { path: '/rank/:gameId/:userId/:period', verb: 'get' },
      accepts: [
        { arg: 'gameId', type: 'string', require: true },
        { arg: 'userId', type: 'string', require: true },
        { arg: 'period', type: 'string', require: true },
      ],
      returns: { arg: 'response', type: 'array' },
    }
  );

  Tournament.weekly = (gameId, cb) => {
    const startOfWeek = moment().startOf('week').valueOf();
    // filter to get every 1st place winner
    const filter = {
      where: {
        gameId,
        created: {
          gt: startOfWeek,
        },
      },
      include: {
        relation: 'participants',
        scope: {
          order: [
            'highestScore DESC',
            'numberOfTrial DESC',
          ],
          limit: 1,
          fields: [
            'username',
            'highestScore',
            'numberOfTrial',
          ],
        },
      },
    };
    // filter to get top 3 highest score of the week
    const partiFilter = {
      where: {
        gameId,
        created: {
          gt: startOfWeek,
        },
      },
      order: [
        'highestScore DESC',
        'numberOfTrial DESC',
      ],
      limit: 3,
      fields: [
        'username',
        'highestScore',
        'numberOfTrial',
      ],
    };

    const { Participant } = app.models;
    Promise.all([Tournament.find(filter), Participant.find(partiFilter)])
      .then((result) => {
        const tournaments = result[0];
        const weeklyTopThree = result[1];
        const highestScoreList = [];
        tournaments.forEach((data) => {
          const bestOne = data.toJSON().participants[0];
          if (bestOne) {
            highestScoreList.push(data.toJSON().participants[0]);
          }
        });
        const compareScore = (a, b) => {
          if (a.highestScore > b.highestScore) return -1;
          if (b.highestScore > a.highestScore) return 1;
          return 0;
        };
        const sorted = highestScoreList.sort(compareScore);
        cb(null, { allWinner: sorted, weeklyTopThree });
      })
      .catch((error) => {
        console.log(error);
        cb(error);
      });
  };

  Tournament.remoteMethod(
    'weekly',
    {
      http: { path: '/weekly/:gameId', verb: 'get' },
      accepts: { arg: 'gameId', type: 'string', require: true },
      returns: { arg: 'response', type: 'array' },
    }
  );

  Tournament.toNextPeriod = (gameId, cb) => {
    const tourFilter = {
      where: {
        gameId,
        status: true,
      },
      order: 'created DESC',
    };
    const partiFilter = {
      order: [
        'highestScore DESC',
        'numberOfTrial DESC',
      ],
      limit: 3,
    };

    const {
      // Play,
      Participant,
    } = app.models;
    Tournament.findOne(tourFilter)
      .then((data) => {
        // console.log('Tournament', data);
        data.updateAttributes({ status: false });
        partiFilter.where = { tournamentId: data.id };
        return Promise.all([
          Participant.count({ tournamentId: data.id }),
          Participant.find(partiFilter),
        ]);
      })
      .then((data) => {
        const count = data[0];
        const topThree = data[1];
        // temp hard coding the reward amount
        const factor = Math.floor((count + 50) / 50);
        const first = 50 * factor;
        const second = 40 * factor;
        const third = 30 * factor;
        const payOut = [first, second, third];
        // temp hard coding the reward distribution
        topThree.forEach((user, index) => {
          // const amount = (index < 2) ? firstSecond : third;
          createNewTransaction(user.userId, payOut[index], 'reward', 'plus', true, 'ticket');
        });
        if (count >= 50) {
          // Play.create({
          //   expectedResult: true,
          //   finalResult: true,
          //   machineId: gameId,
          //   userId: topThree[0].userId,
          //   ended: new Date(),
          //   // id of banana (temp hard code solution)
          //   productId: '40c18fc8-e395-4d79-ac5f-0596948f5db4',
          // });
          createNewTransaction(topThree[0].userId, 200, 'reward', 'plus', true, 'ticket');
          createNewTransaction(topThree[1].userId, 100, 'reward', 'plus', true, 'ticket');
          createNewTransaction(topThree[2].userId, 50, 'reward', 'plus', true, 'ticket');
        }
        return Tournament.create({
          gameId,
          duration: 86400,
          status: true,
        });
      })
      .then((tournament) => {
        cb(null, tournament.id);
      })
      .catch((err) => {
        console.log(err);
        cb(err);
      });
  };

  Tournament.remoteMethod(
    'toNextPeriod',
    {
      http: { path: '/toNextPeriod/:gameId', verb: 'get' },
      accepts: { arg: 'gameId', type: 'string', require: true },
      returns: { arg: 'response', type: 'string' },
    }
  );

  Tournament.countPlayers = (gameId, cb) => {
    const tourFilter = {
      where: {
        gameId,
        status: true,
      },
      order: 'created DESC',
    };
    Tournament.findOne(tourFilter)
      .then((tour) => {
        const { Participant } = app.models;
        return Participant.count({ tournamentId: tour.id });
      })
      .then((count) => {
        cb(null, count);
      })
      .catch((error) => {
        cb(error);
      });
  };

  Tournament.remoteMethod(
    'countPlayers',
    {
      http: { path: '/countPlayers/:gameId', verb: 'get' },
      accepts: { arg: 'gameId', type: 'string', require: true },
      returns: { arg: 'count', type: 'number' },
    }
  );
};
