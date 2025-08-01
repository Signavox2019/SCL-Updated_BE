// const multer = require('multer');
// const path = require('path');

// // File storage
// const getStorage = (folder) =>
//   multer.diskStorage({
//     destination: (req, file, cb) => cb(null, `uploads/${folder}`),
//     filename: (req, file, cb) => {
//       const ext = path.extname(file.originalname);
//       cb(null, `${Date.now()}-${file.fieldname}${ext}`);
//     }
//   });

// // Filters
// const fileFilter = (allowedTypes) => (req, file, cb) => {
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (allowedTypes.includes(ext)) cb(null, true);
//   else cb(new Error('Unsupported file type'), false);
// };

// // Exported uploaders
// exports.uploadResume = multer({
//   storage: getStorage('resumes'),
//   fileFilter: fileFilter(['.pdf', '.doc', '.docx'])
// });

// exports.uploadCertificate = multer({
//   storage: getStorage('certificates'),
//   fileFilter: fileFilter(['.pdf', '.png', '.jpg', '.jpeg'])
// });

// exports.uploadMaterial = multer({
//   storage: getStorage('materials'),
//   fileFilter: fileFilter(['.pdf', '.ppt', '.pptx', '.zip'])
// });

// exports.uploadBanner = multer({
//   storage: getStorage('banners'),
//   fileFilter: fileFilter(['.jpg', '.jpeg', '.png'])
// });



// // Ticket file upload (support screenshots, images, PDFs, text, etc.)
// exports.uploadTicketFile = multer({
//   storage: getStorage('tickets'),
//   fileFilter: fileFilter(['.jpg', '.jpeg', '.png', '.pdf', '.txt', '.doc', '.docx'])
// });


const multer = require('multer');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

// AWS S3 Config
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// File type filter
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
};

// Generic uploader
const getS3Uploader = (folder, allowedTypes) => {
  return multer({
    storage: multerS3({
      s3,
      bucket: process.env.S3_BUCKET_NAME,
      acl: 'public-read', // or 'private' if you use signed URLs
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${Date.now()}-${file.fieldname}${ext}`;
        cb(null, `${folder}/${filename}`);
      }
    }),
    fileFilter: fileFilter(allowedTypes)
  });
};

// Exported uploaders (same usage as before)
exports.uploadResume = getS3Uploader('resumes', ['.pdf', '.doc', '.docx']);
exports.uploadCertificate = getS3Uploader('certificates', ['.pdf', '.png', '.jpg', '.jpeg']);
exports.uploadMaterial = getS3Uploader('materials', ['.pdf', '.ppt', '.pptx', '.zip']);
exports.uploadBanner = getS3Uploader('banners', ['.jpg', '.jpeg', '.png']);
exports.uploadTicketFile = getS3Uploader('tickets', ['.jpg', '.jpeg', '.png', '.pdf', '.txt', '.doc', '.docx']);
