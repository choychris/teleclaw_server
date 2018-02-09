const request = require('request');
const Promise = require('bluebird');
const moment = require('moment');
const crypto = require('crypto');
const uuidv4 = require('uuid/v4');
const hmacsha1 = require('hmacsha1');
var Hashes = require('jshashes')

var RPCClient = require('@alicloud/pop-core').RPCClient;
// function startRecording(userId, playId){
//   let action = 'AddLiveAppRecordConfig';
//   let domainName = "live.teleclaw.win";
//   let AppName = "teleclaw";
//   let streamName = '101';
//   let OssEndpoint = 'teleclaw.oss-ap-southeast-1.aliyuncs.com';
//   let OssBucket = encodeURIComponent("teleclaw/abc/a")
//   let formatName = 'mp4';
//   let startTime = encodeURIComponent(moment().format('YYYY-MM-DD-HH:mm:ss'))
//   let endTime = encodeURIComponent(moment().add(40, 's').format('YYYY-MM-DD-HH:mm:ss'))
//   let formatPrefix = encodeURIComponent(`record/${AppName}/${streamName}/${startTime}_${endTime}`)
//   let timeToSign = encodeURIComponent(new Date().toISOString().split('.')[0]+"Z")
//   let accessKeyId = 'LTAIkymjN0JQllFL';
//   let accessSecret = 'bWU0LoiYuHKftF62KhqvWOjQg1wyny&';
//   let random = uuidv4();
//   let authParams = `Format=JSON&SignatureMethod=HMAC-SHA1&Timestamp=2018-02-08T08%3A57%3A25Z&AccessKeyId=${accessKeyId}&Version=2016-11-01&SignatureVersion=1.0&SignatureNonce=${random}`

//   let apiUrl = 'https://live.aliyuncs.com/';
//   //let basicParams = `Action=${action}&DomainName=${domainName}&AppName=${AppName}&OssEndpoint=${OssEndpoint}&OssBucket=${OssBucket}&RecordFormat.1.Name=${formatName}&RecordFormat.1.OssObjectPrefix=${formatPrefix}`
//   let basicParams = 'Action=DescribeLiveStreamsOnlineList&DomainName=live.teleclaw.win&AppName=teleclaw'
//   let StringToSign =  basicParams + '&' + authParams;
//   var res = 'GET&%2F&' + encodeURIComponent(StringToSign)
//   //var hash = hmacsha1(accessSecret, res)
  
//   var hmac = crypto.createHmac("sha1", accessSecret); 
//   var hash2 = hmac.update('GET&%2F&AccessKeyId%3DLTAIkymjN0JQllFL%26Action%3DDescribeLiveStreamsOnlineList%26AppName%3Dteleclaw%26DomainName%3Dlive.teleclaw.win%26Format%3DJSON%26SignatureMethod%3DHMAC-SHA1%26SignatureNonce%3D0179f518-a399-4d66-bf20-ccace1b43d36%26SignatureVersion%3D1.0%26Timestamp%3D2018-02-08T08%253A57%253A25Z%26Version%3D2016-11-01'); 
//   var digest = hmac.digest("base64"); 
//   console.log(digest)
//   console.log(encodeURIComponent(digest))

//   // var SHA1 = new Hashes.SHA1;
//   // var sign = SHA1.b64_hmac(accessSecret,'GET&%2F&AccessKeyId%3DLTAIkymjN0JQllFL%26Action%3DDescribeLiveStreamsOnlineList%26AppName%3Dteleclaw%26DomainName%3Dlive.teleclaw.win%26Format%3DJSON%26SignatureMethod%3DHMAC-SHA1%26SignatureNonce%3D865c926e-895f-4a8c-9f2b-dec61028da09%26SignatureVersion%3D1.0%26Timestamp%3D2018-02-08T07%253A20%253A11Z%26Version%3D2016-11-01')
//   //console.log(res);

//   console.log('==========================')

//   let resquestUrl = apiUrl + '?' + basicParams + '&' + authParams + `&Signature=${encodeURIComponent(digest)}`
//   // console.log(res);
//   console.log(resquestUrl);
//   console.log('==========================')
//   request(resquestUrl, function(err, response, body){
//     if(err){
//       console.log('error :: ', err)
//     }
//     console.log('body:', body)
//   })
// }

function startRecording(userId, playId){
  var client = new RPCClient({
    accessKeyId: 'LTAIkymjN0JQllFL',
    secretAccessKey: 'bWU0LoiYuHKftF62KhqvWOjQg1wyny',
    endpoint: 'https://live.aliyuncs.com',
    apiVersion: '2016-11-01'
  });

  let domainName = "live.teleclaw.win";
  let AppName = "teleclaw";
  let streamName = '101';
  let OssEndpoint = 'oss-ap-southeast-1.aliyuncs.com';
  let OssBucket = "teleclaw"
  let formatName = 'mp4';
  let formatPrefix = `record/${AppName}/${streamName}/{EscapedStartTime}_{EscapedEndTime}`

  let params = {
    DomainName: domainName,
    AppName: AppName,
    OssEndpoint: OssEndpoint,
    OssBucket: OssBucket,
    "RecordFormat.1.Format": formatName,
    "RecordFormat.1.OssObjectPrefix": formatPrefix,
    "RecordFormat.1.CycleDuration": 900
  }

  client.request('AddLiveAppRecordConfig', params, {
    timeout: 3000, // default 3000 ms
    formatAction: true, // default true, format the action to Action
    formatParams: true, // default true, format the parameter name to first letter upper case
    method: 'GET', // set the http method, default is GET
    headers: {}, // set the http request headers
  }).then(res=>{
    console.log('RES : ', res)
  }).catch(err=>{
    console.log('ERROR : ', err)
  })
}

startRecording();