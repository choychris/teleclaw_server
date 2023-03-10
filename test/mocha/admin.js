var { NODE_ENV } = process.env;
var should = require('chai').should();
var supertest = require('supertest');
var api = supertest.agent('http://localhost:3000');
//var api = supertest.agent('http://teleclawbackendapi-staging.ap-southeast-1.elasticbeanstalk.com:80');

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

const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Perform admin function', function(){

// |================== Authenticate User API ==================|
  describe('Login teleClawAdmin', function(){
    it('login - status 200 and token', function(done){

    var userInfo = {
      username: 'teleclaw.live@gmail.com',
      password : 'teleclawlive123',
    };
    api.post(`/api/users/login`)
      .send(userInfo)
      .set('Accept', 'application/json')
      .end(function(err,res){
          global.accessToken = res.body.id;
          global.lbUserId = res.body.userId;
          console.log(res.status);
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
       });
    });
  });

  describe('Set reservation to open', function(){
    it('sucees - status 200', function(done){
    var data = {
      "id": "76b58534-ecb4-4ec6-9bef-695ebb7ed045",
      "created": "2017-12-21T08:34:19.961Z",
      "lastUpdated": "2017-12-22T05:00:30.306Z",
      "status": "open",
      "userId": "5a378cfe3d4405006a68798a",
      "machineId": "12a932b7-94b9-4dc6-afb0-0611be838ff9" ,
      "productId":"c1f5862f-c1ce-42ae-ae9d-bf1720489bb4"
    }
    api.put(`/api/users/${global.lbUserId}/reservation?access_token=${global.accessToken}`)
      .send(data)
      .set('Accept', 'application/json')
      .end(function(err,res){
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
       });
    })
  })

  // |================ GET Machine ================|
  // describe('Find product list', function(){
  //   it('shoule return list of product', function(done){
  //     api
  //       .get(`/api/products?access_token=${global.accessToken}`)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //           res.body.should.be.an('array');
  //           res.status.should.equal(200);
  //           global.Product = res.body[2];
  //           console.log(global.Product.id)
  //           done();
  //       });
  //   });
  // });

  // describe('Find a product include machines', function(){
  //   it('should return first product and machine', function(done){
  //     var url = `/api/products/${global.Product.id}?access_token=${global.accessToken}`
  //     var filter = {
  //       include: "machines"
  //     }
  //     api
  //       .get(generateJSONAPI(url, filter))
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //           //console.log(res.body)
  //           res.body.should.be.an('object');
  //           res.status.should.equal(200);
  //           global.Machine = res.body.machines[0];
  //           console.log(global.Machine.id);
  //           done();
  //       });
  //   });
  // });

  describe('PATCH Machine status to close', function(){
    it('update success - status 200', function(done){
    var machineId = '12a932b7-94b9-4dc6-afb0-0611be838ff9' ;
    var data = {
      currentUser: null,
      status: 'close'
    }

    api
      .patch(`/api/machines/${machineId}?access_token=${global.accessToken}`)
      .send(data)
      .set('Accept', 'application/json')
      .end(function(err,res){
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
       });
    });
  });

  describe('PATCH Machine status to open', function(){
    it('update success - status 200', function(done){
    var machineId = '12a932b7-94b9-4dc6-afb0-0611be838ff9' ;
    var data = {
      status: 'open'
    }

    api
      .patch(`/api/machines/${machineId}?access_token=${global.accessToken}`)
      .send(data)
      .set('Accept', 'application/json')
      .end(function(err,res){
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
       });
    });
  });

  // describe('PATCH Product sku to 1', function(){
  //   it('update success - status 200', function(done){
  //   var productId = global.Product.id
  //   var data = {
  //     status:{
  //       maintainStatus: false,
  //       machineStatus: true,
  //       visible: true
  //     },
  //     sku: 1
  //   }

  //   api
  //     .patch(`/api/products/${productId}?access_token=${global.accessToken}`)
  //     .send(data)
  //     .set('Accept', 'application/json')
  //     .end(function(err,res){
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //      });
  //   });
  // });

  // |================== Exchange Rate API ==================|
  // POST:: an exchange-rate
  // describe('Create an exchange-rate from loopback', function(){
  //   it('Get success - status 200 and object', function(done){
  //     var url = `/api/exchangeRates?access_token=${global.accessToken}`
  //     var body = {
  //         "coins": 240,
  //         "bonus": 20,
  //         "currency": {
  //             "usd": 4,
  //             "hkd": 32
  //           },
  //         "status": true
  //     };
  //     api.post(url)
  //       .set('Accept', 'application/json')
  //       .send(body)
  //       .end(function(err,res){
  //           console.log(res.body);
  //           res.body.should.be.an('object');
  //           res.status.should.equal(200);
  //           done();
  //        });
  //   })
  // })

  // describe('Create an exchange-rate from loopback', function(){
  //   it('Get success - status 200 and object', function(done){
  //     var url = `/api/exchangeRates?access_token=${global.accessToken}`
  //     var body = {
  //         "coins": 60,
  //         "bonus": 0,
  //         "currency": {
  //             "usd": 1,
  //             "hkd": 8
  //           },
  //         "status": true
  //     };
  //     api.post(url)
  //       .set('Accept', 'application/json')
  //       .send(body)
  //       .end(function(err,res){
  //           console.log(res.body);
  //           res.body.should.be.an('object');
  //           res.status.should.equal(200);
  //           done();
  //        });
  //   })
  // })

});