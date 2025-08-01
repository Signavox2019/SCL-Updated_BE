// const cloudinary = require('./cloudinary');
// const fs = require('fs');

// const uploadCertificateToCloudinary = async (localFilePath, fileName) => {
//   try {
//     const result = await cloudinary.uploader.upload(localFilePath, {
//       folder: 'certificates',
//       resource_type: 'raw',
//       public_id: fileName.replace('.pdf', '')
//     });

//     // Delete local file after upload
//     fs.unlinkSync(localFilePath);

//     return result.secure_url; // This is the Cloudinary URL
//   } catch (err) {
//     console.error('Cloudinary upload failed:', err);
//     throw err;
//   }
// };

// module.exports = uploadCertificateToCloudinary;








const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const mime = require('mime-types'); // to infer content-type from extension

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const uploadCertificateToS3 = async (localFilePath, fileName) => {
  try {
    const fileContent = fs.readFileSync(localFilePath);
    const contentType = mime.lookup(localFilePath) || 'application/octet-stream';

    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `certificates/${fileName}`, // S3 path
      Body: fileContent,
      ContentType: contentType
      // ACL: 'public-read' // or 'private' if you use signed URLs
    };

    const result = await s3.upload(s3Params).promise();

    // Delete local file after successful upload
    fs.unlinkSync(localFilePath);

    return result.Location; // S3 URL
  } catch (err) {
    console.error('S3 upload failed:', err);
    throw err;
  }
};

module.exports = uploadCertificateToS3;
