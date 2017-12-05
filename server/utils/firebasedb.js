'user strict'

var app = require('../server');
var firebase = app.firebaseApp;
var firebasedb = firebase.database();

function changeFirebaseDb(setOrUpdate, location, dataObject, Model){
  let ref = firebasedb.ref(location);
  ref[setOrUpdate](dataObject, error=>{
    if(error){
      console.log(`Firebase : ${Model} ${setOrUpdate} error.` + error);
    } else {
      console.log(`Firebase : ${Model} ${setOrUpdate} success.`);
    }
  });
};

module.exports = changeFirebaseDb;