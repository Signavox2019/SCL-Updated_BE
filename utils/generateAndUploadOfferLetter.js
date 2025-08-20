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








const template = require('./offerLetterTemplate');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// Configure S3 client (v3 style)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

exports.generateAndUploadOfferLetter = async (user) => {
  const html = template(user);

  // Launch headless Chromium; works in most cloud platforms with no-sandbox flags
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // Ensure web fonts are fully loaded before PDF snapshot
    await page.evaluate(async () => { if (document.fonts && document.fonts.ready) { await document.fonts.ready; } });
    await page.emulateMediaType('print');

    // Ensure consistent page size and background rendering
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '5mm', bottom: '10mm', left: '5mm' }
    });

    const key = `SCL/OfferLetters/${user.name}_offer_letter.pdf`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
      // ACL: 'public-read'
    }));

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return fileUrl;
  } finally {
    await browser.close();
  }
};
