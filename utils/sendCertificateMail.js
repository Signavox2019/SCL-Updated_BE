const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,           // smtp.office365.com
  port: parseInt(process.env.MAIL_PORT), // 587
  secure: process.env.MAIL_SECURE === 'true' ? true : false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false // optional but may help for dev
  }
});

const sendCertificateMail = async ({ to, name, courseTitle, certUrl, certId }) => {
  const html = `
    <div style="font-family: Arial; padding: 20px;">
      <h2>🎉 Congratulations ${name}!</h2>
      <p>You’ve successfully completed the <strong>${courseTitle}</strong> course.</p>
      <p>Your Certificate ID: <strong>${certId}</strong></p>
      <p>Click below to download your certificate:</p>
      <a href="${certUrl}" target="_blank" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none;">Download Certificate</a>
    </div>
  `;

  await transporter.sendMail({
    from: `"Signavox Career Ladder" <${process.env.EMAIL_USER}>`,
    to,
    subject: `🎓 Your Certificate for ${courseTitle}`,
    html,
  });
};

module.exports = sendCertificateMail;
