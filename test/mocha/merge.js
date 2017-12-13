var should = require('chai').should();

// before(function() {
//   server.start();
// });

// after(function(){
//   server.stop();  
// });

describe.only("Game flow", function() {
  describe("CREATE", function() {
    it('status 200', function(done){
      require("./productTest.js")
      done();
    });
  });

  describe("PLAY", function() {
    it('status 200', function(done){
      require("./machineStatus.js")
      done();
    });
  });
});



