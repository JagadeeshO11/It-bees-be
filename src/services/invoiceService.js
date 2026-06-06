const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

const BRAND_BLUE = '#023295';
const BRAND_LIME = '#68ef3f';
const DARK = '#1a1a2e';
const MUTED = '#666666';
const LIGHT_BG = '#f7f9fc';
const BORDER = '#e2e8f0';

// Returns a Buffer instead of writing to disk — works on serverless
const generateInvoicePdf = (purchase, invoiceNumber) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 595.28;
      const M = 40;

      // ── Header Banner ──────────────────────────────────────────
      doc.rect(0, 0, W, 90).fill(BRAND_BLUE);

      // Logo skipped on serverless (no local file access)
      const textStartX = M;
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
         .text('ITBEES GLOBAL PVT. LTD.', textStartX, 22);
      doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.75)')
         .text('Gachibowli, Hyderabad, Telangana - 500032', textStartX, 46)
         .text('support@itbeesglobal.com  |  +91 9963186067  |  www.itbeesglobal.com', textStartX, 58);

      // Invoice label top-right
      doc.font('Helvetica-Bold').fontSize(26).fillColor('rgba(255,255,255,0.15)')
         .text('INVOICE', W - 170, 18, { width: 130, align: 'right' });

      // ── Invoice Meta Row ────────────────────────────────────────
      doc.rect(0, 90, W, 48).fill(LIGHT_BG);
      doc.rect(0, 138, W, 1).fill(BORDER);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND_BLUE)
         .text('INVOICE NO.', M, 104);
      doc.font('Helvetica').fillColor(DARK)
         .text(invoiceNumber, M, 116);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND_BLUE)
         .text('DATE', 200, 104);
      doc.font('Helvetica').fillColor(DARK)
         .text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), 200, 116);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND_BLUE)
         .text('PAYMENT ID', 340, 104);
      doc.font('Helvetica').fillColor(DARK).fontSize(8)
         .text(purchase.paymentId || '—', 340, 116, { width: 215 });

      // ── Billing Info ────────────────────────────────────────────
      const billingTop = 158;

      // Bill To box
      doc.rect(M, billingTop, 240, 130).fill('#ffffff').stroke(BORDER);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_BLUE)
         .text('BILL TO', M + 12, billingTop + 12);
      doc.moveTo(M + 12, billingTop + 24).lineTo(M + 60, billingTop + 24).lineWidth(1).stroke(BRAND_LIME);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK)
         .text(purchase.name, M + 12, billingTop + 32);
      doc.font('Helvetica').fontSize(9).fillColor(MUTED)
         .text(purchase.email, M + 12, billingTop + 48)
         .text(purchase.phone, M + 12, billingTop + 62)
         .text(purchase.address || '', M + 12, billingTop + 76, { width: 216 })
         .text(`${purchase.city || ''}${purchase.city && purchase.state ? ', ' : ''}${purchase.state || ''} - ${purchase.pincode || ''}`, M + 12, billingTop + 92);

      // Details box
      const cdX = M + 260;
      doc.rect(cdX, billingTop, 255, 130).fill('#ffffff').stroke(BORDER);
      if (purchase.template) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_BLUE)
           .text('TEMPLATE DETAILS', cdX + 12, billingTop + 12);
        doc.moveTo(cdX + 12, billingTop + 24).lineTo(cdX + 80, billingTop + 24).lineWidth(1).stroke(BRAND_LIME);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK)
           .text(purchase.template.name, cdX + 12, billingTop + 32, { width: 231 });
        doc.font('Helvetica').fontSize(9).fillColor(MUTED)
           .text(`Description: ${purchase.template.description.substring(0, 100)}...`, cdX + 12, billingTop + 60, { width: 231 });
      } else {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_BLUE)
           .text('COURSE DETAILS', cdX + 12, billingTop + 12);
        doc.moveTo(cdX + 12, billingTop + 24).lineTo(cdX + 80, billingTop + 24).lineWidth(1).stroke(BRAND_LIME);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK)
           .text(purchase.course.title, cdX + 12, billingTop + 32, { width: 231 });
        doc.font('Helvetica').fontSize(9).fillColor(MUTED)
           .text(`Category: ${purchase.course.category}`, cdX + 12, billingTop + 60)
           .text(`Duration: ${purchase.course.duration}`, cdX + 12, billingTop + 74)
           .text(`Hours: ${purchase.course.hours} hrs`, cdX + 12, billingTop + 88);
      }

      // ── Items Table ─────────────────────────────────────────────
      const tableTop = billingTop + 148;

      // Table header
      doc.rect(M, tableTop, W - M * 2, 28).fill(BRAND_BLUE);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
         .text('#', M + 10, tableTop + 9)
         .text('DESCRIPTION', M + 30, tableTop + 9)
         .text('INFO', M + 310, tableTop + 9)
         .text('QTY', M + 390, tableTop + 9)
         .text('AMOUNT', M + 430, tableTop + 9);

      // Row 1
      const rowTop = tableTop + 28;
      doc.rect(M, rowTop, W - M * 2, 40).fill('#ffffff').stroke(BORDER);
      doc.font('Helvetica').fontSize(9).fillColor(DARK)
         .text('1', M + 10, rowTop + 14);
      if (purchase.template) {
        doc.font('Helvetica').fontSize(9).fillColor(DARK)
           .text(purchase.template.name, M + 30, rowTop + 8, { width: 270 })
           .text('Template file', M + 310, rowTop + 14, { width: 70 })
           .text('1', M + 390, rowTop + 14)
           .text(`INR ${Number(purchase.amount).toLocaleString('en-IN')}`, M + 425, rowTop + 14);
        doc.font('Helvetica').fontSize(8).fillColor(MUTED)
           .text('Premium Digital Resource', M + 30, rowTop + 24, { width: 270 });
      } else {
        doc.font('Helvetica').fontSize(9).fillColor(DARK)
           .text(purchase.course.title, M + 30, rowTop + 8, { width: 270 })
           .text(purchase.course.duration, M + 310, rowTop + 14, { width: 70 })
           .text('1', M + 390, rowTop + 14)
           .text(`INR ${Number(purchase.amount).toLocaleString('en-IN')}`, M + 425, rowTop + 14);
        doc.font('Helvetica').fontSize(8).fillColor(MUTED)
           .text(purchase.course.category, M + 30, rowTop + 24, { width: 270 });
      }

      // ── Summary ─────────────────────────────────────────────────
      const summaryTop = rowTop + 48;
      const summaryX = M + 320;

      doc.rect(summaryX, summaryTop, W - M - summaryX, 32).fill(LIGHT_BG).stroke(BORDER);
      doc.font('Helvetica').fontSize(9).fillColor(MUTED)
         .text('Subtotal', summaryX + 10, summaryTop + 10);
      doc.font('Helvetica').fillColor(DARK)
         .text(`INR ${Number(purchase.amount).toLocaleString('en-IN')}`, summaryX + 10, summaryTop + 10, { align: 'right', width: W - M - summaryX - 20 });

      doc.rect(summaryX, summaryTop + 32, W - M - summaryX, 32).fill(LIGHT_BG).stroke(BORDER);
      doc.font('Helvetica').fontSize(9).fillColor(MUTED)
         .text('Tax (0% — Training Exempt)', summaryX + 10, summaryTop + 42);
      doc.font('Helvetica').fillColor(DARK)
         .text('INR 0', summaryX + 10, summaryTop + 42, { align: 'right', width: W - M - summaryX - 20 });

      doc.rect(summaryX, summaryTop + 64, W - M - summaryX, 36).fill(BRAND_BLUE);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
         .text('TOTAL PAID', summaryX + 10, summaryTop + 76);
      doc.font('Helvetica-Bold').fillColor(BRAND_LIME)
         .text(`INR ${Number(purchase.amount).toLocaleString('en-IN')}`, summaryX + 10, summaryTop + 76, { align: 'right', width: W - M - summaryX - 20 });

      // ── Status Badge ────────────────────────────────────────────
      doc.rect(M, summaryTop + 8, 110, 26).fill('#e8f5e9').stroke('#a5d6a7');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#2e7d32')
         .text('✓  PAID', M + 22, summaryTop + 15);

      // ── Bank / Payment Note ─────────────────────────────────────
      const noteTop = summaryTop + 120;
      doc.rect(M, noteTop, W - M * 2, 52).fill(LIGHT_BG).stroke(BORDER);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_BLUE)
         .text('PAYMENT NOTE', M + 12, noteTop + 10);
      doc.font('Helvetica').fontSize(8).fillColor(MUTED)
         .text('Payment received via Razorpay. This is an electronically generated invoice and is valid without a physical signature.', M + 12, noteTop + 24, { width: W - M * 2 - 24 });

      // ── Authorised Signatory ────────────────────────────────────
      const sigTop = noteTop + 68;
      const sigX = W - M - 180;
      doc.rect(sigX, sigTop, 180, 80).fill('#ffffff').stroke(BORDER);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_BLUE)
         .text('AUTHORISED SIGNATORY', sigX + 10, sigTop + 8);
      doc.moveTo(sigX + 10, sigTop + 20).lineTo(sigX + 100, sigTop + 20).lineWidth(1).stroke(BRAND_LIME);
      // Signature text styled as handwriting approximation
      doc.font('Helvetica-BoldOblique').fontSize(14).fillColor(DARK)
         .text('K Vishnupriya', sigX + 10, sigTop + 28);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
         .text('KALLURI VISHNU PRIYA', sigX + 10, sigTop + 50);
      doc.font('Helvetica').fontSize(8).fillColor(MUTED)
         .text('Director', sigX + 10, sigTop + 62);

      // ── Footer ──────────────────────────────────────────────────
      doc.rect(0, 780, W, 62).fill(BRAND_BLUE);
      doc.font('Helvetica').fontSize(8).fillColor('rgba(255,255,255,0.6)')
         .text('Thank you for choosing ITBEES Global for your professional development.', 0, 795, { align: 'center', width: W })
         .text('For support, contact support@itbeesglobal.com  |  +91 9963186067', 0, 810, { align: 'center', width: W });
      doc.font('Helvetica-Bold').fontSize(7).fillColor('rgba(255,255,255,0.35)')
         .text('ITBEES GLOBAL PVT. LTD.  ·  Gachibowli, Hyderabad, Telangana 500032  ·  GST: PENDING', 0, 826, { align: 'center', width: W });

      doc.end();
    } catch (error) {
      logger.error(`Invoice Generation Error: ${error.message}`);
      reject(error);
    }
  });
};

module.exports = { generateInvoicePdf };
