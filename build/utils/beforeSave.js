"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.updateTimeStamp=updateTimeStamp;var uuidv4=require("uuid/v4");function updateTimeStamp(e){e.observe("before save",function(e,t){if(e.isNewInstance){var a=(new Date).getTime();e.instance.created=a,e.instance.lastUpdated=a}else e.data?e.data.lastUpdated=(new Date).getTime():e.instance&&(e.instance.lastUpdated=(new Date).getTime());t()})}var assignKey=exports.assignKey=function(e){e.observe("before save",function(e,t){e.isNewInstance&&(e.instance.id=uuidv4()),t()})};