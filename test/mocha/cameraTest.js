var should = require('chai').should();
var supertest = require('supertest');
//var server = require('../../build/server.js');

var baseUrl = 'http://localhost:3000';
var accessToken = 'fzynTh6ygRiF4htEOvEJjiHUHAq9tHmmLbE9zLW1MSqbNFvTk1PcFDuYIYnb9CD2';
var LBuserid = '5a2909f81deecd06749f63cc';

// var api = supertest.agent('localhost:3000');
const generateJSONAPI = (url, filter) => {
  return url + '&filter=' + JSON.stringify(filter) ;
}

describe('Attach a related models to product', function(){

  //  describe('Create Camera', function(){
  //   it('should return camera object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     var cameraBody = { 
  //       name: "camera1",
  //       position: 'front',
  //       type: 'main',
  //       webrtcServer: 'http://webrtcstreamer-env.ap-southeast-1.elasticbeanstalk.com/',
  //       rtspDdnsUrl: 'rtsp://188773sc14.iask.in:554/live/sub',
  //       localIp: '192.168.2.101',
  //       alibabaSetting: {
  //         domain: 'live3.teleclaw.win',
  //         appName: 'teleclaw_dev',
  //         streamName: 'camera1',
  //         rtmp: "rtmp://live3.teleclaw.win/teleclaw_dev/camera1?auth_key=1512806440-0-0-c1161f52d3dce54069b16d9436fb5eab",
  //         flv: "http://live3.teleclaw.win/teleclaw_dev/camera1.flv?auth_key=1512806440-0-0-7ee97130c8412574c977a895750046f1",
  //         m3u8: "http://live3.teleclaw.win/teleclaw_dev/camera1.m3u8?auth_key=1512806440-0-0-6cbb043751a4d055c683228cd960cabf"
  //       }
  //     }

  //     api
  //       .post('/api/cameras')
  //       .send(cameraBody)
  //       .set('Accept', 'application/json')
  //       .end(function(err,res){
  //         // console.log(res.body);
  //         global.Camera = res.body;
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  describe('Select a machine and get related info', function(){
    it('should return machine object', function(done){
      var api = supertest.agent(baseUrl);
      //let machineId = 'f0348d84-a1ae-48c5-ab9a-bdd45cb54759';
      let url = `/api/machines?access_token=${accessToken}`;
      let filter = {
        include: 'cameras'
      }
      api
        .get(generateJSONAPI(url, filter))
        .set('Accept', 'application/json')
        .end(function(err,res){
          console.log(res.body);
          global.machineInfo = res.body[0];
          res.body.should.be.an('array');
          res.status.should.equal(200);
          done();
        });
    });
  });

  // describe('Attach the machineId to the cammera', function(){
  //   it('should return camera object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     //let machineId = 'f0348d84-a1ae-48c5-ab9a-bdd45cb54759';
  //     let url = `/api/cameras/${global.Camera.id}?access_token=${accessToken}`;
  //     api
  //       .patch(url)
  //       .set('Accept', 'application/json')
  //       .send({machineId: global.machineInfo.id})
  //       .end(function(err,res){
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

  // describe('change the machine iotPlatform info', function(){
  //   it('should return machine object', function(done){
  //     var api = supertest.agent(baseUrl);
  //     //let machineId = 'f0348d84-a1ae-48c5-ab9a-bdd45cb54759';
  //     let url = `/api/machines/${global.machineInfo.id}?access_token=${accessToken}`;
  //     let iotPlatform = {
  //       gizwits : {
  //         machineId : 'string',
  //         deviceMAC : 'string',
  //         productKey : 'string'
  //       }
  //     };

  //     api
  //       .patch(url)
  //       .set('Accept', 'application/json')
  //       .send({iotPlatform: iotPlatform})
  //       .end(function(err,res){
  //         res.body.should.be.an('object');
  //         res.status.should.equal(200);
  //         done();
  //       });
  //   });
  // });

});