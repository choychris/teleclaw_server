'use strict';
import { loggingFunction } from './createLogging.js';

function compareTimeStamp(time, duration){
  let now = new Date().getTime();
  // console.log('compare time now : ', now);
  // console.log('now and last updated time different : ', (now - time));
  if((now - time) > duration){
    return true; //<--- = there is no response from user
  }else{
    return false; //<--- = there is response from user
  }
};
//if machine has not update in last 8 sec, clean it.
export function checkMachineStatus(machineId, userId, Machine, Reservation){
  let now = new Date().getTime();
  Machine.findById(machineId, (err, instance)=>{
    let information = `userId: ${userId}, now: ${now}, lastUpdate: ${instance.lastStatusChanged}, different: ${(now - instance.lastStatusChanged)}`;
    loggingFunction('Util | ', 'Check Time | ', information , 'info');
    if(compareTimeStamp(instance.lastStatusChanged, 10000)){
      //console.log("next reserve trigger : ", userId);
      Reservation.endEngage(machineId, userId, null);
    }
  });
}

