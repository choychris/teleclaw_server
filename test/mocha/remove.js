var should = require('chai').should();
var supertest = require('supertest');
var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'fzynTh6ygRiF4htEOvEJjiHUHAq9tHmmLbE9zLW1MSqbNFvTk1PcFDuYIYnb9CD2';
var LBuserid = '5a2909f81deecd06749f63cc';

describe('find all data', function(){
  it('should return all data', function(done){
    var api = supertest.agent(baseUrl);
    var model = 'users'
    api
      .get(`/api/${model}`)
      .set('Accept', 'application/json')
      .end(function(err,res){
          res.body.should.be.an('array');
          res.status.should.equal(200);
          var array = res.body;
          array.map((data, index) => {
            var id = data.id;
            api
              .delete(`/api/${model}/`+id)
              .end(function(err,res){
                res.status.should.equal(200);
              });
          });
       done();
      });
  });
});



