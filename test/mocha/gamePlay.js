var should = require('chai').should();
var supertest = require('supertest');
var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'psxBNQl8qvDw2lcxcTLR3ftzYCuF1OTsVtQokeJP6zlNwuiLCDbnAcx35jtBzTnQ';
var LBuserid = '5a227943ab2904015a7ce29b';

// const generateAPI = (baseUrl, filter, include) => {
//   filter.map(fields=>{
//     baseUrl.concat(`&filter[fields][${fields}]=true`)
//   });
//   if(include){
//     baseUrl.concat(`&filter[include]=${include}`);
//     console.log('Final baseUrl : ', baseUrl);
//     return baseUrl;
//   } else {
//     console.log('Final baseUrl : ', baseUrl);
//     return baseUrl;
//   }
// };

const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Start a game play from scratch', function(){

  describe('Select a machine and get related info', function(){
    it('should return machine object', function(done){
      var api = supertest.agent(baseUrl);
      let machineId = '596569d2-3659-4c59-a9cd-e8a25c9925e3';
      let url = `/api/machines/${machineId}?access_token=${accessToken}`;
      let filter = {
        fields: ['currentUserId', 'status', 'productId', 'reservation']
      }
      api
        .get(generateJSONAPI(url, filter))
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body)
          global.machineInfo = res.body;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

  describe('Check user wallet balance', function(){
    it('should return wallet object', function(done){
      var api = supertest.agent(baseUrl);
      let url = `/api/wallets/findOne?access_token=${accessToken}`
      let filterObj = {
        where: {
          userId: LBuserid
        },
        fields: ['balance']
      }
      api
        .get(generateJSONAPI(url, filterObj))
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body)
          global.userBalance = res.body.balance;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

  describe('Check user Product play rate', function(){
    it('should return product rate object', function(done){
      var api = supertest.agent(baseUrl);
      let filter = {
        fields: ['gamePlayRate']
      }
      api
        .get(generateJSONAPI(`/api/products/${global.machineInfo.productId}?access_token=${accessToken}`, filter))
        .set('Accept', 'application/json')
        .end(function(err,res){
          global.requiredAmt = res.body.gamePlayRate;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          global.canPlay = ((global.machineInfo.status === 'open') && (global.userBalance >= global.requiredAmt));
          global.canPlay.should.be.true;
          done();
        });
    });
  });

  describe('Check user Product play rate', function(){
    it('should return product rate object and canPlay == true', function(done){
      var api = supertest.agent(baseUrl);
      let filter = {
        fields: ['gamePlayRate']
      }
      api
        .get(generateJSONAPI(`/api/products/${global.machineInfo.productId}?access_token=${accessToken}`, filter))
        .set('Accept', 'application/json')
        .end(function(err,res){
          global.requiredAmt = res.body.gamePlayRate;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          global.canPlay = ((global.machineInfo.status === 'open') && (global.userBalance >= global.requiredAmt));
          global.canPlay.should.be.true;
          done();
        });
    });
  });

  describe('Start a game play', function(){
    it('should return result object', function(done){
      var api = supertest.agent(baseUrl);
      let machineId = '596569d2-3659-4c59-a9cd-e8a25c9925e3';
      let url = `/api/machines/${machineId}/gameplay?access_token=${accessToken}`
      let data = {
        productId: global.machineInfo.productId,
        userId: LBuserid
      }

      api
        .post(url)
        .send({data: data})
        .set('Accept', 'application/json')
        .end(function(err,res){
          console.log(res.body);
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });




});