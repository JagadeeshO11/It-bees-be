const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const buildCertificateHtml = (traineeName, courseName, awardedDate) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Certificate of Completion</title>
</head>
<body style="margin:0;padding:40px 20px;background:#f0f0f0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:850px;margin:0 auto;background:#fff;border:12px solid #1a3c5e;padding:5% 6%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;text-align:center;min-height:550px;">
    <div>
      <div style="font-weight:bold;color:#1a3c5e;font-size:20px;letter-spacing:1.5px;margin-bottom:4%;">
        ITBEES GLOBAL
      </div>
      <div style="font-size:36px;color:#1a3c5e;text-transform:uppercase;margin-bottom:2%;font-weight:bold;">
        Certificate of Completion
      </div>
      <div style="height:2px;background:#d4af37;width:320px;margin:0 auto 3%;"></div>
      <div style="font-size:15px;color:#555;margin-bottom:3%;font-style:italic;">
        This is to certify that
      </div>
      <div style="font-size:32px;color:#d4af37;border-bottom:2px solid #d4af37;display:inline-block;padding:0 30px 4px;margin:1% 0;font-weight:600;">
        ${traineeName}
      </div>
      <div style="font-size:16px;color:#333;margin:3% 0 1%;">
        has successfully completed the course
      </div>
      <div style="font-size:24px;font-weight:bold;color:#1a3c5e;">
        ${courseName}
      </div>
    </div>
    <div>
      <div style="font-size:13px;color:#777;margin-bottom:5%;">
        Awarded on: ${awardedDate}
      </div>
      <div style="display:flex;justify-content:space-between;padding:0 10%;">
        <div style="border-top:1px solid #444;width:30%;padding-top:6px;font-size:12px;color:#555;font-weight:500;text-align:center;">
          Authorized Signature
        </div>
        <div style="border-top:1px solid #444;width:30%;padding-top:6px;font-size:12px;color:#555;font-weight:500;text-align:center;">
          Course Instructor
        </div>
      </div>
      <div style="margin-top:24px;font-size:11px;color:#aaa;">
        support@itbeesglobal.com &nbsp;|&nbsp; +91 9963186067 &nbsp;|&nbsp; www.itbeesglobal.com
      </div>
    </div>
  </div>
</body>
</html>
`;

const generateCertificatePdf = (traineeName, courseName, date) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 841.89, H = 595.28;
    const BLUE = '#1a3c5e', GOLD = '#d4af37';
    const awardedDate = date
      ? new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    // White background
    doc.rect(0, 0, W, H).fill('#ffffff');

    // Border — 12px solid #1a3c5e
    doc.rect(0, 0, W, H).lineWidth(24).stroke(BLUE);

    let y = H * 0.12;

    // ITBEES GLOBAL
    doc.font('Helvetica-Bold').fontSize(20).fillColor(BLUE)
       .text('ITBEES GLOBAL', 0, y, { align: 'center', width: W, characterSpacing: 1.5 });
    y += H * 0.09;

    // Certificate of Completion
    doc.font('Helvetica-Bold').fontSize(36).fillColor(BLUE)
       .text('Certificate of Completion', 0, y, { align: 'center', width: W });
    y += 48;

    // Gold underline
    doc.moveTo(W / 2 - 160, y).lineTo(W / 2 + 160, y).lineWidth(2).stroke(GOLD);
    y += H * 0.05;

    // This is to certify that
    doc.font('Helvetica-Oblique').fontSize(15).fillColor('#555555')
       .text('This is to certify that', 0, y, { align: 'center', width: W });
    y += H * 0.06;

    // Trainee name
    doc.font('Helvetica-Bold').fontSize(32).fillColor(GOLD)
       .text(traineeName, 0, y, { align: 'center', width: W });
    y += 42;

    // Gold underline below name
    const nameWidth = Math.min(doc.widthOfString(traineeName) + 60, 420);
    doc.moveTo(W / 2 - nameWidth / 2, y).lineTo(W / 2 + nameWidth / 2, y).lineWidth(1.5).stroke(GOLD);
    y += H * 0.05;

    // has successfully completed the course
    doc.font('Helvetica').fontSize(16).fillColor('#333333')
       .text('has successfully completed the course', 0, y, { align: 'center', width: W });
    y += H * 0.05;

    // Course name
    doc.font('Helvetica-Bold').fontSize(24).fillColor(BLUE)
       .text(courseName, 0, y, { align: 'center', width: W });
    y += H * 0.1;

    // Awarded date
    doc.font('Helvetica').fontSize(13).fillColor('#777777')
       .text(`Awarded on: ${awardedDate}`, 0, y, { align: 'center', width: W });
    y += H * 0.12;

    // Signature lines
    const sig1X = W * 0.2, sig2X = W * 0.6, sigW = W * 0.2;
    doc.moveTo(sig1X, y).lineTo(sig1X + sigW, y).lineWidth(1).stroke('#444444');
    doc.moveTo(sig2X, y).lineTo(sig2X + sigW, y).lineWidth(1).stroke('#444444');

    doc.font('Helvetica').fontSize(12).fillColor('#555555')
       .text('Authorized Signature', sig1X, y + 6, { width: sigW, align: 'center' })
       .text('Course Instructor', sig2X, y + 6, { width: sigW, align: 'center' });

    doc.end();
  });
};

const sendCertificate = async ({ to, traineeName, courseName, date }) => {
  const awardedDate = date
    ? new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  const body = `<html><body style="font-family:'Segoe UI',sans-serif;text-align:center;padding:40px;background:#f0f0f0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:8px;">
    <h2 style="color:#1a3c5e;">Congratulations, ${traineeName}!</h2>
    <p style="color:#555;">Please find your <strong>Certificate of Completion</strong> for <strong>${courseName}</strong> attached to this email.</p>
    <p style="color:#777;font-size:13px;">Thank you for choosing ITBEES Global for your professional development.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <p style="color:#aaa;font-size:11px;">support@itbeesglobal.com &nbsp;|&nbsp; +91 9963186067 &nbsp;|&nbsp; www.itbeesglobal.com</p>
  </div>
</body></html>`;

  const pdfBuffer = await generateCertificatePdf(traineeName, courseName, date);
  const filename = `Certificate_${traineeName.replace(/\s+/g, '_')}.pdf`;
  const subject = `Certificate of Completion — ${courseName} | ITBEES Global`;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: body,
      attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }]
    });
    logger.info(`Certificate email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Certificate email failed for ${to}: ${error.message}`);
    throw error;
  }
};

const previewCertificate = (traineeName, courseName, date) => {
  const awardedDate = date
    ? new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  return buildCertificateHtml(traineeName, courseName, awardedDate);
};

module.exports = { sendCertificate, generateCertificatePdf, previewCertificate };
