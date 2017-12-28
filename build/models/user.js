'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var request = require('request');
var Promise = require('bluebird');
var shortid = require('shortid');

var _process$env = process.env,
    FB_APP_SECRET = _process$env.FB_APP_SECRET,
    FB_CLIENT_ID = _process$env.FB_CLIENT_ID,
    FB_APP_TOKEN = _process$env.FB_APP_TOKEN;


module.exports = function (User) {

  var app = require('../server');
  // Remove existing validations for email
  delete User.validations.email;

  //make loggings for monitor purpose
  // loggingModel(User);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(User);

  User.observe('before save', function (ctx, next) {
    if (ctx.isNewInstance) {
      ctx.instance.referral = { code: shortid.generate(), isReferred: false, numOfRefer: 0 };
      ctx.instance.bindedDevice = [];
    }
    next();
  });

  User.observe('after save', function (ctx, next) {
    if (ctx.isNewInstance) {
      var Event = app.models.Event;
      var Wallet = app.models.Wallet;
      var Reservation = app.models.Reservation;
      Event.find({ 'where': { 'launching': true, 'eventDetails.newUser.initialCoins': { 'exists': true } } }, function (err, event) {
        if (err) {
          next(err);
        }
        var initialCoins = event.length > 0 ? event.eventDetails.newUser.initialCoins : 60;
        var wallet = {
          balance: initialCoins,
          userId: ctx.instance.id
        };
        var reserve = {
          status: 'close',
          userId: ctx.instance.id,
          machineId: null,
          productId: null
        };
        Wallet.create(wallet, function (error, wallet) {});
        Reservation.create(reserve, function (error, reserve) {});
      });
    };
    next();
  });

  User.afterRemote('auth', function (ctx, result, next) {
    if (result.result.lbToken !== undefined) {
      var userId = result.result.lbToken.userId;

      User.findById(userId, function (error, user) {
        user.updateAttributes({ lastLogIn: new Date().getTime() });
      });
    }
    next();
  });

  User.auth = function (userInfo, cb) {
    // console.log(userInfo)
    // console log the remote method
    //loggingRemote(User, 'User', 'auth');

    var UserIdentity = app.models.UserIdentity;
    var Role = app.models.Role;
    var Rolemap = app.models.Rolemap;

    checkTokenValid(userInfo.accessToken).then(function (res) {
      // === check if the access token is short live token ===
      if (userInfo.accessToken && userInfo.expiresIn && userInfo.expiresIn < 10000) {
        // exchange for long live Fb token
        request('https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=' + FB_CLIENT_ID + '&client_secret=' + FB_APP_SECRET + '&fb_exchange_token=' + userInfo.accessToken, function (err, res, body) {
          if (err) {
            var reqError = { message: 'Request from facebook error', status: 401 };
            cb(reqError);
          }
          var result = JSON.parse(body);
          // console.log('facebook result : ', result);
          if (result.error) {
            var tokenError = { message: result.error.message, status: 401 };
            cb(tokenError);
          }
          var access_token = result.access_token,
              token_type = result.token_type,
              expires_in = result.expires_in;

          userInfo.accessToken = access_token;
          userInfo.expiresIn = expires_in;
          checkExistThenLogin(userInfo);
        });
      } else {
        checkExistThenLogin(userInfo);
      } // <--- if it is short live, get long live token 
      return null;
    }).catch(function (error) {
      cb({ message: error, status: 401 });
    });

    // Get facebook API to check if the token is valid 
    function checkTokenValid(fbtoken) {
      return new Promise(function (resolve, reject) {
        request('https://graph.facebook.com/debug_token?input_token=' + fbtoken + '&access_token=' + FB_CLIENT_ID + '|' + FB_APP_SECRET, function (err, res, body) {
          if (err) {
            reject(err);
            return false;
          }
          var result = JSON.parse(body);
          if (result.error !== undefined) {
            reject(result.error.message);
            return false;
          } else {
            var valid = result.data.is_valid && result.data.expires_at > new Date().getTime() / 1000 ? 'valid' : 'invalid';
            valid == 'valid' ? resolve(true) : reject('invalid token');
            return true;
          }
        });
      });
    }; //<--- end of check token valid sync function

    function checkExistThenLogin(userInfo) {
      if (userInfo.accessToken && userInfo.username && userInfo.userId) {
        checkUserExist(userInfo) // <----- checkuserexist promise
        .then(function (res) {
          if (res === true) {
            var loginCred = { ttl: userInfo.expiresIn, username: userInfo.userId + '@teleclaw', password: userInfo.userId };
            return loginUser(loginCred, userInfo, false);
          } else {
            return signUpUser(userInfo).then(function (res) {
              return loginUser(res, userInfo, true);
            });
          }
        }).then(function (res) {
          cb(null, res);
        }).catch(function (err) {
          console.log(err);
          cb(err);
        }); // <----- checkuserexist promise
      } else {
        var authError = {
          type: 'authentication error',
          message: 'required info missing',
          status: 401
        };
        cb(authError);
      }; // <---- if statement checking whether enough info provided
    }; // <--- function of handling user login or signup end

    // check the user Identity already in our DB
    function checkUserExist(userInfo) {
      var id = userInfo.userId;
      var username = userInfo.username,
          accessToken = userInfo.accessToken,
          picture = userInfo.picture,
          email = userInfo.email;

      return new Promise(function (resolve, reject) {
        UserIdentity.findById(id, function (err, identity) {
          if (err) {
            console.log('find identity error : ', err);
            reject(err);
          } else if (identity === null) {
            console.log('find no identity');
            resolve(false);
          } else {
            identity.updateAttributes({ username: username, email: email, picture: picture, accesstoken: accessToken }, function (err, instance) {
              if (err) {
                console.log('update user identity error : ', err);
              };
            });
            console.log('found an identity : ', identity);
            resolve(true);
          }
        });
      });
    };

    //perform user login
    function loginUser(loginCred, userInfo, isNew) {
      return new Promise(function (resolve, reject) {
        User.login(loginCred, function (loginError, token) {
          if (loginError) {
            console.log('login error : ', loginError);
            reject({ 'loginError': loginError });
          } else {
            console.log('login success : ', loginCred.username);
            resolve({ newUser: isNew, lbToken: token, fbToken: userInfo.accessToken, ttl: userInfo.expiresIn });
          }
        });
      });
    }

    //perform create user steps
    function signUpUser(newUser) {
      var userData = {
        lastLogIn: new Date().getTime(),
        name: newUser.username,
        username: newUser.userId + '@teleclaw',
        email: newUser.email || null,
        password: newUser.userId,
        language: newUser.language
      };
      return new Promise(function (resolve, reject) {
        User.create(userData, function (userCreateErr, createdUser) {
          if (userCreateErr) {
            reject({ type: 'create user error', error: userCreateErr });
          };
          var identityInfo = {
            id: newUser.userId,
            userId: createdUser.id,
            provider: 'facebook',
            username: newUser.username,
            email: newUser.email || null,
            picture: newUser.picture,
            accesstoken: newUser.accessToken
          };
          //create the identity with the facebook info
          UserIdentity.create(identityInfo, function (identityErr, identity) {
            if (identityErr) {
              // console.log('create identity error : ', identityErr);
              reject({ type: 'create identity error', error: identityErr });
            }
          });
          // find a user role and assign
          Role.findOne({ where: { name: 'user' } }, function (findRoleErr, data) {
            var thisRoleId = data.id;
            Rolemap.create({ principalType: 'USER', principalId: createdUser.id, roleId: thisRoleId });
          });
          var loginCred = { ttl: newUser.expiresIn, username: newUser.userId + '@teleclaw', password: userData.password };
          resolve(loginCred);
        });
      });
    }; // <--- loopback signup function end
  }; // <--- end of remote method : auth

  User.remoteMethod('auth', {
    accepts: { arg: 'userInfo', type: 'object', http: { source: 'body' } },
    returns: { arg: 'result', type: 'object' }
  });

  // remote method to create teleClaw admin (wip)
  User.createAdmin = function (info, cb) {
    var Role = app.models.Role;
    var Rolemap = app.models.Rolemap;
    Role.find({ where: { name: 'teleClawAdmin' } }).then(function (role) {
      cb(null, 'hi');
      console.log(role);
    }).catch(function (err) {
      cb(err);
    });
  };

  User.remoteMethod('createAdmin', {
    http: { path: '/createAdmin', verb: 'post' },
    accepts: { arg: 'info', type: 'object', http: { source: 'body' } },
    returns: { arg: 'result', type: 'string' }
  });

  // remote method the authenticate pusher connect
  User.pusherAuth = function (id, req, res, cb) {
    // console.log(req.body);
    var body = req.body;
    var socketId = body.socket_id;
    var channel = body.channel_name;
    var pusher = app.pusher;
    var UserIdentity = app.models.UserIdentity;

    UserIdentity.findOne({ where: { userId: id } }, function (error, identity) {
      if (identity !== null) {
        // console.log(identity);
        var picture = identity.picture ? identity.picture.url : null;
        var presenceData = {
          user_id: id,
          user_info: {
            name: identity.username,
            picture: picture
          }
        };
        var auth = pusher.authenticate(socketId, channel, presenceData);
        res.send(auth);
      };
    });
  };

  User.remoteMethod('pusherAuth', {
    http: { path: '/:id/pusherAuth', verb: 'post' },
    accepts: [{ arg: 'id', type: 'string', required: true }, { arg: 'req', type: 'object', http: { source: 'req' } }, { arg: 'res', type: 'object', http: { source: 'res' } }]
  });
};