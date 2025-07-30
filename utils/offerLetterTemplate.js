module.exports = (user) => {
  return `
    <html>
      <head><style>
        body { font-family: Arial; padding: 20px; }
        .header { font-size: 22px; font-weight: bold; }
        .section { margin-top: 20px; }
      </style></head>
      <body>
        <div class="header">Offer Letter</div>
        <div class="section">Date: ${new Date().toLocaleDateString()}</div>
        <div class="section">Dear ${user.name},</div>
        <div class="section">
          We are pleased to offer you the position at our company. Your email is <b>${user.email}</b>.
        </div>
        <div class="section">
          Please review the attached offer letter and confirm your acceptance.
        </div>
        <div class="section">Sincerely, <br> HR Department</div>
      </body>
    </html>
  `;
};
