'use strict';
import { updateTimeStamp, assignKey } from '../utils/beforeSave.js';
import { loggingModel } from '../utils/createLogging.js';
var request = require('request');

const FB_APP_SECRET = 'e1af1950c0642c405a28c1e706059b7c';


module.exports = function(User) {

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
            let { access_token, token_type, expires_in } = res.body;
            user.access_token = access_token;
            user.token_type = token_type;
            user.expires_in = expires_in;
            user.token_expire_date = new Date().getTime() + expires_in ;
            cb(null, {result:{status: 'success', accessToken: res.accessToken}})
          }
        });

      const singUpUser = (newUser) => {
        let userData = {
          lastLogIn: new Date().getTime(),
          logInStatus: true,
          name: newUser.name,
          email: newUser.email || `${newUser.id}@noemail.com`,
        }
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
      returns: {arg: 'result', type: 'object'}
    }
  );

};
