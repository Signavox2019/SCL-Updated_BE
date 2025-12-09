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
  const isLinux = process.platform === "linux";
  const isProd = process.env.NODE_ENV === "production";

  // 🔧 Safer, platform-aware launch options
  const launchOptions = {
    // If you're on newer Puppeteer, you can use: headless: "new"
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      // 🟢 Only add these aggressive flags on Linux/EB
      ...(isLinux
        ? [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--no-zygote",
            "--single-process",
          ]
        : []),
    ],
  };

  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    // Optional: helps for consistent layout
    await page.setViewport({ width: 1240, height: 1754 });

    // Debug hooks (will log to your Node console if something goes wrong in page)
    page.on("pageerror", (err) => {
      console.error("Puppeteer pageerror:", err);
    });
    page.on("error", (err) => {
      console.error("Puppeteer error on page:", err);
    });

    await page.emulateMediaType("print");

    const html = template(user);

    await page.setContent(html, { waitUntil: "networkidle0" });

    // If you don't need JS in the template, this avoids scripts closing the page
    // (e.g., window.close() or navigation)
    // Comment this out if you rely on JS in the letter.
    await page.setJavaScriptEnabled(false);

    // Wait for fonts if supported
    await page.evaluateHandle(
      "document.fonts && document.fonts.ready || Promise.resolve()"
    );

    // Wait for images (logos, signatures, etc.)
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => {
            img.addEventListener("load", res, { once: true });
            img.addEventListener("error", res, { once: true });
          });
        })
      );
    });

    // Small delay to be extra safe before printing
    await new Promise((res) => setTimeout(res, 300));


    const pdfBuffer = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
    });

    await browser.close();
    browser = null;

    const Key = `SCL/OfferLetters/${user._id}_offer_letter.pdf`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      })
    );

    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;
  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
    console.error("Offer Letter Error in generateAndUploadOfferLetter:", err);
    throw err;
  }
};
