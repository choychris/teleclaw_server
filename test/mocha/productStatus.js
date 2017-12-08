var should = require('chai').should();
var supertest = require('supertest');
//var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'fzynTh6ygRiF4htEOvEJjiHUHAq9tHmmLbE9zLW1MSqbNFvTk1PcFDuYIYnb9CD2';
var LBuserid = '5a2909f81deecd06749f63cc';

describe('Attach change products to different status', function(){
  describe('find all products', function(){
    it('should return all data', function(done){
      var api = supertest.agent(baseUrl);
      var model = 'products'
      api
        .get(`/api/${model}`)
        .set('Accept', 'application/json')
        .end(function(err,res){
            res.body.should.be.an('array');
            res.status.should.equal(200);
            global.Products = res.body;
         done();
        });
    });
  });

  describe('change a product status', function(){
    it('should return all status', function(done){
      var api = supertest.agent(baseUrl);
      var model = 'products'
      const statusChange = (machine, maintain, visible) =>{
        let status = {
          machineStatus: machine,
          maintainStatus: maintain,
          visible: visible
        }
        return status;
      }
      let statusList = [statusChange(false, true, true), statusChange(true, false, true), statusChange(true, true, false)]
      let changeCount = 0;
      let runCount = 0
      global.Products.map(proudct=>{
        let statusBody = statusList[changeCount];
        changeCount++
        api
          .patch(`/api/${model}/${proudct.id}`)
          .set('Accept', 'application/json')
          .send({status: statusBody})
          .end(function(err,res){
              runCount++
              res.body.should.be.an('object');
              res.status.should.equal(200);
              console.log(res.body.status)
              if(runCount === 3){
                done();
              }
          });
      });  
    });
  });
});