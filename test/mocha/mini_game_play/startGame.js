const should = require('chai').should();
const supertest = require('supertest');

const { NODE_ENV } = process.env;
const baseUrl = 'http://localhost:3000';

if (NODE_ENV === 'staging' || NODE_ENV === 'production') {
  const app = require('../../../build/server.js');
  before(() => {
    console.log('server start');
    app.start();
  });

  after(() => {
    console.log('server stop');
    app.stop();
  });
}

const generateJSONAPI = (url, filter) => `${url}&filter=${JSON.stringify(filter)}`;

global.lbUserId = '5b23939f29e05d00bd846546';
global.accessToken = 'z7XVvlIbDhSZG649KU59bljIyv9xWAdTOBpVIK0ZHK2HlNOKIR3S5n5wJHCRzJVY';
// global.lbUserId = '5a378cfe3d4405006a68798a';
// global.accessToken = 'dVneP8e5uBQkieAC5FeHMyUW0A0bGebL0VNYkDamfDyqNUZrfaPcKm0qtSnD0c3T';

describe('Start to play a mini game', () => {
  // |================== Authenticate User API ==================|
  // if (process.env.NODE_ENV === 'staging') {
    // describe('Login User', () => {
    //   it('login / create current user - status 200 and token', (done) => {
    //     const api = supertest.agent(baseUrl);
    //     const userInfo = {
    //       prvoider: 'facebook',
    //       accessToken: 'EAACDHoPDoIMBABg0hzzbfEXlpWwp3rtMkQoBUPVpU4RdzddZBEShFWKX0PKZAjy6bMiZBbHLrANSO6jbbSN3mvssx9XWnKEMcNcfVCsJbJItuimhVpvPHWxhnxLLhrwjpt7Qz3TZA4iWjo8mH03RPCKlcrTxM8lgYCmDAxPikEd6BGxSSbpZB9Y5rjXr62VL2COPzUHjbEeIRUjqENRdS4kWPoXCpS0P8EjjzuhCKMwZDZD',
    //       username: 'Bob Albfghdfaafaa Baostein',
    //       expiresIn: 5173511,
    //       userId: '109998663236287',
    //       picture: {
    //         data: {
    //           height: 100,
    //           is_silhouette: false,
    //           url: 'https://scontent.xx.fbcdn.net/v/t1.0-1/p100x100/1916279_10154397272841165_6485132739615337980_n.jpg?oh=838585186d56fc60e4dcfa90aa9ee10e&oe=5A8E8B2F',
    //           width: 100,
    //         },
    //       },
    //     };

    //     api
    //       .post('/api/users/auth')
    //       .send(userInfo)
    //       .set('Accept', 'application/json')
    //       .end((err, res) => {
    //         console.log(res.body.result);
    //         global.accessToken = res.body.result.lbToken.id;
    //         global.lbUserId = res.body.result.lbToken.userId;
    //         res.body.result.should.be.an('object');
    //         res.status.should.equal(200);
    //         done();
    //       });
    //   });
    // });
  // }

  // ====== user press start game button ======
  describe('Start a game', () => {
    it('enough coins return trial id', (done) => {
      const api = supertest.agent(baseUrl);
      const userId = global.lbUserId;
      const accessToken = global.accessToken;
      const body = {
        userId,
        gameId: 'A0001',
        coins: 1,
      }

      api
        .post(`/api/trials/newGame?access_token=${accessToken}`)
        .send(body)
        .set('Accept', 'application/json')
        .end((err, res) => {
          console.log(res.body.response);
          global.trialId = res.body.response.trialId;
          res.body.response.should.be.an('object');
          res.status.should.equal(200);
          done();
        });
    });
  });

  // ===== after game play user submit score =====
  describe('update play score', function(){
    this.timeout(10000);
    it('should return trial object', function(done){
      setTimeout(()=>{
          var api = supertest.agent(baseUrl);
          let trialId = global.trialId;
          let url = `/api/trials/${trialId}?access_token=${global.accessToken}`;
          api
            .patch(url)
            .send({score: 80})
            .set('Accept', 'application/json')
            .end(function(err,res){
              console.log(res.body)
              res.body.should.be.an('object');
              res.status.should.equal(200);
              done();
            });
      }, 8000)
    });
  });
  // ====== user press continue/retry button ======
  // describe('Retry Game', () => {
  //   it('enough coins return true', (done) => {
  //     const api = supertest.agent(baseUrl);
  //     const userId = global.lbUserId;
  //     const accessToken = global.accessToken;

  //     api
  //       .get(`/api/trials/${userId}/${1}/retry?access_token=${accessToken}`)
  //       .set('Accept', 'application/json')
  //       .end((err, res) => {
  //         res.body.response.should.be.true;
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // ====== create new tournament ======
  // describe('corn job creating new tournament', () => {
  //   it('update old and create new and distribute prize', (done) => {
  //     const api = supertest.agent(baseUrl);
  //     // admin access token:
  //     const accessToken = 'zmMaTGFwtS78TwBFQMAfphAF6ZJylcbQWqv1qFtlko0ChHZS1BodLj8rSAunu7it';

  //     api
  //       .get(`/api/tournaments/toNextPeriod/A0001?access_token=${accessToken}`)
  //       .set('Accept', 'application/json')
  //       .end((err, res) => {
  //         console.log(res.body.response);
  //         res.body.response.should.be.a('string');
  //         res.status.should.equal(200);
  //         done();
  //       })
  //   })
  // })

});
