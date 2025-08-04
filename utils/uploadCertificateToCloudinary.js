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
const mime = require('mime-types');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Configure S3 client (v3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const uploadCertificateToS3 = async (localFilePath, fileName) => {
  try {
    const fileContent = fs.readFileSync(localFilePath);
    const contentType = mime.lookup(localFilePath) || 'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `certificates/${fileName}`,
      Body: fileContent,
      ContentType: contentType
      // ACL: 'public-read' // Only if your bucket policy allows it or you want public access
    });

    await s3Client.send(command);

    // Clean up local file after upload
    fs.unlinkSync(localFilePath);

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/certificates/${fileName}`;
    return fileUrl;
  } catch (err) {
    console.error('S3 upload failed:', err);
    throw err;
  }
};

module.exports = uploadCertificateToS3;
