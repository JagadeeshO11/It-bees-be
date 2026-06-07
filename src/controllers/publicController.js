const prisma = require('../utils/prisma');
const { sendOtp, verifyOtp } = require('../services/otpService');
const { createOrder, verifySignature } = require('../services/razorpayService');
const { generateInvoicePdf } = require('../services/invoiceService');
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');

// Courses
const getCourses = async (req, res, next) => {
  try {
    const courses = await prisma.course.findMany({
      where: { deletedAt: null, isArchived: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

// Jobs
const getJobs = async (req, res, next) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { deletedAt: null, isArchived: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

const getJobById = async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    });
    if (!job || job.deletedAt || job.isArchived) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

const applyForJob = async (req, res, next) => {
  try {
    const { jobId, name, email, phone, location, skills, experience, education } = req.body;

    if (!req.files || !req.files.resume) {
      return res.status(400).json({ success: false, message: 'Resume file is required' });
    }

    // Duplicate check — same email + same job
    const existing = await prisma.jobApplication.findFirst({
      where: { email, jobId, deletedAt: null }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already applied for this job.' });
    }

    const resume = req.files.resume;
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(resume.mimetype)) {
      return res.status(400).json({ success: false, message: 'Invalid file type. Only PDF, DOC, and DOCX are allowed.' });
    }

    // Upload resume to Cloudinary (works on serverless — no local filesystem needed)
    const cloudinary = require('cloudinary').v2;
    const resumeUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'itbees/resumes', resource_type: 'raw', public_id: `${Date.now()}_${resume.name.replace(/\s/g, '_')}` },
        (error, result) => { if (error) return reject(error); resolve(result.secure_url); }
      );
      stream.end(resume.data);
    });

    const job = await prisma.job.findUnique({ where: { id: jobId } });

    const application = await prisma.jobApplication.create({
      data: { jobId, name, email, phone, location, skills, experience, education, resumePath: resumeUrl }
    });

    const applicantHtml = `
      <div style="font-family:sans-serif;padding:24px;max-width:560px">
        <h2 style="color:#023295">ITBEES GLOBAL — Application Received</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for applying for the <strong>${job?.title || 'open'}</strong> position. Our team will review your profile and get back to you within 3–5 business days.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="font-size:12px;color:#999">ITBEES Global Pvt. Ltd. | Gachibowli, Hyderabad</p>
      </div>`;

    const adminHtml = `
      <div style="font-family:sans-serif;padding:24px">
        <h2 style="color:#023295">New Job Application — ${job?.title}</h2>
        <table style="font-size:13px;border-collapse:collapse;width:100%">
          <tr><td style="padding:6px 0;color:#666">Name</td><td><strong>${name}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666">Email</td><td>${email}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Phone</td><td>${phone}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Location</td><td>${location}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Experience</td><td>${experience}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Education</td><td>${education}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Skills</td><td>${skills}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Resume</td><td><a href="${resumeUrl}">View Resume</a></td></tr>
        </table>
      </div>`;

    await Promise.allSettled([
      sendEmail(email, `Application Received — ${job?.title || 'Position'}`, 'Application Received', applicantHtml),
      sendEmail(process.env.ADMIN_EMAIL, `New Application: ${job?.title} — ${name}`, 'New Job Application', adminHtml)
    ]);

    res.status(201).json({ success: true, message: 'Application submitted successfully', data: application });
  } catch (error) {
    next(error);
  }
};

// Inquiries
const submitInquiry = async (req, res, next) => {
  try {
    const { name, email, phone, company, subject, message } = req.body;

    const inquiry = await prisma.inquiry.create({
      data: { name, email, phone, subject, message }
    });

    const adminHtml = `
      <div style="font-family:sans-serif;padding:24px;max-width:600px">
        <h2 style="color:#023295;margin-bottom:4px">New Contact Enquiry</h2>
        <p style="font-size:12px;color:#999;margin-bottom:20px">Received via ITBEES Global website contact form</p>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#666;width:120px">Name</td><td style="font-weight:600;color:#111">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Email</td><td><a href="mailto:${email}" style="color:#023295">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666">Phone</td><td>${phone || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Company</td><td>${company || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Subject</td><td>${subject || 'General Enquiry'}</td></tr>
          <tr><td style="padding:8px 0;color:#666;vertical-align:top">Message</td><td style="line-height:1.7">${message}</td></tr>
        </table>
        <div style="margin-top:24px">
          <a href="mailto:${email}" style="background:#023295;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600">Reply to ${name}</a>
        </div>
      </div>`;

    // Confirmation email to sender
    const senderHtml = `
      <div style="font-family:sans-serif;padding:24px;max-width:560px">
        <h2 style="color:#023295">Thank you, ${name}!</h2>
        <p>We have received your message and will get back to you within <strong>1 business day</strong>.</p>
        <p style="color:#666;font-size:13px">Your message:<br/><em style="color:#333">${message}</em></p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="font-size:12px;color:#999">ITBEES Global Pvt. Ltd. | Gachibowli, Hyderabad | support@itbeesglobal.com</p>
      </div>`;

    await Promise.allSettled([
      sendEmail(process.env.ADMIN_EMAIL, `New Enquiry: ${subject || 'General'} — ${name}`, message, adminHtml),
      sendEmail(email, `We received your message — ITBEES Global`, `Thank you ${name}, we'll respond within 1 business day.`, senderHtml)
    ]);

    res.status(201).json({ success: true, message: 'Inquiry submitted successfully', data: inquiry });
  } catch (error) {
    next(error);
  }
};

// OTP
const requestPurchaseOtp = async (req, res, next) => {
  try {
    await sendOtp(req.body.email, 'PURCHASE');
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    next(error);
  }
};

// Course Purchase
const initiatePurchase = async (req, res, next) => {
  try {
    const { courseId, name, email, phone, address, city, state, pincode, otp } = req.body;

    // 1. Check if email already registered for this course
    const existing = await prisma.coursePurchase.findFirst({
      where: { email, courseId, status: 'SUCCESS' }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'This email is already registered for this course.' });
    }

    // 2. Verify OTP
    await verifyOtp(email, otp, 'PURCHASE');

    // 3. Get Course
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.deletedAt || course.isArchived) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // 4. Create Purchase Record
    const purchase = await prisma.coursePurchase.create({
      data: { courseId, name, email, phone, address, city, state, pincode, amount: course.price, status: 'PENDING' }
    });

    // 5. Create Razorpay Order
    const razorpayOrder = await createOrder(course.price, 'INR', purchase.id.slice(0, 40));

    // 6. Update Purchase with Razorpay Order ID
    await prisma.coursePurchase.update({
      where: { id: purchase.id },
      data: { razorpayOrderId: razorpayOrder.id }
    });

    res.json({
      success: true,
      data: {
        purchaseId: purchase.id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purchaseId } = req.body;

    // 1. Verify Signature
    const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // 2. Update Purchase and Payment
    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.coursePurchase.update({
        where: { id: purchaseId },
        data: {
          status: 'SUCCESS',
          paymentId: razorpay_payment_id
        },
        include: { course: true }
      });

      await tx.payment.create({
        data: {
          razorpayOrderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          amount: p.amount,
          status: 'SUCCESS',
          method: 'Razorpay'
        }
      });

      return p;
    });

    // 3. Generate Invoice as Buffer
    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `ITB${String(invoiceCount + 1).padStart(3, '0')}`;
    const pdfBuffer = await generateInvoicePdf(purchase, invoiceNumber);

    await prisma.invoice.create({
      data: {
        purchaseId: purchase.id,
        invoiceNumber,
        filePath: invoiceNumber  // store invoice number as reference
      }
    });

    // 4. Send Email with Invoice buffer as attachment
    const subject = `Order Confirmation & Invoice - ${purchase.course.title}`;
    const html = `<h3>Thank you for your purchase, ${purchase.name}!</h3><p>Attached is your invoice for the course: <b>${purchase.course.title}</b>.</p>`;
    
    const attachments = [{
      filename: `Invoice_${invoiceNumber}.pdf`,
      content: pdfBuffer
    }];

    await sendEmail(purchase.email, subject, 'Thank you for your purchase!', html, attachments);
    await sendEmail(process.env.ADMIN_EMAIL, `New Purchase: ${purchase.course.title}`, `New purchase by ${purchase.name}`, html, attachments);

    res.json({
      success: true,
      message: 'Payment verified and invoice sent',
      data: {
        name: purchase.name,
        email: purchase.email,
        phone: purchase.phone,
        course: purchase.course.title,
        amount: purchase.amount,
        invoiceNumber,
        paymentId: razorpay_payment_id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Assessments
const getAssessments = async (req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { deletedAt: null, isArchived: false },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: assessments });
  } catch (error) {
    next(error);
  }
};

const getAssessmentDetails = async (req, res, next) => {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: req.params.id },
      include: { 
        questions: {
          select: {
            id: true,
            questionText: true,
            options: true,
            marks: true
          }
        }
      }
    });

    if (!assessment || assessment.deletedAt || assessment.isArchived) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    res.json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
};

const submitAssessment = async (req, res, next) => {
  try {
    const { assessmentId, name, email, phone, answers, timeTaken } = req.body;

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questions: true }
    });

    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

    let totalScore = 0;
    const processedAnswers = answers.map(ans => {
      const question = assessment.questions.find(q => q.id === ans.questionId);
      const isCorrect = question ? question.correctAnswer === ans.selectedAnswer : false;
      if (isCorrect) totalScore += question.marks;
      return {
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer,
        isCorrect
      };
    });

    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId,
        name,
        email,
        phone,
        score: totalScore,
        timeTaken,
        answers: {
          create: processedAnswers
        }
      }
    });

    res.status(201).json({ success: true, data: { attemptId: attempt.id, score: totalScore } });
  } catch (error) {
    next(error);
  }
};

// Templates
const getTemplates = async (req, res, next) => {
  try {
    const templates = await prisma.template.findMany({
      where: { deletedAt: null, isArchived: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

const getTemplateById = async (req, res, next) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        createdAt: true,
      }
    });
    if (!template || template.deletedAt || template.isArchived) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

const initiateTemplatePurchase = async (req, res, next) => {
  try {
    const { templateId, name, email, phone, address, city, state, pincode, otp } = req.body;

    const existing = await prisma.templatePurchase.findFirst({
      where: { email, templateId, status: 'SUCCESS' }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'This email has already purchased this template.' });
    }

    await verifyOtp(email, otp, 'PURCHASE');

    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template || template.deletedAt || template.isArchived) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const purchase = await prisma.templatePurchase.create({
      data: { templateId, name, email, phone, address, city, state, pincode, amount: template.price, status: 'PENDING' }
    });

    const razorpayOrder = await createOrder(template.price, 'INR', purchase.id.slice(0, 40));

    await prisma.templatePurchase.update({
      where: { id: purchase.id },
      data: { razorpayOrderId: razorpayOrder.id }
    });

    res.json({
      success: true,
      data: {
        purchaseId: purchase.id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    next(error);
  }
};

const verifyTemplatePayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purchaseId } = req.body;

    const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.templatePurchase.update({
        where: { id: purchaseId },
        data: {
          status: 'SUCCESS',
          paymentId: razorpay_payment_id
        },
        include: { template: true }
      });

      await tx.payment.create({
        data: {
          razorpayOrderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
          amount: p.amount,
          status: 'SUCCESS',
          method: 'Razorpay'
        }
      });

      return p;
    });

    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `ITB${String(invoiceCount + 1).padStart(3, '0')}`;
    const pdfBuffer = await generateInvoicePdf(purchase, invoiceNumber);

    await prisma.invoice.create({
      data: {
        templatePurchaseId: purchase.id,
        invoiceNumber,
        filePath: invoiceNumber
      }
    });

    const subject = `Order Confirmation & Invoice - ${purchase.template.name}`;
    const html = `
      <h3>Thank you for your purchase, ${purchase.name}!</h3>
      <p>Attached is your invoice for the template: <b>${purchase.template.name}</b>.</p>
      <p>You can also download your resource directly using this link:</p>
      <p><a href="${purchase.template.templateUrl}" style="background:#023295;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;font-weight:bold;">Download Template</a></p>
      <p>Or copy and paste this URL into your browser:</p>
      <p>${purchase.template.templateUrl}</p>
    `;

    const attachments = [{
      filename: `Invoice_${invoiceNumber}.pdf`,
      content: pdfBuffer
    }];

    await sendEmail(purchase.email, subject, 'Thank you for your purchase!', html, attachments);
    await sendEmail(process.env.ADMIN_EMAIL, `New Template Purchase: ${purchase.template.name}`, `New purchase by ${purchase.name}`, html, attachments);

    res.json({
      success: true,
      message: 'Payment verified, invoice sent, and download available',
      data: {
        name: purchase.name,
        email: purchase.email,
        phone: purchase.phone,
        templateName: purchase.template.name,
        amount: purchase.amount,
        invoiceNumber,
        paymentId: razorpay_payment_id,
        downloadUrl: purchase.template.templateUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getJobs,
  getJobById,
  applyForJob,
  submitInquiry,
  requestPurchaseOtp,
  initiatePurchase,
  verifyPayment,
  getTemplates,
  getTemplateById,
  initiateTemplatePurchase,
  verifyTemplatePayment,
  getAssessments,
  getAssessmentDetails,
  submitAssessment
};
