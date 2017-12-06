'user strict'

var app = require('../server');
var firebase = app.firebaseApp;
var firebasedb = firebase.database();

export function changeFirebaseDb(setOrUpdate, location, dataObject, Model){
  let ref = firebasedb.ref(location);
  ref[setOrUpdate](dataObject, error=>{
    if(error){
      console.log(`Firebase : ${Model} ${setOrUpdate} error.` + error);
    } else {
      console.log(`Firebase : ${Model} ${setOrUpdate} success.`);
    }
  });
};

export function makeDbTransaction(location, childName, plusOrMinus){
  let ref = firebasedb.ref(location);
  ref.child(childName).transaction((current_value)=>{
    if(plusOrMinus === 'plus'){
      return (current_value + 1);
    } else {
      let new_value = ((current_value - 1) < 0) ? 0 : (current_value - 1) ;
      return new_value;
    }
  });
};

// module.exports = changeFirebaseDb;