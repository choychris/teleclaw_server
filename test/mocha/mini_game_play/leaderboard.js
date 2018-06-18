const should = require('chai').should();
const supertest = require('supertest');
let moment = require('moment');

const { NODE_ENV } = process.env;
const baseUrl = 'http://localhost:3000';

if (NODE_ENV === 'staging' || NODE_ENV === 'production') {
  const app = require('../../build/server.js');
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
  //     const period = 'current';
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
  describe('Get Weekly Stats', () => {
    it('Return Status list', (done) => {
      const api = supertest.agent(baseUrl);
      const userId = global.lbUserId;
      const accessToken = global.accessToken;
      const gameId = 'A0001';
      // const smallestDay = moment().startOf('week').valueOf();
      // const url = `/api/tournaments?access_token=${accessToken}`;
      // const filter = {
      //   "where" : {
      //     "gameId": gameId,
      //     "created": {
      //       "gt": smallestDay
      //     }
      //   },
      //   "include": {
      //     "relation": 'participants',
      //     "scope": {
      //       "order": [
      //         'highestScore DESC',
      //         'numberOfTrial DESC',
      //       ],
      //       "limit": 1,
      //       "fields": [
      //         'username',
      //         'highestScore'
      //       ]
      //     },
      //   }
      // }

      api
        .get(`/api/tournaments/weekly/${gameId}?access_token=${accessToken}`)
        .end((err, res) => {
          console.log(res.body.response);
          res.body.response.should.be.an('array');
          res.status.should.equal(200);
          done();
        });
    });
  });
});

