var should = require('chai').should();
var supertest = require('supertest');
var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';

describe('Start a game play from scratch', function(){

  describe('Create machine', function(){
    it('should return benchmark object', function(done){
      var api = supertest.agent(baseUrl);
      var machine = {
        name: 'machine_1'
      };

      api
        .post('/api/machines')
        .send(machine)
        .set('Accept', 'application/json')
        .end(function(err,res){
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

});