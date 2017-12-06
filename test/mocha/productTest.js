var should = require('chai').should();
var supertest = require('supertest');
//var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'psxBNQl8qvDw2lcxcTLR3ftzYCuF1OTsVtQokeJP6zlNwuiLCDbnAcx35jtBzTnQ';
var LBuserid = '5a227943ab2904015a7ce29b';

// var api = supertest.agent('localhost:3000');
const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Attach a related models to product', function(){

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
  //         machineStatus: true,
  //         visible: true
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

  // // describe('Select A Product', function(){
  // //   it('should return Product object', function(done){
  // //     var api = supertest.agent(baseUrl);

  // //     api
  // //       .get('/api/products')
  // //       .set('Accept', 'application/json')
  // //       .end(function(err,res){
  // //         // console.log(res.body[0]);
  // //         global.Product = res.body[0];
  // //         res.body.should.be.an('array');
  // //         res.status.should.equal(200);
  // //         done();
  // //       });
  // //   });
  // // });

  // describe('Create a benchmark', function(){
  //   it('should return benchmark object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var benchmarkBody = { 
  //       "costRange" : { "min" : 0, "max" : 10 }, 
  //       "overheadCost" : 1.5, 
  //       "marginRate" : 1.001, 
  //       "gamePlayRate" : 0.0001, 
  //       "realValuePerCoin" : 0.13 
  //     }
  //     api
  //       .post('/api/benchmarks')
  //       .send(benchmarkBody)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         // console.log(res.body);
  //         global.Benchmark = res.body;
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
  //         //console.log(res.body);
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
  //     var productId = global.Product.id;
  //     api
  //       .put('/api/products/' + productId)
  //       .send(global.Product)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log('Added benchmark to product : ',res.body);
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
          if(global.Machines.length == 2){
            done();
          }
        });
      });  
    });
  });

  // describe('Add one machine to product', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var productId = global.Product.id;
  //     // console.log(productId);
  //     var data = {machines: [global.Machines[0]]}
  //     api
  //       .patch('/api/products/' + productId)
  //       .send(data)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         //console.log('Added a machine to product : ', res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // describe('Get the related machines from product', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var productId = global.Product.id;
  //     api
  //       .get(`/api/products/${productId}?filter[include]=machines` )
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log('Get Product include machine : ', res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // describe('Create two tags', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var tags = [
  //       {
  //         name: {
  //           'en': 'Earth'
  //         },
  //         description: 'Mother of Earth',
  //         status: true
  //       },
  //       {
  //         name: {
  //           'en': 'Moon'
  //         },
  //         status: true
  //       }
  //     ]
  //     global.tagArray = [];
  //     tags.map(tag => {
  //     api
  //       .post('/api/tags')
  //       .send(tag)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         // console.log(res.body);
  //         global.tagArray.push(res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         if(global.tagArray.length == 2){
  //           done();
  //         }
  //       });
  //     });  
  //   });
  // });

  // describe('Add a tag to a product', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var productId = global.Product.id;

  //     api
  //       .patch(`/api/products/${productId}`)
  //       .send({tagId: global.tagArray[0].id})
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log('product with tag : ',res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //     });  
  //   });

});