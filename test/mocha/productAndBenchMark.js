var should = require('chai').should();
var supertest = require('supertest');
var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';


// var api = supertest.agent('localhost:3000');

describe('Attach a benchmark to product', function(){

  describe('Create benchmark', function(){
    it('should return benchmark object', function(done){
      var api = supertest.agent(baseUrl);
      var benchmarkBody = {
        costRange: {
          min: 11,
          max: 20
        }, 
        marginRate: 9,
        gamePlayRate: 29,
        realValuePerCoin: 0.13
      };

      api
        .post('/api/benchmarks')
        .send(benchmarkBody)
        .set('Accept', 'application/json')
        .end(function(err,res){
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

  describe('Create Product', function(){
    it('should return Product object', function(done){
      var api = supertest.agent(baseUrl);
      var productBody = {
        name: "Tsum Tsum",
        description: "From Disney",
        size: {
          width: 5,
          height: 5,
          unit: 'cm'
        },
        weight: {
          unit: 'g',
          weight: 20
        },
        sku: 20,
        cost: {
          currency: 'HKD',
          value: 20
        },
        status: false,
        numOfPlay: 0,
        numOfSuccess: 0
      };

      api
        .post('/api/products')
        .send(productBody)
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body);
          global.Product = res.body;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

  describe('Select A benchmark', function(){
    it('Success - should return status 200', function(done){
      
      var api = supertest.agent(baseUrl);
      var Info = {
        costRange: {
          min: 11,
          max: 20
        },
        marginRate: 9
      };
      api
        .get('/api/benchmarks/findOne')
        .send(Info)
        .set('Accept', 'application/json')
        .end(function(err,res){
          global.Benchmark = res.body;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

  describe('Add a benchmark to product', function(){
    it('Success - should return status 200', function(done){
      
      var api = supertest.agent(baseUrl);
      var benchmarkId = global.Benchmark.id;
      global.Product.benchmarkId = benchmarkId;
      var productId = global.Product.id;
      api
        .put('/api/products/' + productId)
        .send(global.Product)
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body);
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });


});