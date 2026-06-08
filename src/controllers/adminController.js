const prisma = require('../utils/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { logAction } = require('../services/auditService');
const { uploadImage, uploadFile } = require('../services/cloudinaryService');
const { sendOtp, verifyOtp } = require('../services/otpService');
const logger = require('../utils/logger');

// Auth
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin || admin.deletedAt) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    await logAction({ adminId: admin.id, action: 'LOGIN', entity: 'Admin' });

    res.json({
      success: true,
      data: {
        admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await prisma.adminSession.deleteMany({ where: { refreshToken } });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const session = await prisma.adminSession.findUnique({
      where: { refreshToken },
      include: { admin: true }
    });

    if (!session || session.expiresAt < new Date() || session.admin.deletedAt) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const accessToken = generateAccessToken(session.admin);
    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
 * PASSWORD RESET FLOW (admin)
 * ============================================================
 * 1) forgotPassword  — admin enters email
 *      → if the email belongs to a real admin we send a 6-digit OTP
 *        to that address and respond with a generic success message
 *      → we ALWAYS return the same success message whether the email
 *        is registered or not, to avoid leaking which addresses are
 *        admin accounts
 *
 * 2) verifyOtp       — admin submits the 6-digit OTP they received
 *      → we mark the OTP record as verified
 *
 * 3) resetPassword   — admin submits the new password (plus the OTP
 *      again, to be safe) and we update the Admin row's password hash
 * ============================================================ */

const PASSWORD_RESET_TYPE = 'ADMIN_PASSWORD_RESET';

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Look up the admin but do NOT leak whether they exist.
    const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });

    if (admin && !admin.deletedAt) {
      try {
        await sendOtp(normalizedEmail, PASSWORD_RESET_TYPE);
        logger.info(`[Auth] Password reset OTP sent to admin ${admin.email}`);
      } catch (emailErr) {
        // Don't surface email-send failures to the client (avoids enumeration)
        logger.error(`[Auth] Failed to send password reset OTP: ${emailErr.message}`);
      }
    } else {
      // No admin with that email — still pretend we sent something so
      // an attacker can't enumerate which addresses are admin accounts.
      logger.warn(`[Auth] Password reset requested for unknown / deleted admin: ${normalizedEmail}`);
    }

    return res.json({
      success: true,
      message: 'If an account exists for that email, a verification code has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

const verifyPasswordResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    await verifyOtp(normalizedEmail, String(otp || ''), PASSWORD_RESET_TYPE);
    return res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Re-verify the OTP (defense in depth — prevents a stale "verified" flag
    // from being reused by anyone other than the original requester).
    await verifyOtp(normalizedEmail, String(otp || ''), PASSWORD_RESET_TYPE);

    const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
    if (!admin || admin.deletedAt) {
      const err = new Error('Account not found');
      err.status = 404;
      throw err;
    }

    const hashed = await hashPassword(newPassword);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashed },
    });

    // Invalidate all existing sessions for this admin so a hijacker can't
    // continue using the old token after the password was reset.
    await prisma.adminSession.deleteMany({ where: { adminId: admin.id } });

    await logAction({ adminId: admin.id, action: 'PASSWORD_RESET', entity: 'Admin' });
    logger.info(`[Auth] Password reset successful for admin ${admin.email}`);

    return res.json({ success: true, message: 'Password has been reset successfully. Please log in.' });
  } catch (error) {
    next(error);
  }
};

// Courses
const getCourses = async (req, res, next) => {
  try {
    const courses = await prisma.course.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id }
    });
    if (!course || course.deletedAt) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

const createCourse = async (req, res, next) => {
  try {
    console.log('--- CREATE COURSE TRACE ---');
    console.log('Initial req.body:', JSON.stringify(req.body, null, 2));

    // Normalize templateUrl: trim and convert empty strings to null
    if (typeof req.body.templateUrl === 'string') {
      req.body.templateUrl = req.body.templateUrl.trim() || null;
    }
    // Map `template` to `templateUrl` if provided
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'template')) {
      if (!req.body.templateUrl) req.body.templateUrl = req.body.template;
      delete req.body.template;
    }
    
    console.log('Processed req.body:', JSON.stringify(req.body, null, 2));

    const course = await prisma.course.create({ data: req.body });
    console.log('Prisma response:', JSON.stringify(course, null, 2));
    
    await logAction({ adminId: req.admin.id, action: 'CREATE', entity: 'Course', entityId: course.id, newValue: course });
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    console.error('CREATE COURSE ERROR:', error);
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    console.log('--- UPDATE COURSE TRACE ---');
    console.log('Course ID:', req.params.id);
    console.log('Initial req.body:', JSON.stringify(req.body, null, 2));

    const oldCourse = await prisma.course.findUnique({ where: { id: req.params.id } });
    
    // Normalize templateUrl: trim and convert empty strings to null
    if (typeof req.body.templateUrl === 'string') {
      req.body.templateUrl = req.body.templateUrl.trim() || null;
    }
    // Map `template` to `templateUrl` if provided
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'template')) {
      if (!req.body.templateUrl) req.body.templateUrl = req.body.template;
      delete req.body.template;
    }

    console.log('Processed req.body:', JSON.stringify(req.body, null, 2));

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: req.body
    });
    console.log('Prisma response:', JSON.stringify(course, null, 2));

    await logAction({ adminId: req.admin.id, action: 'UPDATE', entity: 'Course', entityId: course.id, oldValue: oldCourse, newValue: course });
    res.json({ success: true, data: course });
  } catch (error) {
    console.error('UPDATE COURSE ERROR:', error);
    next(error);
  }
};

const archiveCourse = async (req, res, next) => {
  try {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { isArchived: true }
    });
    await logAction({ adminId: req.admin.id, action: 'ARCHIVE', entity: 'Course', entityId: course.id });
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() }
    });
    await logAction({ adminId: req.admin.id, action: 'DELETE', entity: 'Course', entityId: course.id });
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Jobs
const createJob = async (req, res, next) => {
  try {
    const job = await prisma.job.create({ data: req.body });
    await logAction({ adminId: req.admin.id, action: 'CREATE', entity: 'Job', entityId: job.id, newValue: job });
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

const updateJob = async (req, res, next) => {
  try {
    const oldJob = await prisma.job.findUnique({ where: { id: req.params.id } });
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: req.body
    });
    await logAction({ adminId: req.admin.id, action: 'UPDATE', entity: 'Job', entityId: job.id, oldValue: oldJob, newValue: job });
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() }
    });
    await logAction({ adminId: req.admin.id, action: 'DELETE', entity: 'Job', entityId: job.id });
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Inquiries
const getInquiries = async (req, res, next) => {
  try {
    const inquiries = await prisma.inquiry.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: inquiries });
  } catch (error) {
    next(error);
  }
};

const archiveInquiry = async (req, res, next) => {
  try {
    const inquiry = await prisma.inquiry.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' }
    });
    await logAction({ adminId: req.admin.id, action: 'ARCHIVE', entity: 'Inquiry', entityId: inquiry.id });
    res.json({ success: true, data: inquiry });
  } catch (error) {
    next(error);
  }
};

// Purchases & Payments
const getPurchases = async (req, res, next) => {
  try {
    const coursePurchases = await prisma.coursePurchase.findMany({
      where: { deletedAt: null },
      include: { course: true, invoice: true },
      orderBy: { createdAt: 'desc' }
    });

    const templatePurchases = await prisma.templatePurchase.findMany({
      where: { deletedAt: null },
      include: { template: true, invoice: true },
      orderBy: { createdAt: 'desc' }
    });

    const formattedCourses = coursePurchases.map(p => ({
      ...p,
      type: 'COURSE',
      itemTitle: p.course.title,
    }));

    const formattedTemplates = templatePurchases.map(p => ({
      ...p,
      type: 'TEMPLATE',
      itemTitle: p.template.name,
    }));

    const allPurchases = [...formattedCourses, ...formattedTemplates].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: allPurchases });
  } catch (error) {
    next(error);
  }
};

// Applications
const getApplications = async (req, res, next) => {
  try {
    const applications = await prisma.jobApplication.findMany({
      where: { deletedAt: null },
      include: { job: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    const app = await prisma.jobApplication.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });
    await logAction({ adminId: req.admin.id, action: 'UPDATE', entity: 'JobApplication', entityId: app.id, newValue: { status: req.body.status } });
    res.json({ success: true, data: app });
  } catch (error) {
    next(error);
  }
};

const updateApplication = async (req, res, next) => {
  try {
    const { name, email, phone, location, skills, experience, education } = req.body;
    const old = await prisma.jobApplication.findUnique({ where: { id: req.params.id } });
    const app = await prisma.jobApplication.update({
      where: { id: req.params.id },
      data: { name, email, phone, location, skills, experience, education }
    });
    await logAction({ adminId: req.admin.id, action: 'UPDATE', entity: 'JobApplication', entityId: app.id, oldValue: old, newValue: app });
    res.json({ success: true, data: app });
  } catch (error) {
    next(error);
  }
};

const deleteApplication = async (req, res, next) => {
  try {
    const app = await prisma.jobApplication.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() }
    });
    await logAction({ adminId: req.admin.id, action: 'DELETE', entity: 'JobApplication', entityId: app.id });
    res.json({ success: true, message: 'Application deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Audit Logs
const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

// Assessment Management
const createAssessmentCategory = async (req, res, next) => {
  try {
    const category = await prisma.assessmentCategory.create({ data: req.body });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const createAssessment = async (req, res, next) => {
  try {
    const assessment = await prisma.assessment.create({ data: req.body });
    res.status(201).json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
};

const addQuestion = async (req, res, next) => {
  try {
    const question = await prisma.assessmentQuestion.create({
      data: {
        assessmentId: req.params.assessmentId,
        ...req.body
      }
    });
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    next(error);
  }
};

const getAssessmentAttempts = async (req, res, next) => {
  try {
    const attempts = await prisma.assessmentAttempt.findMany({
      where: { assessmentId: req.params.assessmentId },
      include: { answers: { include: { question: true } } },
      orderBy: { submittedAt: 'desc' }
    });
    res.json({ success: true, data: attempts });
  } catch (error) {
    next(error);
  }
};

const uploadImageController = async (req, res, next) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }
    const file = req.files.image;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Invalid file type. Only JPEG, PNG, WEBP, GIF allowed.' });
    }
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File too large. Max 5MB allowed.' });
    }
    const url = await uploadImage(file.data, file.mimetype);
    res.json({ success: true, url });
  } catch (error) {
    next(error);
  }
};

const uploadTemplateController = async (req, res, next) => {
  try {
    const file = req.files?.template || req.files?.templateUrl;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No template file provided' });
    }
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (!allowed.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX allowed.' });
    }
    if (file.size > 20 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File too large. Max 20MB allowed.' });
    }
    const url = await uploadFile(file.data, file.name);
    res.json({ success: true, url });
  } catch (error) {
    next(error);
  }
};

// Templates CRUD
const getTemplates = async (req, res, next) => {
  try {
    const templates = await prisma.template.findMany({
      where: { deletedAt: null },
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
      where: { id: req.params.id }
    });
    if (!template || template.deletedAt) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

const createTemplate = async (req, res, next) => {
  try {
    const template = await prisma.template.create({ data: req.body });
    await logAction({ adminId: req.admin.id, action: 'CREATE', entity: 'Template', entityId: template.id, newValue: template });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const oldTemplate = await prisma.template.findUnique({ where: { id: req.params.id } });
    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: req.body
    });
    await logAction({ adminId: req.admin.id, action: 'UPDATE', entity: 'Template', entityId: template.id, oldValue: oldTemplate, newValue: template });
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() }
    });
    await logAction({ adminId: req.admin.id, action: 'DELETE', entity: 'Template', entityId: template.id });
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login, logout, refresh,
  forgotPassword, verifyPasswordResetOtp, resetPassword,
  getCourses, getCourseById, createCourse, updateCourse, archiveCourse, deleteCourse,
  getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate,
  createJob, updateJob, deleteJob,
  getInquiries, archiveInquiry,
  getPurchases,
  getApplications, updateApplicationStatus, updateApplication, deleteApplication,
  getAuditLogs,
  createAssessmentCategory, createAssessment, addQuestion, getAssessmentAttempts,
  uploadImage: uploadImageController,
  uploadTemplate: uploadTemplateController
};
