import { updateTimeStamp, assignKey } from '../utils/beforeSave';
import { loggingModel, loggingFunction, loggingRemote } from '../utils/createLogging';
import { createNewTransaction } from '../utils/makeTransaction';

const moment = require('moment');
const Promise = require('bluebird');

const app = require('../server');

module.exports = function(Reward) {
  // make loggings for monitor purpose
  loggingModel(Reward);
  loggingRemote(Reward, 'checkIn');
  loggingRemote(Reward, 'refer');

  // assgin last updated time / created time to model
  updateTimeStamp(Reward);

  // assign an unique if its new instance
  assignKey(Reward);

  Reward.observe('before save', (ctx, next) => {
    // const { User } = app.models;
    if (ctx.isNewInstance) {
      const { type, rewardAmount, userId } = ctx.instance;
      // create transaction to user's wallet for this reward
      createNewTransaction(userId, rewardAmount, type, 'plus', true)
        .then((createdTrans) => {
          ctx.instance.transactionId = createdTrans.id;
          next();
          return null;
        }).catch((err) => { next(err); });
    } else {
      next();
    }
  });

  // remote method to create a checkIn reward
  Reward.checkIn = (userId, cb) => {
    const { User, Event, Wallet } = app.models;
    // let cutOffTime = moment().set({h:7, m:0, s:0, ms:0});
    const minTime = moment().startOf('day').valueOf();
    const maxTime = moment().endOf('day').valueOf();
    User.findById(userId, { fields: { lastLogIn: true } })
      .then((user) => {
        const lastLogIn = moment(user.lastLogIn).valueOf();
        // to determine user's lastLogin in today time range;
        if ((minTime < lastLogIn) && (lastLogIn < maxTime)) {
          loggingFunction('Reward | ', 'checkIn reward | reward_already_claimed', { userId }, 'info');
          return cb(null, 'reward_already_claimed');
        }
        return Event.findOne({ where: { launching: true, type: 'checkIn' } });
      })
      .then((foundEvent) => {
        if (foundEvent !== undefined && foundEvent !== null) {
          const { type, rewardAmount } = foundEvent;
          return Promise.all([Wallet.findOne({ where: { userId } }), Reward.create({ type, rewardAmount, userId })]);
        }
        return null;
      })
      .then((result) => {
        if (result) {
          const wallet = result[0];
          const reward = result[1];
          cb(null, {
            success: true,
            rewardAmount: reward.rewardAmount,
            newWalletBalance: wallet.balance + reward.rewardAmount,
          });
        }
      })
      .catch((error) => {
        loggingFunction('Reward | ', ' checkIn reward Error | ', error, 'error');
        cb(error);
      });// <-- promise chain end
  };// <-- checkIn remote method end

  Reward.afterRemote('checkIn', (ctx, output, next) => {
    const { userId } = ctx.args;
    const { Play, Prize } = app.models;
    Play.find({ where: { userId, finalResult: true } }, (error, plays) => {
      if (plays.length > 0) {
        const playsToUpdate = plays.filter(ply => ply.deliveryId === undefined);
        if (playsToUpdate.length > 0) {
          Promise.map(playsToUpdate, (eachPlay) => {
            eachPlay.updateAttributes({ deliveryId: 'transferred' });
            return Prize.create({
              userId,
              productId: eachPlay.productId,
              status: 'normal',
            });
          })
            .then(() => {
              console.log('done');
            })
            .catch((err) => {
              console.log(err);
              loggingFunction('Reward | ', 'checkin plays transit | ', err, 'error');
            });
        }
      }
      next();
    });
    // console.log(output);
  });

  Reward.remoteMethod(
    'checkIn',
    {
      http: { path: '/checkIn/:userId', verb: 'get' },
      accepts: { arg: 'userId', type: 'string', required: true },
      returns: { arg: 'result', type: 'object' },
    }
  );

  // remote method to perform user refer reward
  Reward.refer = (data, cb) => {
    const { userId } = data;
    const code = data.code ? data.code.trim() : null;
    const { User, Event, Wallet } = app.models;

    if (code === null) {
      cb(null, 'missingCode');
    } else {
      Promise.all([
        User.findOne({ where: { 'referral.code': code } }),
        Event.findOne({ where: { type: 'promotion', launching: true, code } }),
      ])
        .then((result) => {
        // console.log('result: ', result);
          const foundUser = result[0];
          const foundEvent = result[1];
          if (foundUser !== null) {
            referFriends(foundUser);
          } else if (foundEvent !== null) {
            promotionCode(foundEvent);
          } else {
            loggingFunction('Reward | ', 'find code in user or event | ', 'invalidCode', 'info');
            cb(null, 'invalidCode');
          }
          return null;
        }).catch((error) => {
          loggingFunction('Reward | ', 'Promise.all check reward type error | ', error, 'error');
          cb(error);
        });
    }

    // create reward when the code is representing a user
    function referFriends(referrer) {
      User.findById(userId)
        .then((user) => {
          if (user.referral.code === code) { // <-- if user entering his own code
            loggingFunction('Reward | ', 'referFriends | ', 'invalidCode', 'info');
            return cb(null, 'invalidCode');
          } else if (user.referral.isReferred) { // <-- if user is already refered by other
            loggingFunction('Reward | ', 'referFriends | ', 'alreadyReferred', 'info');
            return cb(null, 'alreadyReferred');
          }
          return Promise.all([Event.findOne({ where: { type: 'referral', launching: true } }), referrer, user]);
        })
        .then((result) => {
          if (result !== undefined && result !== null) {
            const foundEvent = result[0];
            const referringUser = result[1];
            const user = result[2];
            const { type, rewardAmount, maxNum } = foundEvent;
            // if user reach maximum refer:
            if (maxNum !== null && (referringUser.referral.numOfReferred >= maxNum)) {
              loggingFunction('Reward | ', 'referFriends | ', 'maxRefer', 'info');
              cb(null, 'maxRefer');
              return null;
            }
            const { referral } = referringUser;
            user.updateAttributes({ 'referral.isReferred': true });
            referringUser.updateAttributes({ 'referral.numOfReferred': referral.numOfReferred + 1 });
            return Promise.all([Wallet.findOne({ where: { userId } }), Reward.create({
              type, rewardAmount, userId, participantId: referringUser.id,
            }), Reward.create({
              type, rewardAmount, userId: referringUser.id, participantId: userId,
            })]);
          }
          return null;
        }).then((result) => {
          if (result) {
            const wallet = result[0];
            const reward = result[1];
            cb(null, {
              success: true,
              rewardAmount: reward.rewardAmount,
              newWalletBalance: wallet.balance + reward.rewardAmount,
            });
          }
        })
        .catch((error) => {
          loggingFunction('Reward | ', 'referFriend promise chain error | ', error, 'error');
          cb(error);
        });// <-- User.findById Promise chain end
    }

    // create reward when the code is representing a promotion event
    function promotionCode(promotionEvent) {
      // where filter finding user not in this event already
      Event.find({
        where: {
          claimedUser: { in: [userId] }, type: 'promotion', launching: true, code,
        },
      })
        .then((currentEvent) => {
          if (currentEvent.length !== 0) {
            loggingFunction('Reward | ', 'promotionCode | ', 'rewardClaimed', 'info');
            return cb(null, 'rewardClaimed');
          }
          return promotionEvent;
        }).then((foundEvent) => {
          if (foundEvent !== undefined) {
            const now = new Date().getTime();
            // event reach max joiner:
            if (foundEvent.maxNum !== null && (foundEvent.maxNum <= foundEvent.currentNum)) {
              loggingFunction('Reward | ', 'promotionCode | ', 'eventFull', 'info');
              cb(null, 'eventFull');
            } else if (now > foundEvent.endTime) { // <-- event ended
              loggingFunction('Reward | ', 'promotionCode | ', 'eventEnded', 'info');
              cb(null, 'eventEnded');
            } else {
              const {
                id, currentNum, rewardAmount, type,
              } = foundEvent;
              foundEvent.updateAttributes({ currentNum: currentNum + 1 });
              Event.update({ id }, { $push: { claimedUser: userId } }, { allowExtendedOperators: true });
              return Promise.all([
                Wallet.findOne({ where: { userId } }),
                Reward.create({ type, rewardAmount, userId }),
              ]);
            }
          }
          return null;
        }).then((result) => {
          if (result) {
            const wallet = result[0];
            const reward = result[1];
            cb(null, {
              success: true,
              rewardAmount: reward.rewardAmount,
              newWalletBalance: wallet.balance + reward.rewardAmount,
            });
          }
        })
        .catch((error) => {
          loggingFunction('Reward | ', 'promotionCode promise chain error | ', error, 'error');
          cb(error);
        });// <-- Event.Find Promise chain end
    }
  };

  Reward.remoteMethod(
    'refer',
    {
      http: { path: '/refer', verb: 'post' },
      accepts: { arg: 'data', type: 'object', required: true },
      returns: { arg: 'result', type: 'object' },
    }
  );

  Reward.rewardedVideo = (data, cb) => {
    const { userId, method } = data;
    const { Event } = app.models;
    Event.findOne({ where: { type: 'videoAds', launching: true } })
      .then((event) => {
        if (method === 'get') {
          cb(null, { amount: event.rewardAmount });
        } else if (method === 'claim') {
          loggingFunction('Reward | ', 'rewardedVideo claim | user:', userId, 'info');
          Reward.create({ type: 'videoAds', rewardAmount: event.rewardAmount, userId })
            .then(() => {
              cb(null, { success: true, rewardAmount: event.rewardAmount });
            });
        }
        return null;
      }).catch((error) => {
        loggingFunction('Reward | ', 'rewardedVideo promise chain error | ', error, 'error');
        cb(error);
      });
  };

  Reward.remoteMethod(
    'rewardedVideo',
    {
      http: { path: '/rewardedVideo', verb: 'post' },
      accepts: { arg: 'data', type: 'object', http: { source: 'body' } },
      returns: { arg: 'response', type: 'object' },
    }
  );
};
