const path = require('path');
const multer = require('multer');
const fs = require('fs');

// config multer storage
var storage = multer.diskStorage({
  destination: function (req, file, cb){
    var dirPath = path.join( __dirname, '/tempimages') ;
    if (!fs.existsSync(dirPath)){
      var dir = fs.mkdirSync(dirPath)
    }
    cb(null, dirPath + '/'); 
  },
  filename: function (req, file, cb){
    // console.log('file in fileName -------: ', file);
    var ext = file.originalname.substring(file.originalname.lastIndexOf("."));
    var fileName = Date.now() + ext;
    cb(null, fileName);
  }
});

module.exports = storage ;