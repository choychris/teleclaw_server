"use strict";var _beforeSave=require("../utils/beforeSave"),_createLogging=require("../utils/createLogging"),_nodeMailer=require("../utils/nodeMailer"),_makeTransaction=require("../utils/makeTransaction"),app=require("../server");module.exports=function(i){(0,_createLogging.loggingModel)(i),(0,_beforeSave.updateTimeStamp)(i),(0,_beforeSave.assignKey)(i),i.observe("before save",function(a,e){if(a.isNewInstance){var n=app.models.User,t=a.instance,r=t.userId,i=t.email;a.instance.solved=!1,i?n.findById(r,function(e,n){n.updateAttributes({contactEmail:i})}):n.findById(r,function(e,n){var t=n.contactEmail?n.contactEmail:n.email;a.instance.email=t}),e()}else e()}),i.observe("after save",function(e,n){if(e.isNewInstance){var t=e.instance,a=t.type,r=t.email,i="Issue report from user : type = "+a,s="<h3>Message : "+t.message+"</h3>\n          <h3>userId : "+t.userId+"</h3>\n          <p>User email : "+r+"</p>\n          <p>Related machineId : "+t.machineId+"</p>\n          <p>Related deliveryId : "+t.deliveryId+"</p>\n          <p>Related transactionId : "+t.transactionId+"</p>";(0,_nodeMailer.sendEmail)(i,s),n()}else n()}),i.userRefund=function(e,n){var t=e.userId,a=e.issueId,r=e.amount;(0,_makeTransaction.createNewTransaction)(t,r,"refund","plus",!0).then(function(e){return[e,i.findById(a)]}).spread(function(e,n){return n.updateAttributes({refund:{amount:r,tansactionId:e.id}})}).then(function(e){n(null,e)}).catch(function(e){(0,_createLogging.loggingFunction)("Issue | ","create Refund error | ",e,"error"),n(e)})},i.remoteMethod("userRefund",{http:{path:"/userRefund",verb:"post"},accepts:{arg:"data",type:"object",http:{source:"body"}},returns:{arg:"response",type:"object"}})};