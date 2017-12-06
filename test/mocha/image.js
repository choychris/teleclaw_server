var should = require('chai').should();
var supertest = require('supertest');
//var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'psxBNQl8qvDw2lcxcTLR3ftzYCuF1OTsVtQokeJP6zlNwuiLCDbnAcx35jtBzTnQ';
var LBuserid = '5a227943ab2904015a7ce29b';

// var api = supertest.agent('localhost:3000');
const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Upload images and update the related model', function(){

  describe('Select A Product', function(){
    it('should return Product object', function(done){
      var api = supertest.agent(baseUrl);
      api
        .get('/api/products')
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body[0]);
          global.Product = res.body[0];
          res.body.should.be.an('array');
          res.status.should.equal(200);
          done();
        });
    });
  });

  describe('Upload an image for a product', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      var productId = global.Product.id;
      var body = {
        name: global.Product.name.en,
        placement: 'one'
      }
      api
        .post(`/api/products/imageUpload`)
        .field('name', global.Product.name.en)
        .field('placement', 'one')
        .field('tag', 'product')
        .attach('tempImage', '/Users/ChrisChoy/Documents/TeleClaw/backend_loopback_api/test/sampleImage/tsumtsumbear.jpg')
        .end(function(err,res){
          global.productImageUrl = res.body.imageUrl;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
      }); 
    });

  describe('Update the product image url', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      var productId = global.Product.id;
      api
        .patch(`/api/products/${productId}`)
        .set('Accept', 'application/json')
        .send({images: {thumnail: global.productImageUrl}})
        .end(function(err,res){
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });  
    });
  }); 

  describe('Select a tag', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      api
        .get('/api/tags')
        .set('Accept', 'application/json')
        .end(function(err,res){
          // console.log(res.body);
          global.tag = (res.body[0]);
          res.body.should.be.an('array');
          res.status.should.equal(200);
          done();
        });  
    });
  });

  describe('Upload an image for a tag', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      api
        .post(`/api/products/imageUpload`)
        .field('name', global.tag.name.en)
        .field('placement', 'earth')
        .field('tag', 'tag')
        .attach('tempImage', '/Users/ChrisChoy/Documents/TeleClaw/backend_loopback_api/test/sampleImage/tsumtsumbear.jpg')
        .end(function(err,res){
          global.tagImageUrl = res.body.imageUrl;
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        }); 
    });
  });

  describe('Update the tag image url', function(){
    it('Success - should return status 200', function(done){
      var api = supertest.agent(baseUrl);
      var tagId = global.tag.id;
      api
        .patch(`/api/tags/${tagId}`)
        .set('Accept', 'application/json')
        .send({image: {url: global.tagImageUrl}})
        .end(function(err,res){
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
        });  
    });
  });

});