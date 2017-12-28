'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel, loggingRemote } from '../utils/createLogging.js';
const request = require('request');
const Promise = require('bluebird');
const shortid = require('shortid');

const { FB_APP_SECRET, FB_CLIENT_ID, FB_APP_TOKEN } = process.env ; 

module.exports = function(User) {

  let app = require('../server');
  // Remove existing validations for email
  delete User.validations.email;

  //make loggings for monitor purpose
  // loggingModel(User);

  // assgin last updated time / created time to model
  updateTimeStamp(User);

  User.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){
      ctx.instance.referral = { code: shortid.generate(), isReferred: false, numOfRefer: 0};
      ctx.instance.bindedDevice = [];
    }
    next();
  });

  User.observe('after save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let Event = app.models.Event;
      let Wallet = app.models.Wallet;
      let Reservation = app.models.Reservation;
      Event.find({'where': {'launching': true, 'eventDetails.newUser.initialCoins': {'exists': true}}}, (err, event)=>{
        if(err){
          next(err);
        }
        let initialCoins = event.length > 0 ? event.eventDetails.newUser.initialCoins : 60;
        let wallet = {
          balance: initialCoins,
          userId: ctx.instance.id
        };
        let reserve = {
          status: 'close',
          userId: ctx.instance.id,
          machineId: null,
          productId: null
        }
        Wallet.create(wallet, (error, wallet)=>{})
        Reservation.create(reserve, (error, reserve)=>{})
      })
    };
    next();
  });

  User.afterRemote('auth', (ctx, result, next)=>{
    if(result.result.lbToken !== undefined){
      let { userId } = result.result.lbToken;
      User.findById(userId, (error, user)=>{
        user.updateAttributes({lastLogIn: new Date().getTime()})
      })
    }
    next();
  })

  User.auth = (userInfo, cb) => {
    // console.log(userInfo)
    // console log the remote method
    //loggingRemote(User, 'User', 'auth');

    let UserIdentity = app.models.UserIdentity;
    let Role = app.models.Role;
    let Rolemap = app.models.Rolemap;

    checkTokenValid(userInfo.accessToken)
      .then(res => {
        // === check if the access token is short live token ===
        if(userInfo.accessToken && userInfo.expiresIn && userInfo.expiresIn < 10000){
          // exchange for long live Fb token
          request(`https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_CLIENT_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${userInfo.accessToken}`,
            (err, res, body) => {
              if(err){
                let reqError = { message:'Request from facebook error',status: 401 };
                cb(reqError);
              }
              let result = JSON.parse(body);
              // console.log('facebook result : ', result);
              if(result.error){
                let tokenError = {message: result.error.message, status: 401 }
                cb(tokenError);
              } 
              let { access_token, token_type, expires_in } = result;
              userInfo.accessToken = access_token;
              userInfo.expiresIn = expires_in;
              checkExistThenLogin(userInfo);
            });
        } else {
          checkExistThenLogin(userInfo)
        } // <--- if it is short live, get long live token 
        return null
      })
      .catch(error => {
        cb({message: error, status: 401})
      })

    // Get facebook API to check if the token is valid 
    function checkTokenValid(fbtoken){
      return new Promise((resolve, reject)=> {
        request(`https://graph.facebook.com/debug_token?input_token=${fbtoken}&access_token=${FB_CLIENT_ID}|${FB_APP_SECRET}`, (err, res, body)=>{
          if(err){
            reject(err);
            return false
          }
          let result = JSON.parse(body);
          if(result.error !== undefined){
            reject(result.error.message);
            return false
          } else {
            let valid = (result.data.is_valid && result.data.expires_at > new Date().getTime()/1000 ) ? 'valid' : 'invalid' ;
            valid == 'valid' ? resolve(true) : reject('invalid token') ;
            return true;
          }
        });
      });
    }; //<--- end of check token valid sync function

    function checkExistThenLogin(userInfo){
        if( userInfo.accessToken && userInfo.username && userInfo.userId ){
          checkUserExist(userInfo) // <----- checkuserexist promise
            .then(res => {
              if(res === true){
                let loginCred = { ttl : userInfo.expiresIn , username : userInfo.userId + '@teleclaw' , password : userInfo.userId };
                return loginUser(loginCred, userInfo, false)
              }else{
                return signUpUser(userInfo).then(res=>loginUser(res, userInfo, true))
              }
            })
            .then(res => {
              cb(null, res)
            })
            .catch(err => {
              console.log(err)
              cb(err);
            }) // <----- checkuserexist promise
        } else {
          let authError = {
            type: 'authentication error',
            message: 'required info missing',
            status: 401
          }
          cb(authError);
        }; // <---- if statement checking whether enough info provided
    };// <--- function of handling user login or signup end

    // check the user Identity already in our DB
    function checkUserExist(userInfo){
      let id = userInfo.userId;
      let { username, accessToken, picture, email } = userInfo;
      return new Promise((resolve, reject)=>{
        UserIdentity.findById(id, (err, identity)=>{
          if(err){
            console.log('find identity error : ', err);
            reject(err);
          } else if (identity === null) {
            console.log('find no identity');
            resolve(false)
          } else {
            identity.updateAttributes({username: username, email: email, picture: picture, accesstoken: accessToken}, (err, instance)=>{
              if(err){console.log('update user identity error : ', err);};
            });
            console.log('found an identity : ', identity);
            resolve(true);
          }
        });
      });
    };

    //perform user login
    function loginUser(loginCred, userInfo, isNew){
      return new Promise((resolve, reject)=>{
        User.login(loginCred, (loginError,token)=>{
          if(loginError){
            console.log('login error : ', loginError);
            reject({'loginError': loginError});
          } else {
            console.log('login success : ', loginCred.username);
            resolve({newUser: isNew, lbToken: token, fbToken: userInfo.accessToken, ttl: userInfo.expiresIn});
          }
        });
      });
    }

    //perform create user steps
    function signUpUser(newUser){
      let userData = {
        lastLogIn: new Date().getTime(),
        name: newUser.username, 
        username: newUser.userId + '@teleclaw',
        email: newUser.email || null,
        password: newUser.userId,
        language: newUser.language
      }
      return new Promise((resolve, reject)=>{ 
        User.create(userData, (userCreateErr, createdUser)=>{
          if(userCreateErr){
            reject({type: 'create user error', error: userCreateErr})
          };
          let identityInfo = {
            id: newUser.userId,
            userId: createdUser.id,
            provider: 'facebook',
            username: newUser.username,
            email: newUser.email || null,
            picture: newUser.picture,
            accesstoken: newUser.accessToken
          };
          //create the identity with the facebook info
          UserIdentity.create(identityInfo, (identityErr, identity)=>{
            if(identityErr){
              // console.log('create identity error : ', identityErr);
              reject({type: 'create identity error', error: identityErr});
            }
          });
          // find a user role and assign
          Role.findOne({ where: { name : 'user' }},(findRoleErr,data) => {
            let thisRoleId = data.id;
            Rolemap.create({ principalType: 'USER' , principalId: createdUser.id, roleId: thisRoleId });
          });
          let loginCred = { ttl : newUser.expiresIn , username : newUser.userId + '@teleclaw' , password : userData.password };
          resolve(loginCred);
        });
      });
    }; // <--- loopback signup function end

  }; // <--- end of remote method : auth

  User.remoteMethod(
    'auth',
    {
      accepts: {arg: 'userInfo', type: 'object', http: {source: 'body'}},
      returns: {arg: 'result', type: 'object'}
    }
  );

  // remote method to create teleClaw admin (wip)
  User.createAdmin = (info, cb) => {
    let Role = app.models.Role;
    let Rolemap = app.models.Rolemap;
    Role.find({where: { name: 'teleClawAdmin' }})
      .then(role=>{
        cb(null, 'hi')
        console.log(role);
      })
      .catch(err=>{
        cb(err)
      })
  };

  User.remoteMethod(
    'createAdmin',
    {
      http: {path: '/createAdmin', verb: 'post'}, 
      accepts: {arg: 'info', type: 'object', http: {source: 'body'}},
      returns: {arg: 'result', type: 'string'}
    }
  );

  // remote method the authenticate pusher connect
  User.pusherAuth = (id, req, res, cb) => {
    // console.log(req.body);
    var body = req.body;
    var socketId = body.socket_id;
    var channel = body.channel_name;
    var pusher = app.pusher;
    let UserIdentity = app.models.UserIdentity;

    UserIdentity.findOne({where: {userId: id}}, (error, identity)=>{
      if(identity !== null){
        // console.log(identity);
        let picture = identity.picture ? identity.picture.url : null ;
        var presenceData = {
          user_id: id,
          user_info: {
            name: identity.username,
            picture: picture
          }
        }
        var auth = pusher.authenticate(socketId, channel, presenceData);
        res.send(auth);
      };
    });
  }

  User.remoteMethod(
    'pusherAuth',
    {
      http: {path: '/:id/pusherAuth', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'req', type: 'object', http: {source: 'req'}}, 
        {arg: 'res', type: 'object', http: {source: 'res'}}
      ]
    }
  )

};
