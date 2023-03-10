'use strict';

var should = require('chai').should();
var supertest = require('supertest')
var api = supertest.agent('localhost:3000');
var server = require('../../build/server.js') 

before(function() {
  console.log('server start')
	server.start();
});

after(function(){
  console.log('server stop')
	server.stop();	
});

describe('API root access Test', function() {
	it("should return status 200",function(done){
		api
			.get("/")
			.expect("Content-type",/json/)
			.expect(200)
			.end(function(err,res){
				res.status.should.equal(200);
				done();
			});			  
	});
});

