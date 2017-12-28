var chai = require('chai');
var chaiHttp = require('chai-http')
var supertest = require('supertest');
var { NODE_ENV } = process.env;
var baseUrl = 'http://localhost:3000';
var app;

if(NODE_ENV == 'staging' || NODE_ENV == 'production'){
 app = require('../../build/server.js')
}

chai.use(chaiHttp);
var should = chai.should();
var api = (NODE_ENV == 'staging' || NODE_ENV == 'production') ? chai.request(app) : supertest.agent(baseUrl) ;

const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Test a payment flow', function(){

  // |================== Authenticate User API ==================|
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

  // |================== Exchange Rate API ==================|
  // GET:: an exchange-rate
  describe('Get an exchange-rate from loopback', function(){
    it('Get success - status 200 and object', function(done){
      var api = supertest.agent(baseUrl);
      var url = `/api/exchangeRates/findOne?access_token=${global.accessToken}`
      var filter = {
        where: {
          coins: 60
        }
      }
      api
        .get(generateJSONAPI(url, filter))
        .set('Accept', 'application/json')
        .end(function(err,res){
            console.log(res.body);
            global.rateId = res.body.id;
            res.body.should.be.an('object');
            res.status.should.equal(200);
            done();
         });
    })
  })

  // |================== Transactions API ==================|
  // GET:: Client Token
  describe('Get ClientToken from BrainTree', function(){
    this.timeout(4000);
    it('create success - status 200 and token', function(done){
      var api = supertest.agent(baseUrl);

      api
        .get(`/api/transactions/${global.lbUserId}/clientToken?access_token=${global.accessToken}`)
        .set('Accept', 'application/json')
        .end(function(err,res){
            console.log(res.body);
            res.body.result.should.be.an('string');
            res.status.should.equal(200);
            done();
         });
    })
  })

  // POST:: Create Sale
  describe('Post a transaction to BrainTree', function(){
    this.timeout(4000);
    it('create success - status 200 and response', function(done){
      var api = supertest.agent(baseUrl);
      var data = {
        paymentNonce: 'fake-valid-visa-nonce',
        rateId: global.rateId
      }

      api
        .post(`/api/transactions/${global.lbUserId}/createSale?access_token=${global.accessToken}`)
        .set('Accept', 'application/json')
        .send({data: data})
        .end(function(err,res){
            console.log(res.body);
            res.body.should.be.an('object');
            res.status.should.equal(200);
            done();
         });
    })
  })


})