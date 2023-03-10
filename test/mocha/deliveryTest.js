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

global.accessToken = 'z7XVvlIbDhSZG649KU59bljIyv9xWAdTOBpVIK0ZHK2HlNOKIR3S5n5wJHCRzJVY';
global.lbUserId ='5b23939f29e05d00bd846546';

const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

// |================== Authenticate User API ==================|
// describe('Login / Create User first', function(){
//   it('login / create current user - status 200 and token', function(done){
//   var api = supertest.agent(baseUrl);
//   var userInfo = {
//     prvoider: 'facebook',
//     accessToken : 'EAACDHoPDoIMBAMDWVuWrysgH2d6MtLxdSuiZCxxJTNf9ZBEEFL3uPgDSWxoSHzRQv4G1eYzFc2p3XT6eZCQ1g7bLI8ZCFe2ZCmbqNtlnZAXpppcSWS525yXCMINzFaGLki5ZA3hJ0QVjp4519HjH5ghxAw2pXLSyqMKLEAsbrpHSQZDZD',
//     username : 'Lap Chi',
//     expiresIn: 5173511,
//     userId:  "10156122556431165",
//     picture: {
//       height: 100,
//       is_silhouette: false,
//       url: "https://scontent.xx.fbcdn.net/v/t1.0-1/p100x100/1916279_10154397272841165_6485132739615337980_n.jpg?oh=838585186d56fc60e4dcfa90aa9ee10e&oe=5A8E8B2F",
//       width: 100
//     }
//   }

//   api
//     .post(`/api/users/auth`)
//     .send(userInfo)
//     .set('Accept', 'application/json')
//     .end(function(err,res){
//         global.accessToken = res.body.result.lbToken.id;
//         global.lbUserId = res.body.result.lbToken.userId;
//         res.body.result.should.be.an('object');
//         res.status.should.equal(200);
//         done();
//      });
//   });
// });

// |================ GET Product List ================|
// describe('Find product list', function(){
//   it('should return list of product', function(done){
//     var api = supertest.agent(baseUrl);
//     global.productIds = [];
//     api
//       .get(`/api/products?access_token=${global.accessToken}`)
//       .set('Accept', 'application/json')
//       .end(function(err,res){
//         res.body.should.be.an('array');
//         res.status.should.equal(200);
//         res.body.map(product=>{
//           global.productIds.push({id: product.id})
//           if(global.productIds.length === 3){
//             done();
//           }
//         });
//       });
//   });
// });

// |================ GET Delivery Rate ================|
describe('Get delivery rate quote', function(){
  this.timeout(4000);
  it('should return the list of courier rate', function(done){
  global.productIds = [
    {
      id:'ae55c637-26a8-45f6-9fb0-fe716bcfe176',
      prizeId:'4ce11111-7c9d-4a3d-9caf-0f9f4fa45876',
    },
    {
      id: 'ae55c637-26a8-45f6-9fb0-fe716bcfe176',
      prizeId: 'b5d23df1-e2ef-4493-a289-820c2957f4fc',
    },
  ]
  var api = supertest.agent(baseUrl);
  var data = {
    products: global.productIds,
    countryCode: 'hk',
    postalCode: 10030
  }
  api
    .post(`/api/deliveries/getRate?access_token=${global.accessToken}`)
    .set('Accept', 'application/json')
    .send({data: data})
    .end(function(err,res){
      res.body.should.be.an('object');
      res.status.should.equal(200);
      console.log(res.body.result);
      global.selectedRate = res.body.result[0] || res.body.result;
      done()
    });
  });
})

describe('Submit a delivery', function(){
  it('should return the list of courier rate', function(done){
  var api = supertest.agent(baseUrl);
  var data = {
   address: {
    line1: "3B, Todex Building, San Po Kong",
    line2: "Kowloon",
    country: "Hong Kong",
    countryCode: "hk",
    city: "Hong Kong",
    postalCode: 0,
    state: null,
    name: "Chris",
    phone: +85212345678,
    email: 'teleclaw.live@gmail.com'
   },
   cost: global.selectedRate.coins_value,
   status: 'pending',
   userId: global.lbUserId,
   products: global.productIds,
   courier: global.selectedRate
  }
  api
    .post(`/api/deliveries/new?access_token=${global.accessToken}`)
    .set('Accept', 'application/json')
    .send({data: data})
    .end(function(err,res){
      console.log(res.body)
      res.body.should.be.an('object');
      res.status.should.equal(200);
      done()
    });
  });
})

describe('Get Prizes', function(){
  it('should return the list prizes', function(done){
  var api = supertest.agent(baseUrl);

  api
    .get(`/api/prizes/getPrize/${global.lbUserId}?access_token=${global.accessToken}`)
    .set('Accept', 'application/json')
    .end(function(err,res){
      console.log(res.body)
      res.body.should.be.an('array');
      res.status.should.equal(200);
      done()
    });
  });
})




