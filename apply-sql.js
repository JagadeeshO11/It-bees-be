// Apply schema columns directly to the database
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "image" TEXT;'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT \'General\';'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "rating" TEXT DEFAULT \'New\';'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "features" JSONB;'
    );
    console.log('Columns added successfully!');

    const result = await prisma.$queryRawUnsafe(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
      'templates'
    );
    console.log('Templates table columns:', result);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
