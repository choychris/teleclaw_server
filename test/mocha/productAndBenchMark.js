var should = require('chai').should();
var supertest = require('supertest');
var server = (process.env.NODE_ENV === 'production') ? require('../../build/server.js') : require('../../server/server.js');

var baseUrl = 'localhost:3000';


// var api = supertest.agent('localhost:3000');

describe('Create benchmark', function(){
  it('Create Sucess - should return status 200', function(done){
    var url = baseUrl + '/api/benchmarks'
    var api = supertest.agent(url);
    var benchmarkBody = {
      costRange: {
        min: 1,
        max: 10
      }, 
      marginRate: 9,
      gamePlayRate: 19,
      realValuePerCoin: 0.13
    };

    api
      .post()
      .send(benchmarkBody)
      .set('Accept', 'application/json')
      .end(function(err,res){
        console.log(res.body);
        res.body.should.be.an('object');
        res.status.should.equal(200);
        done();
      });
  });
});