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

const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}


describe('Get all tags', function(){
  it('should return all tags', function(done){
    var api = supertest.agent(baseUrl);
    api
      .get(`/api/tags`)
      .set('Accept', 'application/json')
      .end(function(err,res){
        res.body.should.be.an('array');
        res.status.should.equal(200);

        console.log(res.body)
        global.tagId = res.body[0].id;
        done();
      })
  })
})

describe('Get products of a tag', function(){
  it('should return all tags', function(done){
    var api = supertest.agent(baseUrl);
    const filter = { 
      where : {
        'status.visible' : true
      }
    }
    api
      .get(generateJSONAPI(`/api/tags/${global.tagId}/products?access_token=undefined`, filter))
      .set('Accept', 'application/json')
      .end(function(err,res){
        res.body.should.be.an('array');
        res.status.should.equal(200);
        console.log(res.body)
        global.productId = res.body[0].id;
        done();
      })
  })
})

describe('Get a product by Id', function(){
  it('should return all tags', function(done){
    var api = supertest.agent(baseUrl);
    api
      .get(`/api/products/${global.productId}?access_token=undefined`)
      .set('Accept', 'application/json')
      .end(function(err,res){
        res.body.should.be.an('object');
        res.status.should.equal(200);
        console.log(res.body)
        done();
      })
  })
})

describe('Get machines include cameras of a product', function(){
  it('should return all tags', function(done){
    var api = supertest.agent(baseUrl);
    const filter = { 
      include : {
        relation : "cameras"
      } 
    }
    api
      .get(generateJSONAPI(`/api/products/${global.productId}/machines?access_token=undefined`, filter))
      .set('Accept', 'application/json')
      .end(function(err,res){
        res.body.should.be.an('array');
        res.status.should.equal(200);
        console.log(res.body)
        done();
      })
  })
})


// describe('Attach change products to different status', function(){
//   describe('find all products', function(){
//     it('should return all data', function(done){
//       var api = supertest.agent(baseUrl);
//       var model = 'products'
//       api
//         .get(`/api/${model}`)
//         .set('Accept', 'application/json')
//         .end(function(err,res){
//             res.body.should.be.an('array');
//             res.status.should.equal(200);
//             global.Products = res.body;
//          done();
//         });
//     });
//   });

  // describe('change a product status', function(){
  //   this.timeout(3000);
  //   it('should return all status', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var model = 'products'
  //     const statusChange = (machine, maintain, visible) =>{
  //       let status = {
  //         machineStatus: machine,
  //         maintainStatus: maintain,
  //         visible: visible
  //       }
  //       return status;
  //     }
  //     let statusList = [statusChange(false, true, true), statusChange(true, false, true), statusChange(true, true, false)]
  //     let changeCount = 0;
  //     let runCount = 0
  //     let timeOut = 500*runCount + 1000;
  //     global.Products.map(proudct=>{
  //       // setTimeout(change, timeOut);
  //       // function change(){
  //         let statusBody = statusList[changeCount];
  //         changeCount++
  //         api
  //           .patch(`/api/${model}/${proudct.id}`)
  //           .set('Accept', 'application/json')
  //           .send({status: statusBody})
  //           .end(function(err,res){
  //               runCount++
  //               res.body.should.be.an('object');
  //               res.status.should.equal(200);
  //               console.log(res.body.status)
  //               if(runCount === 3){
  //                 done();
  //               }
  //           });
  //       // }
  //     });  
  //   });
  // });

  // describe('change a product status', function(){
  //   this.timeout(3000);
  //   it('should return all status', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var model = 'products'
  //     let statusBody = {
  //       machineStatus: true,
  //       maintainStatus: false,
  //       visible: true
  //     }

  //     let runCount = 0;
  //     let timeOut = 500*runCount + 1000;
  //     global.Products.map(proudct=>{
  //       // setTimeout(change,timeOut);
  //       // function change(){
  //         api
  //           .patch(`/api/${model}/${proudct.id}`)
  //           .set('Accept', 'application/json')
  //           .send({status: statusBody})
  //           .end(function(err,res){
  //               runCount++
  //               res.body.should.be.an('object');
  //               res.status.should.equal(200);
  //               console.log(res.body.status)
  //               if(runCount === 3){
  //                 done();
  //               }
  //           });
  //        // }
  //     });  
  //   });
  // });
// });