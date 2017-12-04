var should = require('chai').should();
var supertest = require('supertest');
var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'GUejDdQfjJmimoEZDEGLlsPUoPnE4w2kGgfXFF19OaWsQdg3VSGfJnyRx9YVoSav';
var lbUserId = '5a227943ab2904015a7ce29b';

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
          userId: lbUserId
        },
        fields: ['balance']
      }
      //if(global.machineInfo.status === 'open'){
        console.log('Machine open check user balance')
        api
          .get(generateJSONAPI(url, filterObj))
          .set('Accept', 'application/json')
          .end(function(err,res){
            console.log(res.body)
            global.userBalance = res.body.balance;
            res.body.should.be.an('object');
            res.status.should.equal(200);
            done();
          });
      // } else {
      //   console.log('Machine not open')
      //   done();
      // }
    });
  });

  describe('Check Product play rate', function(){
    it('should return product rate object', function(done){
      var api = supertest.agent(baseUrl);
      let filter = {
        fields: ['gamePlayRate']
      }
      if(global.machineInfo.status === 'open'){
        console.log('Machine open check product amt')
        api
          .get(generateJSONAPI(`/api/products/${global.machineInfo.productId}?access_token=${accessToken}`, filter))
          .set('Accept', 'application/json')
          .end(function(err,res){
            global.requiredAmt = res.body.gamePlayRate;
            res.body.should.be.an('object');
            res.status.should.equal(200);
            global.canPlay =  global.userBalance >= global.requiredAmt ;
            done();
          });
      } else {
        console.log('Machine not open')
        done();
      }
    });
  });

  describe('Make reservation to the selected machine', function(){
    it('should return reservation object', function(done){
      var api = supertest.agent(baseUrl);
      let machineId = '596569d2-3659-4c59-a9cd-e8a25c9925e3';
      let reserveObj = {
        status: 'open',
        machineId: machineId
      };
      let findUrl = `/api/reservations/findOne?access_token=${accessToken}`;
      let filterObj = {
        where: {
          userId: lbUserId
        }
      };

      if(global.machineInfo.status !== 'open'){
        console.log('machine is playing, make a reserve')
        api
          .get(generateJSONAPI(findUrl, filterObj))
          .set('Accept', 'application/json')
          .end(function(err,res){
            global.reservationId = res.body.id;
            console.log(global.reservationId);
            res.body.should.be.an('object');
            res.status.should.equal(200);

            let url = `/api/reservations/${global.reservationId}?access_token=${accessToken}`;
            console.log(url);
            api
              .patch(url)
              .send(reserveObj)
              .set('Accept', 'application/json')
              .end(function(err,res){
                res.body.should.be.an('object');
                res.status.should.equal(200);
                done();
              });
          });
      } else {
        console.log('can start game play');
        done();
      }
    });
  });

  describe('Start a game play', function(){
    it('should return result object', function(done){
      var api = supertest.agent(baseUrl);
      let machineId = '596569d2-3659-4c59-a9cd-e8a25c9925e3';
      let url = `/api/machines/${machineId}/gameplay?access_token=${accessToken}`
      let data = {
        productId: global.machineInfo.productId,
        userId: lbUserId
      }
      if(global.canPlay){
        console.log('enough coins, game play start');
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
      } else {
        console.log('Not enough coin / machine not open, pls purchase')
        done();
      }
    });
  });


  // describe('end an engagement, check reservation', function(){
  //   it('should return next reservation object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     let machineId = '596569d2-3659-4c59-a9cd-e8a25c9925e3';
  //     let url = `/api/reservations/${machineId}/endEngage?access_token=${accessToken}`;
  //     api
  //       .get(url)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log(res.body)
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

});