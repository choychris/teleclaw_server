var should = require('chai').should();
var supertest = require('supertest');
var baseUrl = 'http://localhost:3000';

// if(process.env.NODE_ENV === 'staging'){
//   var server = require('../../build/server.js');

//   before(function() {
//     console.log('server start');
//     server.start();
//   });

//   after(function(){
//     console.log('server stop');
//     server.stop();  
//   });
// }

describe.only("Status Change integation", function() {
  describe("change sku to 1", function() {
    it('status 200', function(done){
      require("./admin.js")
      done();
    });
  });

  describe("PLAY and WIN", function() {
    it('status 200', function(done){
      require("./transac_test.js")
      done();
    });
  });

  // describe("change sku to 1", function() {
  //   it('status 200', function(done){
  //     require("./productTest.js")
  //     done();
  //   });
  // });
});



