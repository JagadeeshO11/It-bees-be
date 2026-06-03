const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { 
  inquirySchema, 
  jobApplicationSchema, 
  purchaseSchema, 
  otpRequestSchema, 
  assessmentSubmissionSchema 
} = require('../validators/publicValidator');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.errors });
  }
  next();
};

// Public Browsing
router.get('/courses', publicController.getCourses);
router.get('/jobs', publicController.getJobs);
router.get('/assessments', publicController.getAssessments);
router.get('/assessments/:id', publicController.getAssessmentDetails);
router.get('/jobs/:id', publicController.getJobById);

// Interactions
router.post('/inquiries', validate(inquirySchema), publicController.submitInquiry);
router.post('/jobs/apply', publicController.applyForJob); // Multipart handled in controller

// Purchase Flow
router.post('/purchase/otp', validate(otpRequestSchema), publicController.requestPurchaseOtp);
router.post('/purchase/initiate', validate(purchaseSchema), publicController.initiatePurchase);
router.post('/purchase/verify', publicController.verifyPayment);

// Assessments
router.post('/assessments/submit', validate(assessmentSubmissionSchema), publicController.submitAssessment);

module.exports = router;
