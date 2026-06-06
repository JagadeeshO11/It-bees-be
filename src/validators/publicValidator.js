const { z } = require('zod');

const inquirySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10),
}).passthrough();

const jobApplicationSchema = z.object({
  jobId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  location: z.string(),
  skills: z.string(),
  experience: z.string(),
  education: z.string(),
});

const purchaseSchema = z.object({
  courseId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().length(6),
  otp: z.string().length(6),
});

const otpRequestSchema = z.object({
  email: z.string().email(),
});

const assessmentSubmissionSchema = z.object({
  assessmentId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedAnswer: z.number().int().min(0).max(3),
  })),
  timeTaken: z.number().int().positive(),
});

const templatePurchaseSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().length(6),
  otp: z.string().length(6),
});

module.exports = {
  inquirySchema,
  jobApplicationSchema,
  purchaseSchema,
  templatePurchaseSchema,
  otpRequestSchema,
  assessmentSubmissionSchema,
};
