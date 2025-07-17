
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Set up storage engine
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function(req, file, cb){
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Initialize upload
const upload = multer({
  storage: storage,
  limits:{fileSize: 1000000}, // 1MB limit
  fileFilter: function(req, file, cb){
    checkFileType(file, cb);
  }
}).single('image');

// Check file type
function checkFileType(file, cb){
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if(mimetype && extname){
    return cb(null,true);
  } else {
    cb('Error: Images Only!');
  }
}

// @route POST /api/upload
// @desc Upload an image
router.post('/', (req, res) => {
  upload(req, res, (err) => {
    if(err){
      res.status(400).json({ msg: err });
    } else {
      if(req.file == undefined){
        res.status(400).json({ msg: 'Error: No File Selected!' });
      } else {
        res.json({
          msg: 'File Uploaded!',
          filePath: `/uploads/${req.file.filename}`
        });
      }
    }
  });
});

module.exports = router;
