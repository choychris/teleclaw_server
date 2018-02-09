var should = require('chai').should();
var supertest = require('supertest');
var { NODE_ENV } = process.env;
var baseUrl = 'http://localhost:3000';

if(NODE_ENV == 'staging' || NODE_ENV == 'production'){
  app = require('../../build/server.js')
  before(function() {
    console.log('server start')
    app.start();
  });

  after(function(){
    console.log('server stop')
    app.stop();  
  });
}

describe('Login / Create User first', function(){
  it('login / create current user - status 200 and token', function(done){
  var api = supertest.agent(baseUrl);
  var userInfo = {
    prvoider: 'facebook',
    accessToken : 'EAACDHoPDoIMBAMDWVuWrysgH2d6MtLxdSuiZCxxJTNf9ZBEEFL3uPgDSWxoSHzRQv4G1eYzFc2p3XT6eZCQ1g7bLI8ZCFe2ZCmbqNtlnZAXpppcSWS525yXCMINzFaGLki5ZA3hJ0QVjp4519HjH5ghxAw2pXLSyqMKLEAsbrpHSQZDZD',
    username : 'Lap Chi',
    expiresIn: 5173511,
    userId:  "10156122556431165",
    picture: {
      height: 100,
      is_silhouette: false,
      url: "https://scontent.xx.fbcdn.net/v/t1.0-1/p100x100/1916279_10154397272841165_6485132739615337980_n.jpg?oh=838585186d56fc60e4dcfa90aa9ee10e&oe=5A8E8B2F",
      width: 100
    }
  }

  api
    .post(`/api/users/auth`)
    .send(userInfo)
    .set('Accept', 'application/json')
    .end(function(err,res){
        global.accessToken = res.body.result.lbToken.id;
        global.lbUserId = res.body.result.lbToken.userId;
        res.body.result.should.be.an('object');
        res.status.should.equal(200);
        done();
     });
  });
});

describe('refund coins to users', function(){
  it('refund last play charges - status 200', function(done){
    var api = supertest.agent(baseUrl);
    api
      .get(`/api/plays/${global.lbUserId}/refund?access_token=${global.accessToken}`)
      .set('Accept', 'application/json')
      .end(function(err,res){
        console.log(res.body);
        res.body.should.be.an('object');
        res.status.should.equal(200);
        done();
      })
  })
})