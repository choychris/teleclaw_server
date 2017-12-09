var should = require('chai').should();
var supertest = require('supertest');
//var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'fzynTh6ygRiF4htEOvEJjiHUHAq9tHmmLbE9zLW1MSqbNFvTk1PcFDuYIYnb9CD2';
var lbUserId = '5a2909f81deecd06749f63cc';

const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Change a machine to different status', function(){
  
  describe('find product list', function(){
    it('shoule return list of product', function(done){
      var api = supertest.agent(baseUrl);
      api
        .get(`/api/products`)
        .set('Accept', 'application/json')
        .end(function(err,res){
            res.body.should.be.an('array');
            res.status.should.equal(200);
            global.Product = res.body[0];
            done();
        });
    });
  });

  describe('find a product include machine', function(){
    it('should return first product and machine', function(done){
      var api = supertest.agent(baseUrl);
      var url = `/api/products/${global.Product.id}?access_token=${accessToken}`
      var filter = {
        include: "machines"
      }
      api
        .get(generateJSONAPI(url, filter))
        .set('Accept', 'application/json')
        .end(function(err,res){
            //console.log(res.body)
            res.body.should.be.an('object');
            res.status.should.equal(200);
            global.Machine = res.body.machines[0];
            done();
        });
    });
  });

  describe('start a game play of machine', function(){
    it('should return game play object', function(done){
      var api = supertest.agent(baseUrl);
      let machineId = global.Machine.id;
      let url = `/api/machines/${machineId}/gameplay?access_token=${accessToken}`
      let data = {
        productId: global.Product.id,
        userId: lbUserId
      }
      api
        .post(url)
        .set('Accept', 'application/json')
        .send({data: data})
        .end(function(err,res){
            console.log(res.body)
            res.body.should.be.an('object');
            res.status.should.equal(200);
            done();
        });
    });
  });

  describe('Try to Make reservation to the selected machine', function(){
    it('should return reservation object', function(done){
      var api = supertest.agent(baseUrl);
      let machineId = global.Machine.id;
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

      api
        .get(generateJSONAPI(findUrl, filterObj))
        .set('Accept', 'application/json')
        .end(function(err,res){
          global.reservationId = res.body.id;
          res.body.should.be.an('object');
          res.status.should.equal(200);

          let url = `/api/reservations/${global.reservationId}?access_token=${accessToken}`;
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

    });
  });

  // describe('cancel a reservation', function(){
  //   it('should return next reservation object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     let reservationId = global.reservationId;
  //     let machineId = global.Machine.id;
  //     let url = `/api/reservations/${reservationId}?access_token=${accessToken}`;
  //     let reserveObj = {
  //       status: 'canceled',
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

  describe('end an engagement, check reservation', function(){
    it('should return next reservation object', function(done){
      var api = supertest.agent(baseUrl);
      let machineId = global.Machine.id;
      let url = `/api/reservations/${machineId}/endEngage?access_token=${accessToken}`;
      api
        .get(url)
        .set('Accept', 'application/json')
        .end(function(err,res){
          console.log(res.body)
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

});