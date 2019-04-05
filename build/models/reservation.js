"use strict";var _beforeSave=require("../utils/beforeSave"),_createLogging=require("../utils/createLogging"),_gamePlayTimer=require("../utils/gamePlayTimer"),_makeTransaction=require("../utils/makeTransaction"),app=require("../server");module.exports=function(o){function c(e,a,n){app.models.Machine.findById(e,function(e,t){t.updateAttributes({status:a,currentUser:n},function(e){e&&(0,_createLogging.loggingFunction)("Reservation | "," updateMachine Error | ",e,"error")})})}function d(e,t,a,n){setTimeout(function(){(0,_gamePlayTimer.checkMachineStatus)(e,t,a,n)},12e3)}(0,_createLogging.loggingModel)(o),(0,_createLogging.loggingRemote)(o,"endEngage"),(0,_beforeSave.updateTimeStamp)(o),o.disableRemoteMethodByName("deleteById",!0),(0,_beforeSave.assignKey)(o),o.observe("before save",function(e,t){var a=app.models.Machine;if(e.isNewInstance)t();else{var n=e.currentInstance,r=n.status,s=n.machineId;e.data&&("open"===e.data.status&&"open"===r&&s&&(0,_makeTransaction.makeCalculation)(a,s,"reservation",1,"minus"),"open"===e.data.status&&e.data.machineId&&(0,_makeTransaction.makeCalculation)(a,e.data.machineId,"reservation",1,"plus"),"close"===e.data.status&&s&&(0,_makeTransaction.makeCalculation)(a,s,"reservation",1,"minus"),"cancel"===e.data.status&&s&&((0,_makeTransaction.makeCalculation)(a,s,"reservation",1,"minus"),e.data.machineId=null,e.data.productId=null)),t()}}),o.observe("after save",function(e,t){var a=e.instance,n=a.id,r=a.status,s=a.userId,i=a.machineId,u=a.lastUpdated,o=a.productId;if(e.isNewInstance)t();else{if("close"===r&&i){var c={id:n,status:r,machineId:i,productId:o,lastUpdated:u};app.pusher.trigger("reservation-"+s.toString(),"your_turn",c)}t()}}),o.endEngage=function(r,s,i){var u=app.models.Machine;u.findById(r,function(e,t){var a=t.currentUser?t.currentUser.id:"null",n={machineId:r,machineStatus:t.status,userId:s.toString(),currentId:a.toString()};(0,_createLogging.loggingFunction)("Reservation | ","end user engage | ",JSON.stringify(n),"info"),"open"===t.status&&a.toString()===s.toString()?o.findOne({where:{machineId:r,status:"open"},order:"lastUpdated ASC"},function(e,t){null===t?(c(r,"open",null),i&&i(null,"machine_open")):t.updateAttributes({status:"close"},function(e,t){c(r,"open",{id:t.userId}),d(r,t.userId,u,o),i&&i(null,"next_reserve")})}):"playing"===t.status?i&&i(null,"machine_playing"):"close"===t.status?i&&i(null,"machine_closed"):i&&i(null,"machine_ready")})},o.remoteMethod("endEngage",{http:{path:"/:machineId/:userId/endEngage",verb:"get"},accepts:[{arg:"machineId",type:"string",required:!0},{arg:"userId",type:"string",required:!0}],returns:{arg:"result",type:"object"}}),o.serverlessWorker=function(n,r){o.findOne({where:{machineId:n,status:"open"},order:"lastUpdated ASC"},function(e,t){null===t?(c(n,"open",null),r(null,"machine_open")):t.updateAttributes({status:"close"},function(e,t){c(n,"open",{id:t.userId});var a=app.models.Machine;d(n,t.userId,a,o),r(null,"next_reserve")})})},o.remoteMethod("serverlessWorker",{http:{path:"/:machineId/serverlessWorker",verb:"get"},accepts:[{arg:"machineId",type:"string",required:!0}],returns:{arg:"result",type:"string"}})};