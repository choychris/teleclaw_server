const path = require('path');
const multer = require('multer');
const fs = require('fs');

// config multer storage
// use muter storage to temporately save picture in local
const storage = multer.diskStorage({
  destination(req, file, cb) {
    let dirPath = path.join(__dirname, '/tempimages');
    if (!fs.existsSync(dirPath)) {
      dirPath = fs.mkdirSync(dirPath);
    }
    cb(null, `${dirPath}/`);
  },
  filename(req, file, cb) {
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.'));
    const fileName = Date.now() + ext;
    cb(null, fileName);
  },
});

module.exports = storage;
