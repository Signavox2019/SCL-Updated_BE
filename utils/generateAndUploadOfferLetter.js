const pdf = require('html-pdf');
const template = require('./offerLetterTemplate');
const cloudinary = require('./cloudinary');
const fs = require('fs');
const path = require('path');

exports.generateAndUploadOfferLetter = (user) => {
  return new Promise((resolve, reject) => {
    const html = template(user);

    // Create PDF from HTML
    pdf.create(html).toFile(path.join(__dirname, 'temp_offer.pdf'), async (err, res) => {
      if (err) return reject(err);

      try {
        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(res.filename, {
          folder: 'SCL/OfferLetters',
          resource_type: 'raw', // for PDF
          public_id: `${user._id}_offer_letter`
        });

        // Clean up local file
        fs.unlinkSync(res.filename);

        resolve(uploadResult.secure_url);
      } catch (error) {
        reject(error);
      }
    });
  });
};
