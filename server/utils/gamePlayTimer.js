'use strict';
function compareTimeStamp(time, duration){
  let now = new Date().getTime();
  console.log('compare time now : ', now);
  console.log('now and last updated time different : ', (now - time));
  if((now - time) > duration){
    return true; //<--- = there is no response from user
  }else{
    return false; //<--- = there is response from user
  }
};
//if machine has not update in last 8 sec, clean it.
export function checkMachineStatus(machineId, userId, Machine, Reservation){
  Machine.findById(machineId, (err, instance)=>{
    console.log("clean trigger : ", instance.lastStatusChanged);
    if(compareTimeStamp(instance.lastStatusChanged, 6000)){
      Reservation.endEngage(machineId, userId, null);
    }
  });
}

