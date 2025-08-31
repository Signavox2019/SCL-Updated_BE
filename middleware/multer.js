// middleware/multer.js
const multer = require('multer');

const storage = multer.memoryStorage(); // store in memory to upload to S3
const upload = multer({ storage });

module.exports = upload;
