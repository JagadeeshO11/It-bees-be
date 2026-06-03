const prisma = require('../utils/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { logAction } = require('../services/auditService');
const { uploadImage } = require('../services/cloudinaryService');
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

// Courses
const createCourse = async (req, res, next) => {
  try {
    const course = await prisma.course.create({ data: req.body });
    await logAction({ adminId: req.admin.id, action: 'CREATE', entity: 'Course', entityId: course.id, newValue: course });
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const oldCourse = await prisma.course.findUnique({ where: { id: req.params.id } });
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: req.body
    });
    await logAction({ adminId: req.admin.id, action: 'UPDATE', entity: 'Course', entityId: course.id, oldValue: oldCourse, newValue: course });
    res.json({ success: true, data: course });
  } catch (error) {
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
    const purchases = await prisma.coursePurchase.findMany({
      where: { deletedAt: null },
      include: { course: true, invoice: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: purchases });
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

module.exports = {
  login, logout, refresh,
  createCourse, updateCourse, archiveCourse, deleteCourse,
  createJob, updateJob, deleteJob,
  getInquiries, archiveInquiry,
  getPurchases,
  getApplications, updateApplicationStatus, updateApplication, deleteApplication,
  getAuditLogs,
  createAssessmentCategory, createAssessment, addQuestion, getAssessmentAttempts,
  uploadImage: uploadImageController
};
