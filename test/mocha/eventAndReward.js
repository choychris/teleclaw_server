var should = require('chai').should();
var supertest = require('supertest');

var baseUrl = 'http://localhost:3000';

global.accessToken = 'ODAwHtfGXVbprY5vz7OgItbLtDmDH7tXZmKdoHrwxJlKEeTuDDQCYBI7IuwCDsnv';
global.lbUserId ='5a3b720bbf73350182f3d254';

const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

// |================== Authenticate User API ==================|
// describe('Login / Create User first', function(){
//   it('login / create current user - status 200 and token', function(done){
//   var api = supertest.agent(baseUrl);
//   var userInfo = {
//     prvoider: 'facebook',
//     accessToken : 'EAACDHoPDoIMBAMDWVuWrysgH2d6MtLxdSuiZCxxJTNf9ZBEEFL3uPgDSWxoSHzRQv4G1eYzFc2p3XT6eZCQ1g7bLI8ZCFe2ZCmbqNtlnZAXpppcSWS525yXCMINzFaGLki5ZA3hJ0QVjp4519HjH5ghxAw2pXLSyqMKLEAsbrpHSQZDZD',
//     username : 'Lap Chi',
//     expiresIn: 5173511,
//     userId:  "10156122556431165",
//     picture: {
//       height: 100,
//       is_silhouette: false,
//       url: "https://scontent.xx.fbcdn.net/v/t1.0-1/p100x100/1916279_10154397272841165_6485132739615337980_n.jpg?oh=838585186d56fc60e4dcfa90aa9ee10e&oe=5A8E8B2F",
//       width: 100
//     }
//   }

//   api
//     .post(`/api/users/auth`)
//     .send(userInfo)
//     .set('Accept', 'application/json')
//     .end(function(err,res){
//         global.accessToken = res.body.result.lbToken.id;
//         global.lbUserId = res.body.result.lbToken.userId;
//         res.body.result.should.be.an('object');
//         res.status.should.equal(200);
//         done();
//      });
//   });
// });

// describe('Login teleClawAdmin', function(){
//   it('login - status 200 and token', function(done){
//   var api = supertest.agent(baseUrl);
//   var userInfo = {
//     username: 'teleclaw.live@gmail.com',
//     password : 'teleclawlive123',
//   };
//   api.post(`/api/users/login`)
//     .send(userInfo)
//     .set('Accept', 'application/json')
//     .end(function(err,res){
//         global.adminToken = res.body.id;
//         res.body.should.be.an('object');
//         res.status.should.equal(200);
//         done();
//      });
//   });
// });

// |================== Clean Event and Peform Refer API ==================|
function testCases(description, endTime, maxNum, currentNum, code){
  console.log(description);
  // |================== Create Event API ==================|
  // describe('create promotion event', function(){
  //   it('create success - status 200 and token', function(done){
  //   var api = supertest.agent(baseUrl);
  //   var event = {
  //     "name": "promotion",
  //     "description": "promotional event",
  //     "launching": true,
  //     "startTime": new Date().getTime() - 200000,
  //     "endTime": endTime,
  //     "rewardAmount": 60,
  //     "maxNum": maxNum,
  //     "currentNum": currentNum,
  //     "type": "promotion"
  //   }
  //     api.post(`/api/events?access_token=${global.adminToken}`)
  //       .send(event)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         global.code = res.body.code;
  //         console.log(global.code);
  //         done();
  //     });
  //   });
  // });

  //|================== Peform Refer API ==================|
  describe('a user claim promtion reward', function(){
    it(description, function(done){
    console.log(global.code);
    var api = supertest.agent(baseUrl);
    var data = {
      "userId": global.lbUserId,
      "code": code,
    }
      api.post(`/api/rewards/refer?access_token=${global.accessToken}`)
        .send({data: data})
        .set('Accept', 'application/json')
        .end(function(err,res){
          console.log(res.body);
          res.body.should.be.an('object');
          res.status.should.equal(200);
          done();
      });
    });
  });
};

// describe('create user referral event', function(){
//   it('create success - status 200 and token', function(done){
//   var api = supertest.agent(baseUrl);
//   var event =   {
//       "name": "user referral",
//       "description": "get reward when refer a new user",
//       "type": "referral",
//       "launching": true,
//       "startTime": "2018-01-03T10:53:15.885Z",
//       "endTime": "2018-01-10T13:06:35.885Z",
//       "rewardAmount": 60,
//       "maxNum": 30
//     };
//     api.post(`/api/events?access_token=${global.adminToken}`)
//       .send(event)
//       .set('Accept', 'application/json')
//       .end(function(err,res){
//         res.body.should.be.an('object');
//         res.status.should.equal(200);
//         global.code = res.body.code;
//         console.log(global.code);
//         done();
//     });
//   });
// });

// describe('create checkIn event', function(){
//   it('create success - status 200 and token', function(done){
//   var api = supertest.agent(baseUrl);
//   var event =   {
//       "name": "user check in",
//       "description": "get reward when each time user check in",
//       "type": "checkIn",
//       "launching": true,
//       "startTime": "2018-01-03T10:53:15.885Z",
//       "endTime": "2018-05-10T13:06:35.885Z",
//       "rewardAmount": 20
//     };
//     api.post(`/api/events?access_token=${global.adminToken}`)
//       .send(event)
//       .set('Accept', 'application/json')
//       .end(function(err,res){
//         res.body.should.be.an('object');
//         res.status.should.equal(200);
//         done();
//     });
//   });
// });

// describe('create KOL referral event', function(){
//   it('create success - status 200 and token', function(done){
//   var api = supertest.agent(baseUrl);
//   var event =   {
//       "name": "kol",
//       "description": "kol promotion",
//       "type": "promotion",
//       "launching": true,
//       "startTime": "2018-01-03T10:53:15.885Z",
//       "endTime": "2018-03-10T13:06:35.885Z",
//       "rewardAmount": 60,
//       "code": "iamakol"
//     };
//     api.post(`/api/events?access_token=${global.adminToken}`)
//       .send(event)
//       .set('Accept', 'application/json')
//       .end(function(err,res){
//         res.body.should.be.an('object');
//         res.status.should.equal(200);
//         global.code = res.body.code;
//         console.log(global.code);
//         done();
//     });
//   });
// });

// describe('a user claim kol reward', function(){
//   it('claim success - return success', function(done){
//   var api = supertest.agent(baseUrl);
//   var data = {
//     "userId": global.lbUserId,
//     "code": 'HJ-d_F7oXM'
//   }
//     api.post(`/api/rewards/refer?access_token=${global.accessToken}`)
//       .send({data: data})
//       .set('Accept', 'application/json')
//       .end(function(err,res){
//         console.log(res.body);
//         res.body.should.be.an('object');
//         //res.body.result.success.should.equal(true);
//         res.status.should.equal(200);
//         done();
//     });
//   });
// });

// describe('a user claim promtion reward', function(){
//     it('user already claimed', function(done){
//     var api = supertest.agent(baseUrl);
//     var data = {
//       "userId": global.lbUserId,
//       "code": 'HJ-d_F7oXM',
//       "type": 'promotion'
//     }
//       api.post(`/api/rewards/refer?access_token=${global.accessToken}`)
//         .send({data: data})
//         .set('Accept', 'application/json')
//         .end(function(err,res){
//           console.log(res.body);
//           res.body.result.should.equal('reward_already_claimed');
//           res.status.should.equal(200);
//           done();
//       });
//     });
//   });

  // describe('a user claim promtion reward', function(){
  //   it('incorrect code as event not found', function(done){
  //   var api = supertest.agent(baseUrl);
  //   var data = {
  //     "userId": global.lbUserId,
  //     "code": 'abc',
  //     "type": 'promotion'
  //   }
  //     api.post(`/api/rewards/refer?access_token=${global.accessToken}`)
  //       .send({data: data})
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log(res.body);
  //         res.body.result.should.equal('invalid_event');
  //         res.status.should.equal(200);
  //         done();
  //     });
  //   });
  // });


  // describe('a user claim referral reward', function(){
  //   it('already being referred', function(done){
  //   var api = supertest.agent(baseUrl);
  //   var data = {
  //     "userId": global.lbUserId,
  //     "code": ''
  //   }
  //     api.post(`/api/rewards/refer?access_token=${global.accessToken}`)
  //       .send({data: data})
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log(res.body);
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //     });
  //   });
  // });

  // describe('a user claim referral reward', function(){
  //   it('sucess should return true', function(done){
  //   var api = supertest.agent(baseUrl);
  //   var data = {
  //     "userId": global.lbUserId,
  //     "code": 'B1UbpbHMf',
  //     "type": 'referral'
  //   }
  //     api.post(`/api/rewards/refer?access_token=${global.accessToken}`)
  //       .send({data: data})
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         console.log(res.body);
  //         res.body.result.success.should.equal(true);
  //         res.status.should.equal(200);
  //         done();
  //     });
  //   });
  // });

  describe('a user claim checkIn reward', function(){
    it('sucess should be true', function(done){
      var api = supertest.agent(baseUrl);
      api.get(`/api/rewards/checkIn/${global.lbUserId}?access_token=${global.accessToken}`)
        .set('Accept', 'application/json')
        .end(function(err,res){
          console.log(res.body);
          res.body.result.success.should.equal(true);
          res.status.should.equal(200);
          done();
      });
    });
  });

// let validEndTime = new Date().getTime() + 2000000;
// let inValidEndTime = new Date().getTime() - 10000;

// let cases = [
//   {description: 'user joined', endTime: validEndTime, maxNum: null, currentNum: 0, users: inValidUser},
//   {description: 'event full', endTime: validEndTime, maxNum: 10, currentNum: 10},
//   {description: 'event ended', endTime: inValidEndTime, maxNum: null, currentNum: 0},
//   {description: 'wrong code', endTime: validEndTime, maxNum: null, currentNum: 0, code: 'abc'}
// ]

// cases.map(eachCase=>{
//   let {description, endTime, maxNum, currentNum, users, code} = eachCase;
//   testCases(description, endTime, maxNum, currentNum, users, code)
// })

