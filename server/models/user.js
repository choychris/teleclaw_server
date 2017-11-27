'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
var request = require('request');

const FB_APP_SECRET = 'e1af1950c0642c405a28c1e706059b7c';


module.exports = function(User) {

  var app = require('../server');

  //make loggings for monitor purpose
  loggingModel(User);

  // assgin last updated time / created time to model
  updateTimeStamp(User);

  User.auth = (userInfo, cb) => {
    console.log(userInfo)
    let user = {
      provider: 'facebook',
      id: userInfo.userID,
      name: userInfo.name,
      email: userInfo.email || null,
      photo: userInfo.picture
    };
    if(userInfo.accessToken !== undefined && userInfo.expiresIn !== undefined && userInfo.expiresIn < 15000){
      // exchange for long live Fb token
      request(`https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${'144167082893443'}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${userInfo.accessToken}`,
        (err, res, body) => {
          if(err){
            console.log(err);
            cb(null, {result:{error: err}});
            return;
          } else {
            let result = JSON.parse(body);
            console.log(result);
            if(result.error !== undefined){
              cb(null, {result: result.error, status: 190})
            } else {
              let { access_token, token_type, expires_in } = result;
              user.access_token = access_token;
              user.token_type = token_type;
              user.expires_in = expires_in;
              user.token_expire_date = new Date().getTime() + expires_in ;
              singUpUser(user);
            }
          }
        });

      const singUpUser = (newUser) => {
        let userData = {
          lastLogIn: new Date().getTime(),
          logInStatus: true,
          name: newUser.name,
          email: newUser.email || `${newUser.id}@noemail.com`,
          password: newUser.id
        }

        User.create(userData, (err, createdUser)=>{
          if(err){
            console.log(err)
          };
          if(model.id !== undefined){
            let identityInfo = {
              id: newUser.id,
              userId: createdUser.id,
              provider: 'facebook',
              name: newUser.name,
              email: newUser.email || `${newUser.id}@noemail.com`,
              photo: newUser.photo,
              accesstoken: newUser.access_token
            }
            // let UserIdentity = app.models.UserIdentity;
            let Role = app.models.Role;
            let Rolemap = app.models.Rolemap;
            createdUser.userIdentitys.create(identityInfo, (err, identity)=>{
              if(err){
                console.log(err);
              } else {
                Role.findOne({ where: { name : 'user' }},(err,data) => {
                  let thisRoleId = data.id;
                  Rolemap.create({ principalType: 'USER' , principalId: createdUser.id, roleId: thisRoleId });
                });
                let loginCred = { ttl : newUser.expires_in , email : userData.email , password : userData.password };
                User.login(loginCred, (err,token)=>{
                  if(err){
                    cb(err);
                  } else {
                    cb(null, {Lbtoken: token, Fbtoken: newUser.access_token, ttl: newUser.expires_in})
                  }
                })
              }
            });
          }
        })
      }

      const loginUser = () => {

      }
      // request(`http://graph.facebook.com/debug_token?input_token=${}&access_token=${}`, (err, res, body) => {
      //   if(err){
      //     console.log(err);
      //     cb(null, {result:{error: err}});
      //     return;
      //   } else {
      //     console.log(res);
      //   }
      // });
    }
  };

  User.remoteMethod(
    'auth',
    {
      accepts: {arg: 'userInfo', type: 'object', http: {source: 'body'}},
      returns: {arg: 'result', type: 'object', http:{target: 'status'}}
    }
  );

};
