// const pdf = require('html-pdf');
// const template = require('./offerLetterTemplate');
// const cloudinary = require('./cloudinary');
// const fs = require('fs');
// const path = require('path');

// exports.generateAndUploadOfferLetter = (user) => {
//   return new Promise((resolve, reject) => {
//     const html = template(user);

//     // Create PDF from HTML
//     pdf.create(html).toFile(path.join(__dirname, 'temp_offer.pdf'), async (err, res) => {
//       if (err) return reject(err);

//       try {
//         // Upload to Cloudinary
//         const uploadResult = await cloudinary.uploader.upload(res.filename, {
//           folder: 'SCL/OfferLetters',
//           resource_type: 'raw', // for PDF
//           public_id: `${user._id}_offer_letter`
//         });

//         // Clean up local file
//         fs.unlinkSync(res.filename);

//         resolve(uploadResult.secure_url);
//       } catch (error) {
//         reject(error);
//       }
//     });
//   });
// };








const pdf = require('html-pdf');
const template = require('./offerLetterTemplate');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Configure S3 client (v3 style)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

exports.generateAndUploadOfferLetter = (user) => {
  return new Promise((resolve, reject) => {
    const html = template(user);
    const tempFilePath = path.join(__dirname, 'temp_offer.pdf');
    const pdfOptions = {
      format: 'A4',
      orientation: 'portrait',
      type: 'pdf',
      border: {
        top: '12mm',
        right: '22mm',
        bottom: '12mm',
        left: '22mm'
      },
      timeout: 30000,
      footer: {
        height: '18mm',
        contents: {
          default: '<div style="width:100%;text-align:center;border-top:2px solid #000;font-weight:bold;font-size:16pt;padding-top:2mm;background:#fff;">Corp Work Hub, 81 Jubilee Enclave, Hitech city, Hyderabad, Telangana, India, 500081</div>'
        }
      },
      // improve remote asset loading on some hosts
      phantomArgs: [
        '--local-to-remote-url-access=true',
        '--ignore-ssl-errors=yes',
        '--ssl-protocol=any'
      ]
    };

    pdf.create(html, pdfOptions).toFile(tempFilePath, async (err, res) => {
      if (err) return reject(err);

      try {
        const fileContent = fs.readFileSync(tempFilePath);
        const contentType = mime.lookup(tempFilePath) || 'application/pdf';

        const uploadParams = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: `SCL/OfferLetters/${user._id}_offer_letter.pdf`,
          Body: fileContent,
          ContentType: contentType
          // ACL: 'public-read'
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // Clean up local file
        fs.unlinkSync(tempFilePath);

        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;

        resolve(fileUrl);
      } catch (uploadErr) {
        reject(uploadErr);
      }
    });
  });
};
