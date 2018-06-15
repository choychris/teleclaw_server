import { assignKey } from '../utils/beforeSave';
import { loggingModel } from '../utils/createLogging';
import { createNewTransaction } from '../utils/makeTransaction';

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

  Participant.saveScore = (data, cb) => {
    const { userId, score } = data;
    const { Tournament } = app.models;
    if (score >= 100) {
      createNewTransaction(userId, 20, 'reward', 'plus', true);
    }
    Tournament.findOne(
      { where: { status: true }, order: 'created DESC' },
      (err, tournament) => {
        Participant.find({
          where: { userId, tournamentId: tournament.id },
        })
          .then((partiUser) => {
            if (!partiUser) {
              return Participant.create({
                userId,
                tournamentId: tournament.id,
                numberOfTrial: 1,
                highestScore: score,
              });
            }
            const { numberOfTrial, highestScore } = partiUser;
            const newHighScore = (score > highestScore) ? score : highestScore;
            return partiUser.updateAttributes({
              numberOfTrial: numberOfTrial + 1,
              highestScore: newHighScore,
            });
          })
          .then((result) => {
            console.log(result);
            cb(true);
          })
          .catch((error) => {
            console.log(error);
            cb(false);
          });
      }
    );
  };

  Participant.remoteMethod(
    'saveScore',
    {
      http: { path: '/saveScore', verb: 'post' },
      accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
      returns: { arg: 'success', type: 'boolean' },
    }
  );
};
