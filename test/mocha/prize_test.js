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

describe('operation of ticket', () => {
  // describe('get a prize with ticket', () => {
  //   it('enough ticket success', (done) => {
  //     const api = supertest.agent(baseUrl);
  //     const userId = global.lbUserId;
  //     const accessToken = global.accessToken;
  //     const body = {
  //       userId,
  //       productId: "87cd16ed-04fa-48ce-825b-29ecd7bb0426",
  //     }

  //     api
  //       .post(`/api/prizes/exchange?access_token=${accessToken}`)
  //       .send(body)
  //       .set('Accept', 'application/json')
  //       .end((err, res) => {
  //         console.log(res.body.res)
  //         res.body.res.msg.should.be.equal('success')
  //         done();
  //       })
  //   })
  // })

  // describe('get a prize with ticket', () => {
  //   it('insufficient ticket fail', (done) => {
  //     const api = supertest.agent(baseUrl);
  //     const userId = global.lbUserId;
  //     const accessToken = global.accessToken;
  //     const body = {
  //       userId,
  //       productId: "932fd551-ce1c-4fcd-8d99-cf75182b2845",
  //     }

  //     api
  //       .post(`/api/prizes/exchange?access_token=${accessToken}`)
  //       .send(body)
  //       .set('Accept', 'application/json')
  //       .end((err, res) => {
  //         console.log(res.body.res)
  //         res.body.res.msg.should.be.equal('not_enough_ticket')
  //         done();
  //       })
  //   })
  // })

  describe('exchange a prize for ticket', () => {
    it('success ticket exchange', (done) => {
      const api = supertest.agent(baseUrl);
      const userId = global.lbUserId;
      const accessToken = global.accessToken;
      const body = {
        userId,
        prizeId: "0750895f-3d68-497a-9bd3-91035d787b5d",
      }

      api
        .post(`/api/prizes/exchange?access_token=${accessToken}`)
        .send(body)
        .set('Accept', 'application/json')
        .end((err, res) => {
          console.log(res.body.res)
          res.body.res.ticket.should.be.a('number')
          done();
        })
    })
  })
})