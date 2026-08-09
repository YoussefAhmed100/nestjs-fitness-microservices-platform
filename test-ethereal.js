const nodemailer = require('nodemailer');

nodemailer.createTestAccount().then((account) => {
  console.log('SMTP_HOST=smtp.ethereal.email');
  console.log('SMTP_PORT=587');
  console.log(`SMTP_USER=${account.user}`);
  console.log(`SMTP_PASS=${account.pass}`);
});