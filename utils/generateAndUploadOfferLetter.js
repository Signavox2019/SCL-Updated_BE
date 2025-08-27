const puppeteer = require("puppeteer");
const template = require("./offerLetterTemplate");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// AWS S3 (v3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

exports.generateAndUploadOfferLetter = async (user) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--hide-scrollbars",
      ],
    });

    const page = await browser.newPage();

    // Ensure print CSS is used
    await page.emulateMediaType("print");

    // Load HTML
    const html = template(user);
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for custom fonts (system fonts load immediately; this also guards future changes)
    await page.evaluateHandle("document.fonts && document.fonts.ready || Promise.resolve()");
    // Wait for all images to finish loading (logo / watermark)
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((res, rej) => {
            img.addEventListener("load", res, { once: true });
            img.addEventListener("error", res, { once: true }); // don't block on broken links
          });
        })
      );
    });

    // Create PDF
    const pdfBuffer = await page.pdf({
      // Let CSS @page size & margins rule:
      preferCSSPageSize: true,
      printBackground: true,
      // do NOT set "format" or "margin" here; we use CSS @page
    });

    await browser.close();

    // Upload to S3
    const Key = `SCL/OfferLetters/${user._id}_offer_letter.pdf`;
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    }));

    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;
  } catch (err) {
    if (browser) try { await browser.close(); } catch {}
    throw err;
  }
};
