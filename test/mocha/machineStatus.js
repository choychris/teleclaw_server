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

describe('Change a machine to different status', function(){

  // |================== Authenticate User API ==================|
  //if(process.env.NODE_ENV === 'staging'){
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
            console.log(res.body.result);
            global.lbUserId = res.body.result.lbToken.userId;
            res.body.result.should.be.an('object');
            res.status.should.equal(200);
            done();
         });
      });
    });
  //}

  // |================ GET Machine ================|
  describe('Find product list', function(){
    it('shoule return list of product', function(done){
      var api = supertest.agent(baseUrl);
      api
        .get(`/api/products?access_token=${global.accessToken}`)
        .set('Accept', 'application/json')
        .end(function(err,res){
            res.body.should.be.an('array');
            res.status.should.equal(200);
            global.Product = res.body[0];
            console.log(global.Product.id)
            done();
        });
    });
  });

  describe('Find a product include machines', function(){
    it('should return first product and machine', function(done){
      console.log(global.accessToken);
      var api = supertest.agent(baseUrl);
      var url = `/api/products/${global.Product.id}/machines/?access_token=${global.accessToken}`
      var filter = {
        include: "cameras"
      }
      api
        .get(generateJSONAPI(url, filter))
        .set('Accept', 'application/json')
        .end(function(err,res){
            //console.log(res.body)
            res.body.should.be.an('array');
            res.status.should.equal(200);
            global.Machine = res.body[0];
            //console.log(global.Machine);
            done();
        });
    });
  });

  // |================ PATCH Machine API ================|
  // describe('Change the machine iotPlatform info', function(){
  //     it('should return machine object', function(done){
  //       if(!global.Machine.iotPlatform){
  //       var api = supertest.agent(baseUrl);
  //       //let machineId = 'f0348d84-a1ae-48c5-ab9a-bdd45cb54759';
  //       let url = `/api/machines/${global.Machine.id}?access_token=${global.accessToken}`;
  //       let iotPlatform = {
  //         gizwits : {
  //           init: [35,30,2,2,2,4,4,4,12,0],
  //           deviceId : 'bnyXLPJWNpoumbKUYKA78V',
  //           deviceMAC : '6001941EBCFC',
  //           productKey : '0b20eeca92544b888db9ebcc70bee872',
  //           heartbeat_interval: 45
  //         }
  //       };
  //       api
  //         .patch(url)
  //         .set('Accept', 'application/json')
  //         .send({iotPlatform: iotPlatform})
  //         .end(function(err,res){
  //           console.log(res.body);
  //           res.body.should.be.an('object');
  //           res.status.should.equal(200);
  //           done();
  //         });
  //       }else{
  //         global.Machine.iotPlatform.should.be.an('object');
  //         done();
  //       }
  //     });
  // });

  // |================ Game play API ================|
  describe('Start a game play of machine', function(){
    it('should return game play object', function(done){
      var api = supertest.agent(baseUrl);
      let machineId = global.Machine.id;
      let url = `/api/machines/${machineId}/gamePlay?access_token=${global.accessToken}`
      let data = {
        productId: global.Product.id,
        userId: global.lbUserId
      }
      api
        .post(url)
        .set('Accept', 'application/json')
        .send({data: data})
        .end(function(err,res){
            console.log(res.body)
            global.result = res.body.result;
            console.log(res.body.result.gizwits)
            res.body.should.be.an('object');
            res.status.should.equal(200);
            done();
        });
    });
  });

  // |================ Reservation API ================|
  // describe('Make reservation when machine is playing', function(){
  //   it('should return reservation_made object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     let machineId = global.Machine.id;
  //     let secondUser = '5a378cfe3d4405006a68798a';
  //     let url = `/api/machines/${machineId}/gamePlay?access_token=${global.accessToken}`
  //     let data = {
  //       productId: global.Product.id,
  //       userId: secondUser
  //     }
  //     api
  //       .post(url)
  //       .set('Accept', 'application/json')
  //       .send({data: data})
  //       .end(function(err,res){
  //         console.log(res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  //GET:: reservation
  // describe('Get a users reservation', function(){
  //   it('should return reservation object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     let secondUser = '5a378cfe3d4405006a68798a';
  //     let findUrl = `/api/reservations/findOne?access_token=${accessToken}`;
  //     let filterObj = {
  //       where: {
  //         userId: secondUser
  //       }
  //     };
  //     api
  //       .get(generateJSONAPI(findUrl, filterObj))
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log(res.body);
  //         global.reservationId = res.body.id;
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  //PATCH:: reservation
  // describe('cancel a reservation', function(){
  //   it('should return next reservation object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     let reservationId = global.result.reservation.id;
  //     let url = `/api/reservations/${reservationId}?access_token=${global.accessToken}`;
  //     let reserveObj = {
  //       status: 'cancel'
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

  // |================ Play End API ================|
  
    describe('update play end', function(){
      this.timeout(20000);
      it('should return play object', function(done){
        setTimeout(()=>{
          if(global.result.userId !== undefined){
            var api = supertest.agent(baseUrl);
            let playId = global.result.playId;
            let url = `/api/plays/${playId}?access_token=${global.accessToken}`;
            let ended = new Date().getTime();
            api
              .patch(url)
              .send({ended: ended, finalResult: false})
              .set('Accept', 'application/json')
              .end(function(err,res){
                console.log(res.body)
                res.body.should.be.an('object');
                res.status.should.equal(200);
                done();
              });
          }else{
            global.result.userId.should.not.be.a('string')
            done();
          }
        }, 15000)
      });
    });


  // |================ End Engagement API ================|
  describe('end an engagement, check reservation', function(){
    it('should return next reservation object', function(done){
      setTimeout(()=>{
        var api = supertest.agent(baseUrl);
        let machineId = global.Machine.id;
        let url = `/api/reservations/${machineId}/${global.lbUserId}/endEngage?access_token=${global.accessToken}`;
        api
          .get(url)
          .set('Accept', 'application/json')
          .end(function(err,res){
            console.log(res.body)
            res.body.should.be.an('object');
            res.status.should.equal(200);
            done();
          });
      }, 6500);
    });
  });



});