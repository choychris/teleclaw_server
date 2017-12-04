'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel, loggingRemote } from '../utils/createLogging.js';
var request = require('request');
var Promise = require('bluebird');

const FB_APP_SECRET = 'e1af1950c0642c405a28c1e706059b7c';
const FB_CLIENT_ID = '144167082893443';
const FB_APP_TOKEN = 'e4eb506efe7786bf8b772e10c4eaf7e8';


module.exports = function(User) {

  var app = require('../server');
  // Remove existing validations for email
  delete User.validations.email;
  // delete User.validations.username;

  //make loggings for monitor purpose
  loggingModel(User);

  // assgin last updated time / created time to model
  updateTimeStamp(User);

  User.observe('after save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let Event = app.models.Event;
      let Wallet = app.models.Wallet;
      let Reservation = app.models.Reservation;
      Event.find({where : {launching: true}}, (err, event)=>{
        if(!err){
          let newUserEvent = event.newUser;
          let initialCoins = newUserEvent ? newUserEvent.initialCoins : 60;
          let wallet = {
            balance: initialCoins || 60 ,
            userId: ctx.instance.id
          };
          let reserve = {
            status: 'closed',
            userId: ctx.instance.id
          }
          Wallet.create(wallet, (error, wallet)=>{})
          Reservation.create(reserve, (error, reserve)=>{})
        }
      })
    };
    next();
  });

  User.auth = (userInfo, cb) => {
    // console.log(userInfo)

    // console log the remote method
    loggingRemote(User, 'User', 'auth');

    // userInfo.provider = 'facebook';

    let UserIdentity = app.models.UserIdentity;
    let Role = app.models.Role;
    let Rolemap = app.models.Rolemap;

    
    checkTokenValid(userInfo.accessToken)
      .then(res => {
        // === check if the access token is short live token ===
        if(userInfo.accessToken !== undefined && userInfo.expiresIn !== undefined && userInfo.expiresIn < 10000){
          // exchange for long live Fb token
          request(`https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_CLIENT_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${userInfo.accessToken}`,
            (err, res, body) => {
              if(err){
                var reqError = {
                  message:'Request from facebook error',
                  status: 401
                };
                cb(reqError);
                return;
              } else {
                let result = JSON.parse(body);
                // console.log('facebook result : ', result);
                if(result.error !== undefined){
                  var tokenError = {
                    type: result.error.type,
                    message: result.error.message,
                    status: 401
                  }
                  cb(tokenError);
                } else {
                  let { access_token, token_type, expires_in } = result;
                  userInfo.accessToken = access_token;
                  userInfo.expiresIn = expires_in;
                  checkExistThenLogin(userInfo);
                }
              }
            });
        } else {
          checkExistThenLogin(userInfo)
        } // <--- if it is short live, get long live token 
      })
      .catch(error => {
        cb({message: error, status: 401})
      })


    function checkExistThenLogin(userInfo){
        if( userInfo.accessToken && userInfo.username && userInfo.userId ){
          checkUserExist(userInfo) // <----- checkuserexist promise
            .then(res => {
              if(res === true){
                let loginCred = { ttl : userInfo.expiresIn , username : userInfo.userId + '@teleclaw' , password : userInfo.userId };
                User.login(loginCred, (err, token)=>{
                  console.log('login success : ' , loginCred.username );
                  cb(null, {lbToken: token, fbToken: userInfo.accessToken, ttl: userInfo.expiresIn})
                })
              } else {
                signUpUser(userInfo) // <----- signUp user asyn promise
                  .then(res => {
                    cb(null, res.result)
                  })
                  .catch(err => {
                    console.log(err.type, ':', err.error);
                    cb(err.error);
                  })
              };
            })
            .catch(err => {
              console.log(err)
              cb(err);
            }) // <----- checkuserexist promise
        } else {
          var authError = {
            type: 'authentication error',
            message: 'required info missing',
            status: 401
          }
          cb(authError);
        }; // <---- if statement checking whether enough info provided
    };// <--- function of handling user login or signup

    function signUpUser(newUser){
      let userData = {
        lastLogIn: new Date().getTime(),
        logInStatus: true,
        name: newUser.username, 
        username: newUser.userId + '@teleclaw',
        email: newUser.email || null,
        password: newUser.userId
      }
      return new Promise((resolve, reject)=>{ 
        User.create(userData, (userCreateErr, createdUser)=>{
          if(userCreateErr){
            return reject({type: 'create user error', error: userCreateErr})
          };
          if(createdUser.id !== undefined){
            let identityInfo = {
              id: newUser.userId,
              userId: createdUser.id,
              provider: 'facebook',
              username: newUser.username,
              email: newUser.email || null,
              picture: newUser.picture,
              accesstoken: newUser.accessToken
            };
            // console.log(identityInfo);
            // console.log(User);
            UserIdentity.create(identityInfo, (identityErr, identity)=>{
              if(identityErr){
                // console.log('create identity error : ', identityErr);
                return reject({type: 'create identity error', error: identityErr});
              } else {
                Role.findOne({ where: { name : 'user' }},(findRoleErr,data) => {
                  let thisRoleId = data.id;
                  Rolemap.create({ principalType: 'USER' , principalId: createdUser.id, roleId: thisRoleId });
                });
                let loginCred = { ttl : newUser.expiresIn , username : newUser.userId + '@teleclaw' , password : userData.password };
                User.login(loginCred, (loginError,token)=>{
                  if(loginError){
                    // console.log('login after error : ', loginError);
                    return reject({type: 'login after signup error', error: loginError});
                  } else {
                    console.log('login success : ', loginCred.username);
                    return resolve({type: 'sign up complete', result: {lbToken: token, fbToken: newUser.accessToken, ttl: newUser.expiresIn}});
                  }
                });
              }
            });
          }
        });
      });
    }; // <--- loopback signup function

    function checkUserExist(userInfo){
      let id = userInfo.userId;
      let { username, accessToken, picture, email } = userInfo;
      return new Promise((resolve, reject)=>{
        UserIdentity.findById(id, (err, identity)=>{
          if(err){
            console.log('find identity error : ', err);
            return reject(err);
          } else if (identity === null) {
            console.log('find no identity');
            return resolve(false)
          } else {
            identity.updateAttributes({username: username, email: email, picture: picture, accesstoken: accessToken}, (err, instance)=>{
              if(err){console.log('update user identity error : ', err);};
            });
            console.log('found an identity : ', identity);
            return resolve(true);
          }
        });
      });
    };

    function checkTokenValid(fbtoken){
      return new Promise((resolve, reject)=> {
        request(`https://graph.facebook.com/debug_token?input_token=${fbtoken}&access_token=${FB_CLIENT_ID}|${FB_APP_SECRET}`, (err, res, body)=>{
          if(err){
            reject(err);
          }
          var result = JSON.parse(body);
          if(result.error !== undefined){
            reject(result.error.message);
          } else {
            let valid = (result.data.is_valid && result.data.expires_at > new Date().getTime()/1000 ) ? 'valid' : 'invalid' ;
            valid == 'valid' ? resolve(true) : reject('invalid token') ;
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

  User.remoteMethod(
    'auth',
    {
      accepts: {arg: 'userInfo', type: 'object', http: {source: 'body'}},
      returns: {arg: 'result', type: 'object'}
    }
  );

  User.checkTokenValid = (fbtoken, cb) => {

   // console log the remote method
    loggingRemote(User, 'User', 'checkTokenValid');

   // console.log(fbtoken.token);
    var tokenToCheck = fbtoken.token;
    request(`https://graph.facebook.com/debug_token?input_token=${tokenToCheck}&access_token=${FB_CLIENT_ID}|${FB_APP_SECRET}`, (err, res, body)=>{
      if(err){
        // console.log(err)
        cb(err);
      } else { 
        var result = JSON.parse(body);
        // console.log('check token result : ',result);
        if(result.error !== undefined){
          cb({message: result.error.message, status: 401})
        } else {
          var valid = (result.data.is_valid && result.data.expires_at > new Date().getTime()/1000 ) ? 'valid' : 'invalid' ;
          // console.log(valid);
          cb(null, valid);
        }
      }
    });
  };

  User.remoteMethod(
    'checkTokenValid',
    {
      accepts: {arg: 'FBtoken', type: 'object', http: {source: 'body'}},
      returns: {arg: 'result', type: 'string'}
    }
  );

};
