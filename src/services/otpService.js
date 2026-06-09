const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { sendEmail } = require('./emailService');

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtp = async (email, type) => {
  try {
    const otp = generateOtp();
    console.log(`[OTP] Generated OTP for ${email} (${type}): ${otp}`); // Debug log
    
    const otpHash = await bcrypt.hash(otp, 10);
    console.log(`[OTP] Hashed OTP successfully for ${email}`); // Debug log
    
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create OTP record in DB FIRST (before sending email)
    const otpRecord = await prisma.otpVerification.create({
      data: {
        email,
        otpHash,
        type,
        expiresAt
      }
    });
    console.log(`[OTP] Stored hashed OTP in DB for ${email}`, { id: otpRecord.id, type }); // Debug log

    // Then send email
    const subject = `Your ITBEES Global Verification Code`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #023295;">ITBEES GLOBAL</h2>
        <p>Hello,</p>
        <p>Your verification code for ${type.toLowerCase()} is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #68ef3f; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code is valid for 5 minutes. Do not share it with anyone.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">ITBEES Global Pvt. Ltd. | Gachibowli, Hyderabad</p>
      </div>
    `;

    await sendEmail(email, subject, otp, html);
    console.log(`[OTP] Email sent successfully to ${email}`); // Debug log
    
    return { success: true, message: 'OTP sent to email', otpId: otpRecord.id };
  } catch (error) {
    console.error(`[OTP] Error in sendOtp for ${email}:`, error.message); // Debug log
    throw error;
  }
};


const verifyOtp = async (email, otp, type, options = {}) => {
  const where = {
    email,
    type,
    expiresAt: { gt: new Date() },
  };

  if (!options.allowVerified) {
    where.isVerified = false;
    where.attempts = { lt: 3 };
  }

  const latestOtp = await prisma.otpVerification.findFirst({
    where,
    orderBy: { createdAt: 'desc' }
  });

  if (!latestOtp) {
    const err = new Error('OTP expired, already used, or too many failed attempts. Please request a new OTP');
    err.status = 400;
    throw err;
  }

  const isMatch = await bcrypt.compare(otp, latestOtp.otpHash);

  if (!isMatch) {
    await prisma.otpVerification.update({
      where: { id: latestOtp.id },
      data: { attempts: { increment: 1 } }
    });
    const err = new Error('Invalid OTP');
    err.status = 400;
    throw err;
  }

  await prisma.otpVerification.update({
    where: { id: latestOtp.id },
    data: { isVerified: true }
  });

  return true;
};

module.exports = { sendOtp, verifyOtp };
