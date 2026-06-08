const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

/* ============================================================
 * PASSWORD RESET SCHEMAS
 * ============================================================
 * Three-step admin password reset flow:
 *   1. forgotPassword  — admin enters email → backend emails OTP
 *   2. verifyOtp       — admin enters the 6-digit OTP → backend marks it verified
 *   3. resetPassword   — admin enters new password → backend updates the Admin row
 * ============================================================ */

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const otpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

const courseSchema = z.object({
  title: z.string().min(3),
  category: z.string(),
  hours: z.coerce.number().int().positive(),
  duration: z.string(),
  price: z.coerce.number().positive(),
  description: z.string(),
  rating: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});

const templateSchema = z.object({
  name: z.string().min(3),
  price: z.coerce.number().positive(),
  templateUrl: z.string().min(1, "Product URL is required"),
  description: z.string(),
  category: z.string().optional(),
  image: z.string().nullable().optional(),
  rating: z.string().nullable().optional(),
  features: z.array(z.string()).nullable().optional(),
});

const jobSchema = z.object({
  title: z.string().min(3),
  department: z.string(),
  location: z.string(),
  type: z.string(),
  salary: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
});

const assessmentSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(3),
  instructions: z.string().optional(),
  totalMarks: z.number().int().nonnegative(),
});

const questionSchema = z.object({
  questionText: z.string().min(5),
  options: z.array(z.object({
    text: z.string(),
    isCorrect: z.boolean(),
  })).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  marks: z.number().int().positive(),
});

module.exports = {
  loginSchema,
  updatePasswordSchema,
  emailSchema,
  otpSchema,
  resetPasswordSchema,
  courseSchema,
  templateSchema,
  jobSchema,
  assessmentSchema,
  questionSchema,
};
