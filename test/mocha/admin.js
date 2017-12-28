var should = require('chai').should();
var supertest = require('supertest');

var baseUrl = 'http://localhost:3000';
const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Perform admin function', function(){

// |================== Authenticate User API ==================|
  describe('Login teleClawAdmin', function(){
    it('login - status 200 and token', function(done){
    var api = supertest.agent(baseUrl);
    var userInfo = {
      username: 'teleclaw.live@gmail.com',
      password : 'teleclawlive123',
    }

    api
      .post(`/api/users/login`)
      .send(userInfo)
      .set('Accept', 'application/json')
      .end(function(err,res){
          global.accessToken = res.body.id;
          global.lbUserId = res.body.userId;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
       });
    });
  });

  // |================ GET Machine ================|
  // describe('Find product list', function(){
  //   it('shoule return list of product', function(done){
  //     var api = supertest.agent(baseUrl);
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
  //     var api = supertest.agent(baseUrl);
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
  //           //console.log(global.Machine);
  //           done();
  //       });
  //   });
  // });

  // describe('PATCH Machine sku to 1', function(){
  //   it('update success - status 200', function(done){
  //   var api = supertest.agent(baseUrl);
  //   var machineId = global.Machine.id
  //   var data = {
  //     sku: 1,
  //     status: 'open'
  //   }

  //   api
  //     .patch(`/api/machines/${machineId}?access_token=${global.accessToken}`)
  //     .send(data)
  //     .set('Accept', 'application/json')
  //     .end(function(err,res){
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //      });
  //   });
  // });

  // describe('PATCH Product sku to 1', function(){
  //   it('update success - status 200', function(done){
  //   var api = supertest.agent(baseUrl);
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
  describe('Create an exchange-rate from loopback', function(){
    it('Get success - status 200 and object', function(done){
      var api = supertest.agent(baseUrl);
      var url = `/api/exchangeRates?access_token=${global.accessToken}`
      var body = {
          "coins": 240,
          "bonus": 20,
          "currency": {
              "usd": 4,
              "hkd": 32
            },
          "status": true
      }
      api
        .post(url)
        .set('Accept', 'application/json')
        .send(body)
        .end(function(err,res){
            console.log(res.body);
            res.body.should.be.an('object');
            res.status.should.equal(200);
            done();
         });
    })
  })

  describe('Create an exchange-rate from loopback', function(){
    it('Get success - status 200 and object', function(done){
      var api = supertest.agent(baseUrl);
      var url = `/api/exchangeRates?access_token=${global.accessToken}`
      var body = {
          "coins": 60,
          "bonus": 0,
          "currency": {
              "usd": 1,
              "hkd": 8
            },
          "status": true
      }
      api
        .post(url)
        .set('Accept', 'application/json')
        .send(body)
        .end(function(err,res){
            console.log(res.body);
            res.body.should.be.an('object');
            res.status.should.equal(200);
            done();
         });
    })
  })


});