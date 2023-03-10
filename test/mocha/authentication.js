var should = require('chai').should();
var supertest = require('supertest');
//var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
// var accessToken = 'fzynTh6ygRiF4htEOvEJjiHUHAq9tHmmLbE9zLW1MSqbNFvTk1PcFDuYIYnb9CD2';
// var lbUserId = '5a2909f81deecd06749f63cc';

// before(function() {
//   server.start();
// });

// after(function(){
//   server.stop();  
// });

describe('get facebook token', function(){
  // it('token expired - status 401 and err message', function(done){
  //   var api = supertest.agent(baseUrl);
  //   var user = { 
  //       accessToken: "EAACDHoPDoIMBAPNZBQCRZApfnGMBGKuchGBedF46SpQ1ZAH5aVp691LIf3LvAi2VyDlVYbnX20adFRkjhCX9Md51Qm1XOqXmlGYjWxGCAiU45f00yZCGs4taKGvinTM1puIxfSZA1x3ogxZCjgBjL7j5ZB3KWRPNyPyyZByZAsseToQfCi373GQ0nov1E8786ZBtQTZAPHtJN0W9AZDZD",
  //       email: "choylapchichris@gmail.com",
  //       expiresIn: 5100,
  //       userId: "10156122556431165",
  //       pciture: {
  //         height: 100,
  //         is_silhouette: false,
  //         url: "https://scontent.xx.fbcdn.net/v/t1.0-1/p100x100/1916279_10154397272841165_6485132739615337980_n.jpg?oh=838585186d56fc60e4dcfa90aa9ee10e&oe=5A8E8B2F",
  //         width: 100
  //       }
  //     };

  //   api
  //     .post(`/api/users/auth`)
  //     .send(user)
  //     .set('Accept', 'application/json')
  //     .end(function(err,res){
  //       // console.log(res.body);
  //         res.body.error.status.should.equal(401);
  //         res.status.should.equal(401);
  //         done();
  //       });
  //   });

  // it('token exhanged - status 200 and user token', function(done){
  // var api = supertest.agent(baseUrl);
  // var user = { 
  //     accessToken: "EAACDHoPDoIMBALCC9m4IvCZBbXAOW9oGOsKJwbkDQ7cMypbZAPolrQKxh3FATCHZAJRI5TlMZCcK0dSpgrmo5dX8c3WJ4EF6KexOmaOKorQsDd2GSlIiQIopHA05pz6s0EfUjam7YRzMZBxXpG0kd2V9lJ6bj9MSgUGqkxKVSngmX6251Ku9mgepNVokXQiHZCk26KBjBe3gZDZD",
  //     email: "choylapchichris@gmail.com",
  //     expiresIn: 4995,
  //     userId: "10156122556431165",
  //     username: "Lap Chi",
  //     picture: {
  //       height: 100,
  //       is_silhouette: false,
  //       url: "https://scontent.xx.fbcdn.net/v/t1.0-1/p100x100/1916279_10154397272841165_6485132739615337980_n.jpg?oh=838585186d56fc60e4dcfa90aa9ee10e&oe=5A8E8B2F",
  //       width: 100
  //     }
  //   };

  // api
  //   .post(`/api/users/auth`)
  //   .send(user)
  //   .set('Accept', 'application/json')
  //   .end(function(err,res){
  //       console.log(res.body);
  //       res.body.result.should.be.an('object');
  //       res.status.should.equal(200);
  //       done();
  //     });
  // });

  // it('check token - status 200 and valid', function(done){
  // var api = supertest.agent(baseUrl);
  // var token = 'EAACDHoPDoIMBAMDWVuWrysgH2d6MtLxdSuiZCxxJTNf9ZBEEFL3uPgDSWxoSHzRQv4G1eYzFc2p3XT6eZCQ1g7bLI8ZCFe2ZCmbqNtlnZAXpppcSWS525yXCMINzFaGLki5ZA3hJ0QVjp4519HjH5ghxAw2pXLSyqMKLEAsbrpHSQZDZD'

  // api
  //   .post(`/api/users/checkTokenValid`)
  //   .send({token: 'EAACDHoPDoIMBAMDWVuWrysgH2d6MtLxdSuiZCxxJTNf9ZBEEFL3uPgDSWxoSHzRQv4G1eYzFc2p3XT6eZCQ1g7bLI8ZCFe2ZCmbqNtlnZAXpppcSWS525yXCMINzFaGLki5ZA3hJ0QVjp4519HjH5ghxAw2pXLSyqMKLEAsbrpHSQZDZD'})
  //   .set('Accept', 'application/json')
  //   .end(function(err,res){
  //       //console.log(res.body);
  //       res.body.result.should.equal('valid');
  //       res.status.should.equal(200);
  //       done();
  //     });
  // });


  it('login / create current user - status 200 and token', function(done){
    var api = supertest.agent(baseUrl);
    var userInfo = {
      prvoider: 'facebook',
      accessToken : 'EAACDHoPDoIMBALs5qj4nTudjcDtLzmqXgaJSRsnOZBNqaxW2qORAPCSkplYdv6TnQtSwrTB0sIiuQMxXQjs0IlUTJbPEZAWhz16esyKaF5VO1gEg0Ts46SMPe8Fzl5NbZBCdTRmYg77JvA5lfz4ZAYAb3XbOMhQZAKnBmZAbT6ZBm09BQPC9lzxTKCB7UrnsAMoCtCWlw6JYSrem9F0e06e87i1OIxOZBe62LDR3v7nZAOgZDZD',
      username : 'Will Albggacehbige Okelolaescu',
      expiresIn: 5173511,
      userId:  "102025230731263",
      picture: { 
        data: {
          height: 100,
          is_silhouette: false,
          url: null,
          width: 100
        } 
      }
    }

    api
      .post(`/api/users/auth`)
      .send(userInfo)
      .set('Accept', 'application/json')
      .end(function(err,res){
          console.log(res.body);
          res.body.result.should.be.an('object');
          res.status.should.equal(200);
          done();
       });
  });

  // it('get current user info - status 200 and token', function(done){
  //   var api = supertest.agent(baseUrl);
  //   api
  //     .get(`/api/users/${lbUserId}?access_token=${accessToken}`)
  //     .set('Accept', 'application/json')
  //     .end(function(err,res){
  //         console.log(res.body);
  //         res.body.result.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //      });
  // });
});

// |================ res.body =================|

// { result: 
//    { newUser: false,
//      lbToken: 
//       { id: 'nx3BZVnwzeCxfOb4s7Z2lDjdnVEiZSkmOFg4RM5AXe6PnDwN8bC8HXaG9oBI9eJz',
//         ttl: 5173511,
//         created: '2017-12-13T04:09:37.795Z',
//         userId: '5a2909f81deecd06749f63cc' },
//      fbToken: 'EAACDHoPDoIMBAMDWVuWrysgH2d6MtLxdSuiZCxxJTNf9ZBEEFL3uPgDSWxoSHzRQv4G1eYzFc2p3XT6eZCQ1g7bLI8ZCFe2ZCmbqNtlnZAXpppcSWS525yXCMINzFaGLki5ZA3hJ0QVjp4519HjH5ghxAw2pXLSyqMKLEAsbrpHSQZDZD',
//      ttl: 5173511 } }

// fbToken : EAACDHoPDoIMBAMDWVuWrysgH2d6MtLxdSuiZCxxJTNf9ZBEEFL3uPgDSWxoSHzRQv4G1eYzFc2p3XT6eZCQ1g7bLI8ZCFe2ZCmbqNtlnZAXpppcSWS525yXCMINzFaGLki5ZA3hJ0QVjp4519HjH5ghxAw2pXLSyqMKLEAsbrpHSQZDZD
// lbToken : 90ICrdst7erDtkl9BMojD1N2BqvyktQohdkIMQBs9OM6MGuy1EKqXEwVNhUDf502
// ttl : 5173511
// lbUserId : 5a263230b349380354db1913
// fbUserId : 10156122556431165
