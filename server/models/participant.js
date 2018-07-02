import { assignKey } from '../utils/beforeSave';
import { loggingModel } from '../utils/createLogging';

const app = require('../server');

module.exports = function(Participant) {
  assignKey(Participant);
  loggingModel(Participant);

  Participant.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      ctx.instance.created = new Date();
    }
    next();
  });

  Participant.bonus = (gameId, userId, cb) => {
    const { Tournament } = app.models;
    const tourFilter = {
      where: { gameId },
      order: 'created DESC',
      skip: 1,
      limit: 2,
    };
    Tournament.find(tourFilter)
      .then((tours) => {
        const tour1 = tours[0].id;
        const tour2 = tours[1].id;
        const filter = {
          order: [
            'highestScore DESC',
            'numberOfTrial DESC',
          ],
          limit: 3,
          fields: 'userId',
        };
        const partFilter1 = Object.assign({ where: { tournamentId: tour1 } }, filter);
        const partFilter2 = Object.assign({ where: { tournamentId: tour2 } }, filter);
        return Promise.all([
          Participant.find(partFilter1),
          Participant.find(partFilter2),
        ]);
      })
      .then((partis) => {
        const fullList = partis[0].concat(partis[1]);
        const won = fullList.find(data => data.userId === userId);
        cb(null, !won);
      })
      .catch((err) => {
        console.log(err);
        cb(err);
      });
  };

  Participant.remoteMethod(
    'bonus',
    {
      http: { path: '/bonus/:gameId/:userId', verb: 'get' },
      accepts: [
        { arg: 'gameId', type: 'string', require: true },
        { arg: 'userId', type: 'string', require: true },
      ],
      returns: { arg: 'response', type: 'boolean' },
    }
  );
};
