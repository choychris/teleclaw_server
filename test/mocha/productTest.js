var should = require('chai').should();
var supertest = require('supertest');
var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'psxBNQl8qvDw2lcxcTLR3ftzYCuF1OTsVtQokeJP6zlNwuiLCDbnAcx35jtBzTnQ';
var LBuserid = '5a227943ab2904015a7ce29b';

// var api = supertest.agent('localhost:3000');
const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Attach a related models to product', function(){

  // describe('Create benchmark', function(){
  //   it('should return benchmark object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var benchmarkBody = {
  //       costRange: {
  //         min: 0,
  //         max: 10
  //       }, 
  //       marginRate: 0,
  //       gamePlayRate: 0.0001,
  //       realValuePerCoin: 0.13
  //     };

  //     api
  //       .post('/api/benchmarks')
  //       .send(benchmarkBody)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // describe('Create Product', function(){
  //   it('should return Product object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var productBody = {
  //       name: {
  //         'en': 'TSUM TSUM'
  //       },
  //       description: "From Disney",
  //       size: {
  //         width: 5,
  //         height: 5,
  //         unit: 'cm'
  //       },
  //       weight: {
  //         unit: 'g',
  //         weight: 20
  //       },
  //       sku: 20,
  //       cost: {
  //         currency: 'HKD',
  //         value: 20
  //       },
  //       status: {
  //         stockStatus: true,
  //         machineStatus: true
  //       }
  //     };

  //     api
  //       .post('/api/products')
  //       .send(productBody)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         // console.log(res.body);
  //         global.Product = res.body;
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // describe('Find A Product', function(){
  //   it('should return Product object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var productId = 'f7208d21-2b10-42cd-9487-9f44b3ac98ee';
  //     api
  //       .get('/api/products/' + productId)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         // console.log(res.body);
  //         global.Product = res.body;
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // describe('Select A benchmark', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var url = `/api/benchmarks/findOne?access_token=${accessToken}`
  //     var Info = {
  //       where: {
  //         'costRange.max': 10,
  //         marginRate: 0,
  //         gamePlayRate: 0.0001
  //       }
  //     };
  //     api
  //       .get(generateJSONAPI(url,Info))
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log(res.body);
  //         global.Benchmark = res.body;
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // describe('Add a benchmark to product', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var benchmarkId = global.Benchmark.id;
  //     global.Product.benchmarkId = benchmarkId;
  //     var productId = 'f7208d21-2b10-42cd-9487-9f44b3ac98ee';
  //     api
  //       .put('/api/products/' + productId)
  //       .send(global.Product)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log(res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  describe('Create two machines', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      var machines = [
        {
          name: 'dev_3'
        },
        {
          name: 'dev_4'
        }
      ]
      global.Machines = [];
      machines.map(machine => {
      api
        .post('/api/machines')
        .send(machine)
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body);
          global.Machines.push(res.body);
          res.body.should.be.an('object');
          res.status.should.equal(200);
        });
      });  
      done();
    });
  });

  // describe('Get a product', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     api
  //       .get('/api/products')
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         global.Products = res.body;
  //         res.body.should.be.an('array');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // describe('Add two machine to product', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var productId = global.Products[0].id;
  //     console.log(productId);
  //     var data = {machines: global.Machines}
  //     api
  //       .patch('/api/products/' + productId)
  //       .send(data)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         // console.log(res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // describe('Get the two related machines', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var productId = global.Products[0].id;
  //     api
  //       .get(`/api/products/${productId}?filter[include]=machines` )
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log(res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });
});