var should = require('chai').should();
var supertest = require('supertest');
var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';

describe('get facebook token', function(){
  // it('token expired - status 401 and err message', function(done){
  //   var api = supertest.agent(baseUrl);
  //   var user = { 
  //       accessToken: "EAACDHoPDoIMBAPNZBQCRZApfnGMBGKuchGBedF46SpQ1ZAH5aVp691LIf3LvAi2VyDlVYbnX20adFRkjhCX9Md51Qm1XOqXmlGYjWxGCAiU45f00yZCGs4taKGvinTM1puIxfSZA1x3ogxZCjgBjL7j5ZB3KWRPNyPyyZByZAsseToQfCi373GQ0nov1E8786ZBtQTZAPHtJN0W9AZDZD",
  //       email: "choylapchichris@gmail.com",
  //       expiresIn: 5100,
  //       userID: "10156122556431165",
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
  //     userID: "10156122556431165",
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


  it('login current user - status 200 and token', function(done){
    var api = supertest.agent(baseUrl);
    var userInfo = {
      accessToken : 'EAACDHoPDoIMBAMDWVuWrysgH2d6MtLxdSuiZCxxJTNf9ZBEEFL3uPgDSWxoSHzRQv4G1eYzFc2p3XT6eZCQ1g7bLI8ZCFe2ZCmbqNtlnZAXpppcSWS525yXCMINzFaGLki5ZA3hJ0QVjp4519HjH5ghxAw2pXLSyqMKLEAsbrpHSQZDZD',
      username : 'Lap Chi',
      expiresIn: 5173511,
      userID:  "10156122556431165"
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
});

// fbtoken : EAACDHoPDoIMBAMDWVuWrysgH2d6MtLxdSuiZCxxJTNf9ZBEEFL3uPgDSWxoSHzRQv4G1eYzFc2p3XT6eZCQ1g7bLI8ZCFe2ZCmbqNtlnZAXpppcSWS525yXCMINzFaGLki5ZA3hJ0QVjp4519HjH5ghxAw2pXLSyqMKLEAsbrpHSQZDZD
// lbToken : vrniAqKDpDZzDS33HH3SZXFfCDNhVXaEHQOlLPRR1BIgtGdf3TifYHgwArCemKdC
// ttl : 5173511
// LBuserid : 5a1e9fccd0dbe5049cb43630
// fbUserid : 10156122556431165
