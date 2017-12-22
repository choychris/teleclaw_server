var should = require('chai').should();
var supertest = require('supertest');

var baseUrl = 'http://localhost:3000';
global.accessToken = 'fxMzzDFv5N4Iv1te7uLBJNORb19uJKDiV05AK0oaGWm0aQReRaXzNNQ6DL0Fboec';
global.lbUserId = '5a3b720bbf73350182f3d254';

const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Attach a related models to product', function(){

  // |================== Authenticate User API ==================|
  if(process.env.NODE_ENV === 'staging'){
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
  }


  // |================== Benchmark API ==================|

  // CREATE Benchmark ::
   describe('Create a benchmark', function(){
    it('should return benchmark object', function(done){
      var api = supertest.agent(baseUrl);
      var benchmarkBody = { 
        "costRange" : { "min" : 0, "max" : 10 }, 
        "overheadCost" : 1.5, 
        "marginRate" : 1.0001, 
        "gamePlayRate" : 1, 
        "realValuePerCoin" : 0.13 
      }
      api
        .post('/api/benchmarks')
        .send(benchmarkBody)
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body);
          global.Benchmark = res.body;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

  // GET Benchmark ::
  describe('Select A benchmark', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      var url = `/api/benchmarks/findOne?access_token=${accessToken}`
      var Info = {
        where: {
          'costRange.max': 10,
          marginRate: 1.0001,
          gamePlayRate: 1
        }
      };
      api
        .get(generateJSONAPI(url,Info))
        .set('Accept', 'application/json')
        .end(function(err,res){
          //console.log(res.body);
          global.Benchmark = res.body;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

  // |================== Product API ==================|

  // CREATE Product ::
  describe('Create Products', function(){
    it('should return Product object', function(done){
      var api = supertest.agent(baseUrl);
      function createProduct(name, cost){
        var productBody = {
          name: {
            'en': name
          },
          description: "From Disney",
          size: {
            width: 5,
            height: 5,
            unit: 'cm'
          },
          weight: {
            unit: 'g',
            value: 20
          },
          sku: 20,
          cost: {
            currency: 'HKD',
            value: cost
          },
          status: {
            stockStatus: true,
            machineStatus: true,
            visible: true
          }
        };
        return productBody;
      }
      global.Products = []
      var productList = [createProduct('Bear', 10), createProduct('Pokemon', 20), createProduct('Pikachiu', 20)]
      productList.map(product=>{
      api
        .post('/api/products')
        .send(product)
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body);
          global.Products.push(res.body);
          res.body.should.be.an('object');
          res.status.should.equal(200);
          if(global.Products.length === 3){
            done();
          }
        });
      })
    });
  });

  // PUT Prodct (benchmark) ::
  describe('Add a benchmark to product', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      var benchmarkId = global.Benchmark.id;
      //global.Product.benchmarkId = benchmarkId;
      let addCount = 0 ;
      global.Products.map(product=>{
        let productId = product.id;
        product.benchmarkId = global.Benchmark.id;
        api
          .put('/api/products/' + productId)
          .send(product)
          .set('Accept', 'application/json')
          .end(function(err,res){
            //console.log('Added benchmark to product : ',res.body);
            addCount++
            res.body.should.be.an('object');
            res.status.should.equal(200);
            if(addCount == 3){
              done();
            }
          });
        })
    });
  });

  // GET Product ::
  // describe('Select Product', function(){
  //   it('Success - should return Product Array | Object', function(done){
  //     var api = supertest.agent(baseUrl);

  //     api
  //       .get('/api/products')
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         // console.log(res.body[0]);
  //         global.Products = res.body;
  //         global.Product = res.body[0];
  //         res.body.should.be.an('array');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // GET Prodct (include machine) ::
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

  // |================== Machine API ==================|

  // POST Machine ::
  describe('Create two machines', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      var machines = [
        {
          name: 'dev_1'
        },
        {
          name: 'dev_2'
        },
        {
          name: 'dev_3'
        },
        {
          name: 'dev_4'
        },
        {
          name: 'dev_5'
        }
      ]
      let runCount = 0;
      machines.map(machine => {
      api
        .post('/api/machines')
        .send(machine)
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body);
          // global.Machines.push(res.body);
          res.body.should.be.an('object');
          res.status.should.equal(200);
          runCount++
          if(runCount == machines.length){
            done();
          }
        });
      });  
    });
  });

  // GET Machine ::
  describe('Get all Machines', function(){
    it('should return Machine object', function(done){
      var api = supertest.agent(baseUrl);
      api
        .get('/api/machines')
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body[0]);
          global.Machines = res.body;
          global.Machine = res.body[0];
          res.body.should.be.an('array');
          res.status.should.equal(200);
          done();
        });
    });
  });

  // Patch Product (Machine) ::
  describe('Add machines to product', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      //var productId = global.Product.id;
      let addCount = 0
      let runCount = 0
      global.Machines.map(machine=>{
        let productId = global.Products[addCount].id
        addCount++
        if(addCount > (global.Products.length - 1)){
          addCount = 0
        }
        api
          .patch('/api/products/' + productId)
          .send({machines: [machine]})
          .set('Accept', 'application/json')
          .end(function(err,res){
            //console.log('Added a machine to product : ', res.body);
            runCount++
            res.body.should.be.an('object');
            res.status.should.equal(200);
            if(runCount === global.Machines.length){
              done();
            }
            //done();
          });
      });
    });
  });

  // |================== TAG API ==================|

  // CREATE Tag ::
  describe('Create two tags', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      var tags = [
        {
          name: {
            'en': 'Earth'
          },
          description: 'Mother of Earth',
          status: true
        },
        {
          name: {
            'en': 'Moon'
          },
          status: true
        }
      ]
      global.tagArray = [];
      tags.map(tag => {
        api
          .post('/api/tags')
          .send(tag)
          .set('Accept', 'application/json')
          .end(function(err,res){
            // console.log(res.body);
            global.tagArray.push(res.body);
            res.body.should.be.an('object');
            res.status.should.equal(200);
            if(global.tagArray.length == 2){
              done();
            }
          });
      });  
    });
  });

  // PATCH Product (tag) ::
  describe('Add a tag to a product', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      //var productId = global.Product.id;
        let addNCount = 0
        global.Products.map(product=>{
          var productId = product.id;
          api
            .patch(`/api/products/${productId}`)
            .send({tagId: global.tagArray[0].id})
            .set('Accept', 'application/json')
            .end(function(err,res){
              console.log('product with tag : ',res.body.name.en, res.body.tagId);
              addNCount++
              res.body.should.be.an('object');
              res.status.should.equal(200);
              if(addNCount === 3){
                done();
              }
            });
        });
      });  
    });

});