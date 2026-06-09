/**
 * OTP Verification Test Utility
 * Run this to debug OTP sending and hashing
 */

const prisma = require('./src/utils/prisma');
const bcrypt = require('bcryptjs');
const { sendOtp, verifyOtp } = require('./src/services/otpService');

const testOtpFlow = async () => {
  const testEmail = 'test@example.com';
  const testType = 'ADMIN_PASSWORD_RESET';

  console.log('\n=== OTP Flow Test ===\n');

  try {
    // 1. Test sending OTP
    console.log('1. Testing OTP generation and sending...');
    const result = await sendOtp(testEmail, testType);
    console.log('✓ OTP sent successfully:', result);

    // 2. Check what was stored in DB
    console.log('\n2. Checking what was stored in database...');
    const otpRecord = await prisma.otpVerification.findFirst({
      where: { email: testEmail, type: testType },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      console.error('✗ No OTP record found in database!');
      return;
    }

    console.log('✓ OTP Record found:');
    console.log('  - ID:', otpRecord.id);
    console.log('  - Email:', otpRecord.email);
    console.log('  - Type:', otpRecord.type);
    console.log('  - Hash length:', otpRecord.otpHash.length);
    console.log('  - Hash preview:', otpRecord.otpHash.substring(0, 20) + '...');
    console.log('  - Is hashed (starts with $2):', otpRecord.otpHash.startsWith('$2'));
    console.log('  - Created at:', otpRecord.createdAt);
    console.log('  - Expires at:', otpRecord.expiresAt);

    // 3. Try to verify with a test OTP
    console.log('\n3. To fully test, generate a real OTP by calling forgot-password endpoint');
    console.log('   Then use that OTP to test verification');

  } catch (error) {
    console.error('✗ Error during test:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
};

// Run if executed directly
if (require.main === module) {
  testOtpFlow().catch(console.error);
}

module.exports = { testOtpFlow };
