const request = require('request');
const Promise = require('bluebird');
const moment = require('moment');
const crypto = require('crypto');
const uuidv4 = require('uuid/v4');
const hmacsha1 = require('hmacsha1');

function startRecording(userId, playId){
  let action = 'AddLiveAppRecordConfig';
  let domainName = "live.teleclaw.win";
  let AppName = "teleclaw";
  let streamName = '101';
  let OssEndpoint = 'teleclaw.oss-ap-southeast-1.aliyuncs.com';
  let OssBucket = "teleclaw/abc/a"
  let formatName = 'mp4';
  let startTime = moment().format('YYY-MM-DD-HH:mm:ss');
  let endTime = moment().add(40, 's').format('YYY-MM-DD-HH:mm:ss');
  let formatPrefix = `record/${AppName}/${streamName}/${startTime}_${endTime}`;
  let timeToSign = new Date().toISOString().split('.')[0]+"Z";
  let accessKeyId = 'LTAIkymjN0JQllFL';
  let accessSecret = 'bWU0LoiYuHKftF62KhqvWOjQg1wyny&';
  let random = uuidv4();
  let authParams = `Format=json&Version=2014-11-11&AccessKeyId=${accessKeyId}&SignatureMethod=HMAC-SHA1&Timestamp=${timeToSign}&SignatureVersion=1.0&SignatureNonce=${random}`

  let apiUrl = 'https://live.aliyuncs.com/';
  let basicParams = `Action=${action}&DomainName=${domainName}&AppName=${AppName}&OssEndpoint=${OssEndpoint}&OssBucket=${OssBucket}&RecordFormat.1.Name=${formatName}&RecordFormat.1.OssObjectPrefix=${formatPrefix}`
  
  let StringToSign = 'GET&/&' + basicParams +'&' + authParams ;
  var res = encodeURIComponent(StringToSign).replace(/%26/gi, "&");
  var hash = hmacsha1(accessSecret, res)


  let resquestUrl = apiUrl + '?' + basicParams + '&' + authParams + `&Signature=${encodeURIComponent(hash)}`
  console.log(resquestUrl);
}

startRecording();