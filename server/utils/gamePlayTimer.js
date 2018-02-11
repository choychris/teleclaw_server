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
  Machine.findById(machineId, (err, instance)=>{
    if(compareTimeStamp(instance.lastStatusChanged, 6500)){
      //console.log("next reserve trigger : ", userId);
      loggingFunction('Util | ', 'Timeout Trigger | ', `userId: ${userId}`, 'info');
      Reservation.endEngage(machineId, userId, null);
    }
  });
}

