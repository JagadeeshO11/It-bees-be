// Standalone migration script that bypasses the prisma.config.ts issue
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30));

const { execSync } = require('child_process');
try {
  // Run the prisma db push directly
  const result = execSync('node node_modules/@prisma/cmd/index.js db push --schema=prisma/schema.prisma', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  });
  console.log('Migration complete!');
} catch (err) {
  console.error('Migration failed:', err.message);
}
