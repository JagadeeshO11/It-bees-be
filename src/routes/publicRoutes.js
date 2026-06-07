const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { 
  inquirySchema, 
  jobApplicationSchema, 
  purchaseSchema, 
  templatePurchaseSchema,
  otpRequestSchema, 
  assessmentSubmissionSchema 
} = require('../validators/publicValidator');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error.issues || result.error.errors || [];
    const first = issues[0];
    const message = first 
      ? `${first.path?.join('.') || 'field'}: ${first.message}` 
      : 'Validation failed';
    return res.status(400).json({ success: false, message, errors: issues });
  }
  next();
};

// Public Browsing
router.get('/courses', publicController.getCourses);
router.get('/jobs', publicController.getJobs);
router.get('/templates', publicController.getTemplates);
router.get('/templates/:id', publicController.getTemplateById);
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

// Template Purchase Flow
router.post('/purchase-template/initiate', validate(templatePurchaseSchema), publicController.initiateTemplatePurchase);
router.post('/purchase-template/verify', publicController.verifyTemplatePayment);

// Assessments
router.post('/assessments/submit', validate(assessmentSubmissionSchema), publicController.submitAssessment);

module.exports = router;
