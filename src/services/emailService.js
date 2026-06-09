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

const sendEmail = async (to, subject, text, html, attachments = []) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
      attachments
    });
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    throw error;
  }
};

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

    // Border — 12px solid #1a3c5e (matches border:12px solid #1a3c5e)
    doc.rect(0, 0, W, H).lineWidth(24).stroke(BLUE);

    const padX = W * 0.06, padY = H * 0.05;
    let y = padY;

    // ITBEES GLOBAL — font-weight:bold, font-size:20px, color:#1a3c5e, letter-spacing:1.5px
    doc.font('Helvetica-Bold').fontSize(20).fillColor(BLUE)
       .text('ITBEES GLOBAL', 0, y, { align: 'center', width: W, characterSpacing: 1.5 });
    y += H * 0.08;

    // Certificate of Completion — font-size:36px, uppercase, bold
    doc.font('Helvetica-Bold').fontSize(36).fillColor(BLUE)
       .text('Certificate of Completion', 0, y, { align: 'center', width: W });
    y += 48;

    // Gold underline — width:320px, height:2px
    doc.moveTo(W / 2 - 160, y).lineTo(W / 2 + 160, y).lineWidth(2).stroke(GOLD);
    y += H * 0.04;

    // "This is to certify that" — italic, #555
    doc.font('Helvetica-Oblique').fontSize(15).fillColor('#555555')
       .text('This is to certify that', 0, y, { align: 'center', width: W });
    y += H * 0.05;

    // Trainee name — font-size:32px, color:#d4af37, bold
    doc.font('Helvetica-Bold').fontSize(32).fillColor(GOLD)
       .text(traineeName, 0, y, { align: 'center', width: W });
    y += 42;

    // Gold underline below name
    const nameWidth = Math.min(doc.widthOfString(traineeName) + 60, 420);
    doc.moveTo(W / 2 - nameWidth / 2, y).lineTo(W / 2 + nameWidth / 2, y).lineWidth(1.5).stroke(GOLD);
    y += H * 0.04;

    // "has successfully completed the course" — font-size:16px, #333
    doc.font('Helvetica').fontSize(16).fillColor('#333333')
       .text('has successfully completed the course', 0, y, { align: 'center', width: W });
    y += H * 0.04;

    // Course name — font-size:24px, bold, #1a3c5e
    doc.font('Helvetica-Bold').fontSize(24).fillColor(BLUE)
       .text(courseName, 0, y, { align: 'center', width: W });

    // Awarded date — font-size:13px, #777, near bottom
    const footerY = H - 120;
    doc.font('Helvetica').fontSize(13).fillColor('#777777')
       .text(`Awarded on: ${awardedDate}`, 0, footerY, { align: 'center', width: W });

    // Signature lines — two at 20% and 60% x, matching padding:0 10%
    const sig1X = W * 0.2, sig2X = W * 0.6, sigW = W * 0.2, sigY = footerY + 30;
    doc.moveTo(sig1X, sigY).lineTo(sig1X + sigW, sigY).lineWidth(1).stroke('#444444');
    doc.moveTo(sig2X, sigY).lineTo(sig2X + sigW, sigY).lineWidth(1).stroke('#444444');

    doc.font('Helvetica').fontSize(12).fillColor('#555555')
       .text('Authorized Signature', sig1X, sigY + 6, { width: sigW, align: 'center' })
       .text('Course Instructor', sig2X, sigY + 6, { width: sigW, align: 'center' });

    // Contact footer — font-size:11px, #aaa
    doc.font('Helvetica').fontSize(11).fillColor('#aaaaaa')
       .text('support@itbeesglobal.com  |  +91 9963186067  |  www.itbeesglobal.com', 0, H - 30, { align: 'center', width: W });

    doc.end();
  });
};

const sendCertificateEmail = async ({ to, subject, traineeName, courseName, date, html }) => {
  const body = html || `<html><body style="font-family:Arial,sans-serif;text-align:center;padding:40px">
    <h2>${traineeName} — ${courseName}</h2>
    <p>Please find your certificate of completion attached.</p>
    <p style="color:#888;font-size:12px">ITBEES Global</p>
  </body></html>`;

  const pdfBuffer = await generateCertificatePdf(traineeName, courseName, date);
  const filename = `Certificate_${traineeName.replace(/\s+/g, '_')}.pdf`;

  return sendEmail(to, subject, '', body, [
    { filename, content: pdfBuffer, contentType: 'application/pdf' }
  ]);
};

module.exports = { sendEmail, sendCertificateEmail };


