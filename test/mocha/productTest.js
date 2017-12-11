var should = require('chai').should();
var supertest = require('supertest');
//var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'fzynTh6ygRiF4htEOvEJjiHUHAq9tHmmLbE9zLW1MSqbNFvTk1PcFDuYIYnb9CD2';
var LBuserid = '5a2909f81deecd06749f63cc';

// var api = supertest.agent('localhost:3000');
const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Attach a related models to product', function(){

  //  describe('Create a benchmark', function(){
  //   it('should return benchmark object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var benchmarkBody = { 
  //       "costRange" : { "min" : 10, "max" : 20 }, 
  //       "overheadCost" : 1.5, 
  //       "marginRate" : 1.0001, 
  //       "gamePlayRate" : 0.01, 
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


  // describe('Create Products', function(){
  //   it('should return Product object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     function createProduct(name, cost){
  //       var productBody = {
  //         name: {
  //           'en': name
  //         },
  //         description: "From Disney",
  //         size: {
  //           width: 5,
  //           height: 5,
  //           unit: 'cm'
  //         },
  //         weight: {
  //           unit: 'g',
  //           weight: 20
  //         },
  //         sku: 20,
  //         cost: {
  //           currency: 'HKD',
  //           value: cost
  //         },
  //         status: {
  //           maintainStatus: true,
  //           machineStatus: true,
  //           visible: true
  //         }
  //       };
  //       return productBody;
  //     }
  //     global.Products = []
  //     var productList = [createProduct('Bear', 10), createProduct('Pokemon', 20), createProduct('Pikachiu', 20)]
  //     productList.map(product=>{
  //     api
  //       .post('/api/products')
  //       .send(product)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         // console.log(res.body);
  //         global.Products.push(res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         if(global.Products.length === 3){
  //           done();
  //         }
  //       });
  //     })
  //   });
  // });

  describe('Select A Product', function(){
    it('should return Product object', function(done){
      var api = supertest.agent(baseUrl);

      api
        .get('/api/products')
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body[0]);
          global.Product = res.body[0];
          res.body.should.be.an('array');
          res.status.should.equal(200);
          done();
        });
    });
  });

  // describe('Add a benchmark to product', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var benchmarkId = global.Benchmark.id;
  //     //global.Product.benchmarkId = benchmarkId;
  //     let addCount = 0 ;
  //     global.Products.map(product=>{
  //       let productId = product.id;
  //       product.benchmarkId = global.Benchmark.id;
  //       api
  //         .put('/api/products/' + productId)
  //         .send(product)
  //         .set('Accept', 'application/json')
  //         .end(function(err,res){
  //           //console.log('Added benchmark to product : ',res.body);
  //           addCount++
  //           res.body.should.be.an('object');
  //           res.status.should.equal(200);
  //           if(addCount == 3){
  //             done();
  //           }
  //         });
  //       })
  //   });
  // });

  // describe('Create three machines', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var machines = [
  //       {
  //         name: 'dev_1'
  //       },
  //       {
  //         name: 'dev_2'
  //       },
  //       {
  //         name: 'dev_3'
  //       }
  //     ]
  //     global.Machines = [];
  //     machines.map(machine => {
  //     api
  //       .post('/api/machines')
  //       .send(machine)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         // console.log(res.body);
  //         global.Machines.push(res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         if(global.Machines.length == 3){
  //           done();
  //         }
  //       });
  //     });  
  //   });
  // });

  describe('Select all machines and get related info', function(){
    it('should return machine array', function(done){
      var api = supertest.agent(baseUrl);
      //let machineId = 'f0348d84-a1ae-48c5-ab9a-bdd45cb54759';
      let url = `/api/machines?access_token=${accessToken}`;
      api
        .get(url)
        .set('Accept', 'application/json')
        .end(function(err,res){
          global.machineList = res.body;
          res.body.should.be.an('array');
          res.status.should.equal(200);
          done();
        });
    });
  });

  describe('Add machines to product', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      var productId = global.Product.id;
      let addCount = 0
      let runCount = 0
      // global.Machines.map(machine=>{
      //   let productId = global.Products[addCount].id
      //   addCount++
        api
          .patch('/api/products/' + productId)
          .send({machines: global.machineList})
          .set('Accept', 'application/json')
          .end(function(err,res){
            //console.log('Added a machine to product : ', res.body);
            // runCount++
            res.body.should.be.an('object');
            res.status.should.equal(200);
            // if(runCount === 3){
            //   done();
            // }
            done();
          });
      // });
    });
  });

  describe('Get the related machines from product', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      var productId = global.Product.id;
      api
        .get(`/api/products/${productId}?filter[include]=machines` )
        .set('Accept', 'application/json')
        .end(function(err,res){
          console.log('Get Product include machine : ', res.body);
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

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
  //       api
  //         .post('/api/tags')
  //         .send(tag)
  //         .set('Accept', 'application/json')
  //         .end(function(err,res){
  //           // console.log(res.body);
  //           global.tagArray.push(res.body);
  //           res.body.should.be.an('object');
  //           res.status.should.equal(200);
  //           if(global.tagArray.length == 2){
  //             done();
  //           }
  //         });
  //     });  
  //   });
  // });

  // describe('Add a tag to a product', function(){
  //   it('Success - should return status 200', function(done){
  //     var api = supertest.agent(baseUrl);
  //     //var productId = global.Product.id;
  //       let addNCount = 0
  //       global.Products.map(product=>{
  //         var productId = product.id;
  //         api
  //           .patch(`/api/products/${productId}`)
  //           .send({tagId: global.tagArray[0].id})
  //           .set('Accept', 'application/json')
  //           .end(function(err,res){
  //             console.log('product with tag : ',res.body.name.en, res.body.tagId);
  //             addNCount++
  //             res.body.should.be.an('object');
  //             res.status.should.equal(200);
  //             if(addNCount === 3){
  //               done();
  //             }
  //           });
  //       });
  //     });  
  //   });

});