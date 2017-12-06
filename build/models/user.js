'use strict';

var _beforeSave = require('../utils/beforeSave.js');

var _createLogging = require('../utils/createLogging.js');

var request = require('request');
var Promise = require('bluebird');
var _process$env = process.env,
    FB_APP_SECRET = _process$env.FB_APP_SECRET,
    FB_CLIENT_ID = _process$env.FB_CLIENT_ID,
    FB_APP_TOKEN = _process$env.FB_APP_TOKEN;


module.exports = function (User) {

  var app = require('../server');
  // Remove existing validations for email
  delete User.validations.email;

  //make loggings for monitor purpose
  (0, _createLogging.loggingModel)(User);

  // assgin last updated time / created time to model
  (0, _beforeSave.updateTimeStamp)(User);

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
          balance: initialCoins || 60,
          userId: ctx.instance.id
        };
        var reserve = {
          status: 'close',
          userId: ctx.instance.id,
          machineId: 'none'
        };
        Wallet.create(wallet, function (error, wallet) {});
        Reservation.create(reserve, function (error, reserve) {});
      });
    };
    next();
  });

  User.auth = function (userInfo, cb) {
    // console.log(userInfo)

    // console log the remote method
    (0, _createLogging.loggingRemote)(User, 'User', 'auth');

    // userInfo.provider = 'facebook';

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
    }).catch(function (error) {
      cb({ message: error, status: 401 });
    });

    function checkExistThenLogin(userInfo) {
      if (userInfo.accessToken && userInfo.username && userInfo.userId) {
        checkUserExist(userInfo) // <----- checkuserexist promise
        .then(function (res) {
          if (res === true) {
            var loginCred = { ttl: userInfo.expiresIn, username: userInfo.userId + '@teleclaw', password: userInfo.userId };
            User.login(loginCred, function (err, token) {
              console.log('login success : ', loginCred.username);
              cb(null, { newUser: false, lbToken: token, fbToken: userInfo.accessToken, ttl: userInfo.expiresIn });
            });
          } else {
            signUpUser(userInfo).then(function (res) {
              cb(null, res.result);
            }).catch(function (err) {
              cb(err);
            });
          };
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
    }; // <--- function of handling user login or signup

    function signUpUser(newUser) {
      var userData = {
        lastLogIn: new Date().getTime(),
        logInStatus: true,
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
            return false;
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
          UserIdentity.create(identityInfo, function (identityErr, identity) {
            if (identityErr) {
              // console.log('create identity error : ', identityErr);
              reject({ type: 'create identity error', error: identityErr });
              return false;
            }
          });
          Role.findOne({ where: { name: 'user' } }, function (findRoleErr, data) {
            var thisRoleId = data.id;
            Rolemap.create({ principalType: 'USER', principalId: createdUser.id, roleId: thisRoleId });
          });
          var loginCred = { ttl: newUser.expiresIn, username: newUser.userId + '@teleclaw', password: userData.password };
          User.login(loginCred, function (loginError, token) {
            if (loginError) {
              // console.log('login after error : ', loginError);
              reject({ type: 'login after signup error', error: loginError });
              return false;
            } else {
              console.log('login success : ', loginCred.username);
              resolve({ type: 'sign up complete', result: { newUser: true, lbToken: token, fbToken: newUser.accessToken, ttl: newUser.expiresIn } });
              return true;
            }
          });
        });
      });
    }; // <--- loopback signup function

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
            return false;
          } else if (identity === null) {
            console.log('find no identity');
            resolve(false);
            return false;
          } else {
            identity.updateAttributes({ username: username, email: email, picture: picture, accesstoken: accessToken }, function (err, instance) {
              if (err) {
                console.log('update user identity error : ', err);
              };
            });
            console.log('found an identity : ', identity);
            resolve(true);
            return true;
          }
        });
      });
    };

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
    } //<--- end of check token valid sync function
  }; // <--- end of remote method : auth

  // User.afterRemote('auth', (ctx, instance, next)=>{
  //   //console.log(ctx.args);
  //   let { username, email, picture, userId, accesstoken } = ctx.args.userInfo;
  //   let UserIdentity = app.models.UserIdentity;
  //   UserIdentity.findById(userId, (err, identity)=>{
  //     if(identity){
  //       identity.updateAttributes({username: username, email: email, picture: picture, accesstoken: accessToken}, (err, instance)=>{
  //         if(err){console.log('update user identity error : ', err);};
  //       });
  //     }
  //   })
  //   next();
  // });

  User.remoteMethod('auth', {
    accepts: { arg: 'userInfo', type: 'object', http: { source: 'body' } },
    returns: { arg: 'result', type: 'object' }
  });

  User.checkTokenValid = function (fbtoken, cb) {

    // console log the remote method
    (0, _createLogging.loggingRemote)(User, 'User', 'checkTokenValid');

    // console.log(fbtoken.token);
    var tokenToCheck = fbtoken.token;
    request('https://graph.facebook.com/debug_token?input_token=' + tokenToCheck + '&access_token=' + FB_CLIENT_ID + '|' + FB_APP_SECRET, function (err, res, body) {
      if (err) {
        // console.log(err)
        cb(err);
      } else {
        var result = JSON.parse(body);
        // console.log('check token result : ',result);
        if (result.error !== undefined) {
          cb({ message: result.error.message, status: 401 });
        } else {
          var valid = result.data.is_valid && result.data.expires_at > new Date().getTime() / 1000 ? 'valid' : 'invalid';
          // console.log(valid);
          cb(null, valid);
        }
      }
    });
  };

  User.remoteMethod('checkTokenValid', {
    accepts: { arg: 'FBtoken', type: 'object', http: { source: 'body' } },
    returns: { arg: 'result', type: 'string' }
  });

  User.createAdmin = function (info, cb) {};

  User.createAdmin('createAdmin', {
    accepts: { arg: 'info', type: 'object', http: { source: 'body' } },
    returns: { arg: 'result', type: 'string' }
  });
};