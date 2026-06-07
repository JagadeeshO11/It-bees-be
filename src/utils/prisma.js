const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error', 'warn']
});

// Test connection on startup with retry (handles Neon cold starts)
const connectWithRetry = async (retries = 2, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      console.log('Database connected successfully');
      return;
    } catch (error) {
      console.log(`Database connection attempt ${i + 1}/${retries} failed: ${error.message}`);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.warn('Initial database connection failed after retries. Queries will retry automatically.');
};

// Execute connection retry on startup (non-blocking)
connectWithRetry();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
