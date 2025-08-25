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
const fs = require('fs');

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

  // Decide runtime environment and pick appropriate puppeteer flavor
  const isLocalDev = process.env.PUPPETEER_LOCAL_DEV === 'true' || process.platform === 'win32' || process.env.NODE_ENV === 'development';
  let preferCore = !isLocalDev && process.env.PUPPETEER_USE_CORE !== 'false';

  let puppeteerLib;
  try {
    puppeteerLib = preferCore ? require('puppeteer-core') : require('puppeteer');
  } catch (e) {
    // Fall back to core if full puppeteer isn't installed
    puppeteerLib = require('puppeteer-core');
    preferCore = true;
  }

  let browser;
  if (preferCore) {
    if (isLocalDev) {
      // Local dev with puppeteer-core: try system Chrome/Edge
      const candidatePaths = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        process.env.CHROME_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
      ].filter(Boolean);

      const resolvedExecutablePath = candidatePaths.find((p) => {
        try { return p && fs.existsSync(p); } catch (_) { return false; }
      });

      if (!resolvedExecutablePath) {
        throw new Error('Could not locate Chrome/Edge. Set PUPPETEER_EXECUTABLE_PATH or CHROME_PATH to your browser executable.');
      }

      browser = await puppeteerLib.launch({
        headless: true,
        executablePath: resolvedExecutablePath
      });
    } else {
      // Production/cloud with sparticuz/chromium
      browser = await puppeteerLib.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath(),
        headless: chromium.headless
      });
    }
  } else {
    // Full puppeteer in local/dev with bundled Chromium
    browser = await puppeteerLib.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    // Ensure web fonts are fully loaded before PDF snapshot
    await page.evaluate(async () => { if (document.fonts && document.fonts.ready) { await document.fonts.ready; } });
    await page.emulateMediaType('print');

    // Ensure consistent page size and background rendering
    const pdfBuffer = await page.pdf({
      width: '210mm',
      height: '297mm',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
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
