var should = require('chai').should();
var supertest = require('supertest');
var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';

describe('find all data', function(){
  it('should return all data', function(done){
    var api = supertest.agent(baseUrl);
    var model = 'products'
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



