const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const uploadFile = async (file) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `installments/${uuidv4()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    // ACL: 'public-read', // So that file is accessible via URL
  };

  const data = await s3.upload(params).promise();
  return data.Location; // Return the S3 URL
};

module.exports = uploadFile;
