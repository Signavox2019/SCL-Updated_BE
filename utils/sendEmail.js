const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,           // smtp.office365.com
  port: parseInt(process.env.MAIL_PORT), // 587
  secure: process.env.MAIL_SECURE === 'true' ? true : false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false // optional but may help for dev
  }
});
// console.log(process.env.MAIL_HOST, process.env.EMAIL_USER); // should show office365 and your email


const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"SCL Support" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};

module.exports = sendEmail;
