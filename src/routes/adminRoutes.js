const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, authorize } = require('../middleware/auth');
const { 
  loginSchema, 
  courseSchema, 
  jobSchema, 
  assessmentSchema, 
  questionSchema 
} = require('../validators/adminValidator');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.errors });
  }
  next();
};

// Auth
router.post('/login', validate(loginSchema), adminController.login);
router.post('/logout', adminController.logout);
router.post('/refresh', adminController.refresh);

// Protected Routes
router.use(auth);

// Courses
router.post('/courses', validate(courseSchema), adminController.createCourse);
router.put('/courses/:id', validate(courseSchema), adminController.updateCourse);
router.patch('/courses/:id/archive', adminController.archiveCourse);
router.delete('/courses/:id', adminController.deleteCourse);

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

module.exports = router;
