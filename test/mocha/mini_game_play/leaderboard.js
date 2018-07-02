const should = require('chai').should();
const supertest = require('supertest');
let moment = require('moment');

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

describe('Get leaderboard', () => {
  // ====== user get current period stats ======
  // describe('Get Current Stats', () => {
  //   it('Return Status list', (done) => {
  //     const api = supertest.agent(baseUrl);
  //     const userId = global.lbUserId;
  //     const gameId = 'A0001';
  //     const period = 'last';
  //     const accessToken = global.accessToken;


  //     api
  //       .get(`/api/tournaments/rank/${gameId}/${userId}/${period}?access_token=${accessToken}`)
  //       .end((err, res) => {
  //         console.log(res.body.response);
  //         res.body.response.should.be.an('array');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // ====== user get weekly best stats ======
  // describe('Get Weekly Stats', () => {
  //   it('Return Weekly Stats list', (done) => {
  //     const api = supertest.agent(baseUrl);
  //     const userId = global.lbUserId;
  //     const accessToken = global.accessToken;
  //     const gameId = 'A0001';

  //     api
  //       .get(`/api/tournaments/weekly/${gameId}?access_token=${accessToken}`)
  //       .end((err, res) => {
  //         console.log(res.body.response);
  //         res.body.response.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });
  
  // ====== user get last two day winner ======
  describe('Last two days winners', () => {
    it('win or not', (done) => {
      const api = supertest.agent(baseUrl);
      const userId = global.lbUserId;
      const accessToken = global.accessToken;
      const gameId = 'A0001';

      api
        .get(`/api/participants/bonus/${gameId}/${userId}?access_token=${accessToken}`)
        .end((err, res) => {
          console.log(res.body.response);
          res.body.response.should.be.a('boolean');
          res.status.should.equal(200);
          done();
        });
    });
  });
  // ==== get full rank stats ====
  // describe('Get Full Rank Stats', () => {
  //   it('Full list will limit 50', (done) => {
  //     const api = supertest.agent(baseUrl);
  //     const userId = global.lbUserId;
  //     const accessToken = global.accessToken;
  //     const gameId = 'A0001';
  //     const url = `/api/tournaments?access_token=${accessToken}`;
  //     const filter = {
  //       "where" : {
  //         "gameId": gameId
  //       },
  //       "order": 'created DESC',
  //       "limit": 1,
  //       "skip": 1,
  //       "include": {
  //         "relation": 'participants',
  //         "scope": {
  //           "order": [
  //             'highestScore DESC',
  //             'numberOfTrial DESC',
  //           ],
  //           "limit": 50,
  //           "fields": ["username", "highestScore", "numberOfTrial"]
  //         },
  //       }
  //     }

  //   api
  //     .get(generateJSONAPI(url, filter))
  //     .end((err, res) => {
  //       console.log(res.body[0].participants);
  //       res.body.should.be.an('array');
  //       res.status.should.equal(200);
  //       done();
  //     });
  //   })
  // })
});

