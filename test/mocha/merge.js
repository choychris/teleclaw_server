var should = require('chai').should();

describe.only("Status Change integation", function() {
  describe("Perform admin", function() {
    it('status 200', function(done){
      require("./admin.js")
      done();
    });
  });

  describe("Braintree", function() {
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



