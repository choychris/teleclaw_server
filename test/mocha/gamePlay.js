var should = require('chai').should();
var supertest = require('supertest');
//var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'fzynTh6ygRiF4htEOvEJjiHUHAq9tHmmLbE9zLW1MSqbNFvTk1PcFDuYIYnb9CD2';
var lbUserId = '5a2909f81deecd06749f63cc';
var machineId = 'eff8387c-ea13-4fe4-b0a0-c111c40b70bc';

// before(function() {
//   server.start();
// });

// after(function(){
//   server.stop();  
// });

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
      //let machineId = 'f0348d84-a1ae-48c5-ab9a-bdd45cb54759';
      let url = `/api/machines/${machineId}?access_token=${accessToken}`;
      let filter = {
        fields: ['currentUser', 'status', 'productId', 'reservation']
      }
      api
        .get(generateJSONAPI(url, filter))
        .set('Accept', 'application/json')
        .end(function(err,res){
          console.log(res.body)
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
      if(global.machineInfo.status === 'open'){
        console.log('- Machine open, now check user balance')
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
      } else {
        console.log('- Machine not open, Skip to reservation')
        done();
      }
    });
  }); 

  describe('Check Product play rate', function(){
    it('should return product rate object', function(done){
      var api = supertest.agent(baseUrl);
      let filter = {
        fields: ['gamePlayRate']
      }
      if(global.machineInfo.status === 'open'){
        console.log(' - Machine open, now check product coins')
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
        console.log('- Machine not open, Skip to reservation')
        done();
      }
    });
  });

  describe('Try to Make reservation to the selected machine', function(){
    it('should return reservation object', function(done){
      var api = supertest.agent(baseUrl);
      //let machineId = 'f0348d84-a1ae-48c5-ab9a-bdd45cb54759';
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
        console.log('- Machine is playing, now make a reservation')
        api
          .get(generateJSONAPI(findUrl, filterObj))
          .set('Accept', 'application/json')
          .end(function(err,res){
            global.reservationId = res.body.id;
            console.log(global.reservationId);
            res.body.should.be.an('object');
            res.status.should.equal(200);

            let url = `/api/reservations/${global.reservationId}?access_token=${accessToken}`;
            //console.log(url);
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
        console.log('- Machine is open, no reservation required');
        done();
      }
    });
  });

  describe('Start a game play', function(){
    it('should return result object', function(done){
      var api = supertest.agent(baseUrl);
      //let machineId = 'f0348d84-a1ae-48c5-ab9a-bdd45cb54759';
      let url = `/api/machines/${machineId}/gameplay?access_token=${accessToken}`
      let data = {
        productId: global.machineInfo.productId,
        userId: lbUserId
      }
      if(global.canPlay){
        console.log('- enough coins, game play start');
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
        console.log('- Not enough coin / machine not open, game play no start')
        done();
      }
    });
  }); 


  // describe('end an engagement, check reservation', function(){
  //   it('should return next reservation object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     //let machineId = '4f076684-2b69-461f-9d55-e7adddb89693';
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

  // describe('cancel a reservation', function(){
  //   it('should return next reservation object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     let reservationId = '6d1e54c7-3167-4a49-84fd-6ab7e0d9321e';
  //     let machineId = 'f0348d84-a1ae-48c5-ab9a-bdd45cb54759';
  //     let url = `/api/reservations/${reservationId}?access_token=${accessToken}`;
  //     let reserveObj = {
  //       status: 'close',
  //       machineId: machineId
  //     };
  //     api
  //       .patch(url)
  //       .send(reserveObj)
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