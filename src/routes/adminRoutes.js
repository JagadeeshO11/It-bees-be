const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, authorize } = require('../middleware/auth');
const {
  loginSchema,
  courseSchema,
  templateSchema,
  jobSchema,
  assessmentSchema,
  questionSchema,
  emailSchema,
  otpSchema,
  resetPasswordSchema
} = require('../validators/adminValidator');

const validate = (schema) => (req, res, next) => {
  console.log('--- VALIDATION START ---');
  console.log('Method:', req.method, 'URL:', req.originalUrl);
  console.log('Body keys:', Object.keys(req.body));

  const result = schema.safeParse(req.body);
  if (!result.success) {
    console.error('VALIDATION FAILED:', JSON.stringify(result.error.errors, null, 2));
    console.error('Payload was:', JSON.stringify(req.body, null, 2));

    // Log types of fields that failed
    result.error.errors.forEach(err => {
      const field = err.path[0];
      if (field) {
        console.error(`Field "${field}" type:`, typeof req.body[field], 'Value:', req.body[field]);
      }
    });

    return res.status(400).json({ success: false, errors: result.error.errors });
  }
  console.log('VALIDATION SUCCESS');
  next();
};

/* ============================================================
 * Auth (public — no token required)
 * ============================================================ */
router.post('/login',            validate(loginSchema),          adminController.login);
router.post('/logout',                                                adminController.logout);
router.post('/refresh',                                                adminController.refresh);

// Password reset flow (public — no token required).
// These endpoints are intentionally placed BEFORE the `router.use(auth)`
// middleware below, so an admin who has forgotten their password can
// still reach them without already being logged in.
router.post('/forgot-password',   validate(emailSchema),         adminController.forgotPassword);
router.post('/verify-reset-otp',  validate(otpSchema),           adminController.verifyPasswordResetOtp);
router.post('/reset-password',    validate(resetPasswordSchema), adminController.resetPassword);

/* ============================================================
 * Protected Routes (require valid access token)
 * ============================================================ */
router.use(auth);

// Courses
router.get('/courses', adminController.getCourses);
router.get('/courses/:id', adminController.getCourseById);
router.post('/courses', validate(courseSchema), adminController.createCourse);
router.put('/courses/:id', validate(courseSchema), adminController.updateCourse);
router.patch('/courses/:id/archive', adminController.archiveCourse);
router.delete('/courses/:id', adminController.deleteCourse);

// Templates
router.get('/templates', adminController.getTemplates);
router.get('/templates/:id', adminController.getTemplateById);
router.post('/templates', validate(templateSchema), adminController.createTemplate);
router.put('/templates/:id', validate(templateSchema), adminController.updateTemplate);
router.delete('/templates/:id', adminController.deleteTemplate);

// Jobs
router.post('/jobs', validate(jobSchema), adminController.createJob);
router.put('/jobs/:id', validate(jobSchema), adminController.updateJob);
router.delete('/jobs/:id', adminController.deleteJob);

// Inquiries
router.get('/inquiries', adminController.getInquiries);
router.patch('/inquiries/:id/archive', adminController.archiveInquiry);

// Sales & Applications
router.get('/purchases', adminController.getPurchases);
router.get('/applications', adminController.getApplications);
router.put('/applications/:id', adminController.updateApplication);
router.patch('/applications/:id/status', adminController.updateApplicationStatus);
router.delete('/applications/:id', adminController.deleteApplication);

// Assessment Management
router.post('/assessments/categories', adminController.createAssessmentCategory);
router.post('/assessments', validate(assessmentSchema), adminController.createAssessment);
router.post('/assessments/:assessmentId/questions', validate(questionSchema), adminController.addQuestion);
router.get('/assessments/:assessmentId/attempts', adminController.getAssessmentAttempts);

// System
router.get('/audit-logs', authorize('SUPER_ADMIN'), adminController.getAuditLogs);

// Upload
router.post('/upload/image', adminController.uploadImage);
router.post('/upload/template', adminController.uploadTemplate);

module.exports = router;
