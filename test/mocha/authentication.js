var should = require('chai').should();
var supertest = require('supertest');
var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';

describe('expired facebook token', function(){
  it('status 190 and err message', function(done){
    var api = supertest.agent(baseUrl);
    var user = { 
        accessToken: "EAACDHoPDoIMBAPNZBQCRZApfnGMBGKuchGBedF46SpQ1ZAH5aVp691LIf3LvAi2VyDlVYbnX20adFRkjhCX9Md51Qm1XOqXmlGYjWxGCAiU45f00yZCGs4taKGvinTM1puIxfSZA1x3ogxZCjgBjL7j5ZB3KWRPNyPyyZByZAsseToQfCi373GQ0nov1E8786ZBtQTZAPHtJN0W9AZDZD",
        email: "choylapchichris@gmail.com",
        expiresIn: 5100,
        userID: "10156122556431165",
        pciture: {
          height: 100,
          is_silhouette: false,
          url: "https://scontent.xx.fbcdn.net/v/t1.0-1/p100x100/1916279_10154397272841165_6485132739615337980_n.jpg?oh=838585186d56fc60e4dcfa90aa9ee10e&oe=5A8E8B2F",
          width: 100
        }
      };

    api
      .post(`/api/users/auth`)
      .send(user)
      .set('Accept', 'application/json')
      .end(function(err,res){
          console.log(res);
          res.status.should.equal(190);
          done();
        });
    });
});