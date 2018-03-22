'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel, loggingFunction, loggingRemote } from '../utils/createLogging.js';
const request = require('request');
const Promise = require('bluebird');
const shortid = require('shortid');

const { FB_APP_SECRET, FB_CLIENT_ID, FB_APP_TOKEN } = process.env ; 

module.exports = function(User) {

  let app = require('../server');
  // Remove existing validations for email
  delete User.validations.email;
  User.disableRemoteMethodByName('login');

  //make loggings for monitor purpose
  loggingModel(User);
  //loggingRemote(User, 'auth');

  // assgin last updated time / created time to model
  updateTimeStamp(User);

  User.observe('before save', (ctx, next)=>{
    if(ctx.isNewInstance){
      // set user's properties when create new user
      ctx.instance.referral = { code: generateReferCode(), isReferred: false, numOfReferred: 0};
      ctx.instance.bindedDevice = [];
      ctx.instance.address = {};
      ctx.instance.status = true;
      ctx.instance.preference = { sound: true, vibration: true };
    }else{
      if(ctx.data && ctx.data.lastLogIn !== undefined){
        // lastLogIn should be decide by backend
        ctx.data.lastLogIn = new Date().getTime();
      }
    }
    next();
  });

  function generateReferCode(){
    let random = shortid.generate().substring(0,3)
    let combine = new Date().getTime() + "_" + random ;
    return combine.slice(6);
  }

  User.observe('after save', (ctx, next)=>{
    if(ctx.isNewInstance){
      let { Event, Wallet, Reservation } = app.models;
      Event.findOne({'where': {'launching': true, type: 'signUp'}, order: 'startTime DESC'}, (err, event)=>{
        if(err){
          loggingFunction('User | ', 'Event.findOne error | ', err, 'error');
          next(err);
        }
        let initialCoins = event ? event.rewardAmount : 0;
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
        // create wallet and reservation for user
        Wallet.create(wallet, (error, wallet)=>{})
        Reservation.create(reserve, (error, reserve)=>{})
      })//<-- eveny.findOne end
    };
    next();
  });

  // update user login time when user login
  // User.afterRemote('auth', (ctx, result, next)=>{
  //   if(result.result.lbToken !== undefined){
  //     let { userId } = result.result.lbToken;
  //     User.findById(userId, (error, user)=>{
  //       user.updateAttributes({lastLogIn: new Date().getTime()})
  //     });
  //   };
  //   next();
  // })

  User.auth = (userInfo, cb) => {
    // console.log(userInfo)
    let { UserIdentity, Role, Rolemap } = app.models;

    // 1st check whether the token is valid from Facebook
    checkTokenValid(userInfo.accessToken)
      .then(res => {
        // === check if the access token is short live token ===
        if(userInfo.accessToken && userInfo.expiresIn && userInfo.expiresIn < 10000){
          // exchange for long live Fb token
          request(`https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_CLIENT_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${userInfo.accessToken}`,
            (err, res, body) => {
              if(err){
                loggingFunction('User | ', 'exchange long live token error | ', err, 'error');
                let reqError = { message:'Request from facebook error',status: 401 };
                cb(reqError);
              }
              let result = JSON.parse(body);
              // console.log('facebook result : ', result);
              if(result.error){
                loggingFunction('User | ', 'exchange long live token error | ', result.error, 'error');
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
            loggingFunction('User | ', 'fb check token valid api error | ', err, 'error');
            reject(err);
            return false
          }
          let result = JSON.parse(body);
          if(result.error !== undefined){
            loggingFunction('User | ', 'fb check token valid api error | ', result.error, 'error');
            reject(result.error.message);
            return false
          } else {
            let valid = (result.data.is_valid && result.data.expires_at > new Date().getTime()/1000 ) ? 'valid' : 'invalid' ;
            valid == 'valid' ? resolve(true) : reject(new Error('invalid token')) ;
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
              loggingFunction('User | ', 'checkExistThenLogin error | ', err, 'error');
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
            loggingFunction('User | ', 'find identity error | ', err, 'error');
            reject(err);
          } else if (identity === null) {
            resolve(false)
          } else {
            let dummyProfile = {
              width: 50,
              height: 50,
              url: "https://scontent.xx.fbcdn.net/v/t1.0-1/c15.0.50.50/p50x50/10354686_10150004552801856_220367501106153455_n.jpg?_nc_cat=0&oh=3f6c91428fc256182541f697d6bb84d3&oe=5B3B0A2F",
              is_silhouette:true
            }
            let profilePic = picture ? picture.data : dummyProfile;
            identity.updateAttributes({username: username, email: email, picture: profilePic, accesstoken: accessToken}, (err, instance)=>{
              if(err){
                loggingFunction('User | ', 'update user identity error | ', err, 'error');
                reject(err)
              };
            });
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
            loggingFunction('User | ', 'user login error | ', loginError, 'error');
            reject({'loginError': loginError});
          } else {
            loggingFunction('User | ', 'user login | ', `logIn success : ${token.userId}`);
            resolve({newUser: isNew, lbToken: token, fbToken: userInfo.accessToken, ttl: userInfo.expiresIn});
          }
        });
      });
    }

    //perform create user steps
    function signUpUser(newUser){
      let dummyProfile = {
        width: 50,
        height: 50,
        url: "https://scontent.xx.fbcdn.net/v/t1.0-1/c15.0.50.50/p50x50/10354686_10150004552801856_220367501106153455_n.jpg?_nc_cat=0&oh=3f6c91428fc256182541f697d6bb84d3&oe=5B3B0A2F",
        is_silhouette:true
      }
      let profilePic = newUser.picture ? newUser.picture.data : dummyProfile;

      let userData = {
        lastLogIn: 10000,
        name: newUser.username, 
        username: newUser.userId + '@teleclaw',
        email: newUser.email || null,
        password: newUser.userId,
        language: newUser.language,
        picture: profilePic.url
      }
      return new Promise((resolve, reject)=>{ 
        User.create(userData, (userCreateErr, createdUser)=>{
          if(userCreateErr){
            loggingFunction('User | ', 'create user error | ', userCreateErr, 'error');
            reject({type: 'create user error', error: userCreateErr})
          };

          let identityInfo = {
            id: newUser.userId,
            userId: createdUser.id,
            provider: 'facebook',
            username: newUser.username,
            email: newUser.email || null,
            picture: profilePic,
            accesstoken: newUser.accessToken
          };
          //create the identity with the facebook info
          UserIdentity.create(identityInfo, (identityErr, identity)=>{
            if(identityErr){
              // console.log('create identity error : ', identityErr);
              loggingFunction('User | ', 'create identity error | ', identityErr, 'error');
              reject({type: 'create identity error', error: identityErr});
            }
          });
          // find a user role and assign
          Role.findOne({ where: { name : 'user' }},(findRoleErr,data) => {
            let thisRoleId = data.id;
            Rolemap.create({ principalType: 'USER' , principalId: createdUser.id, roleId: thisRoleId });
          });
          loggingFunction('User | ', 'User sign Up Success| ', newUser.username, 'info');
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
    let { Role, Rolemap } = app.models;
    let { username, password } = info;
    Role.findOne({where: { name: 'teleClawAdmin' }})
    .then(role=>{
      return [User.create({username: username, password:password, admin: true}), role]
    }).spread((user, role)=>{
      return Rolemap.create({ principalType: 'USER' , principalId: user.id, roleId: role.id });
    }).then(res=>{
      cb(null, 'create admin success');
    }).catch(err=>{
      loggingFunction('User | ', 'create admin error | ', err, 'error');
      cb(err)
    });
  };

  User.remoteMethod(
    'createAdmin',
    {
      http: {path: '/createAdmin', verb: 'post'}, 
      accepts: {arg: 'info', type: 'object', http: {source: 'body'}},
      returns: {arg: 'result', type: 'string'}
    }
  );

  User.loginAdmin = (info, cb) => {
    let { Role, Rolemap } = app.models;
    let { username, password, ttl } = info;
    let loginttl = ttl || 1230000 ;
    User.findOne({where:{username: username}})
    .then(user=>{
      if(!!user && user.admin){
        return User.login({username: username, password: password, ttl: loginttl})
      }else{
        return 'authorization_required'
      }
    })
    .then(res => {
      cb(null, res)
    })
    .catch(error=>{
      loggingFunction('User | ', 'Login admin error |', error, 'error');
      cb(error)
    })
  };

  User.remoteMethod(
    'loginAdmin',
    {
      http: {path: '/loginAdmin', verb: 'post'}, 
      accepts: {arg: 'info', type: 'object', http: {source: 'body'}},
      returns: {arg: 'response', type: 'object'}
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
        let picture = identity.picture ? identity.picture.url : "https://scontent.xx.fbcdn.net/v/t1.0-1/c15.0.50.50/p50x50/10354686_10150004552801856_220367501106153455_n.jpg?_nc_cat=0&oh=3f6c91428fc256182541f697d6bb84d3&oe=5B3B0A2F" ;
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
