require('dotenv').config();
const path = require('path');
const { sendEmail } = require('./src/services/emailService');

async function test() {
  try {
    const r1 = await sendEmail('jagaosuru@gmail.com', 'Test Applicant Notification', 'test', '<p>applicant test</p>');
    console.log('APPLICANT EMAIL OK:', r1.messageId);
  } catch(e) {
    console.log('APPLICANT EMAIL FAIL:', e.message);
  }

  try {
    const uploadPath = path.join(__dirname, 'uploads/resumes/1780492068132_Alex_Johnson_Dummy_Resume.pdf');
    const r2 = await sendEmail(process.env.ADMIN_EMAIL, 'Test Admin Notification', 'test', '<p>admin test</p>', [{ filename: 'resume.pdf', path: uploadPath }]);
    console.log('ADMIN EMAIL OK:', r2.messageId);
  } catch(e) {
    console.log('ADMIN EMAIL FAIL:', e.message);
  }
}

test().then(() => process.exit(0));
