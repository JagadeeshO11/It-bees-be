const { execSync } = require('child_process');
const logger = require('./src/utils/logger');

try {
  logger.info('Initializing database...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  execSync('npx prisma db push', { stdio: 'inherit' }); // Using db push for faster initial setup on Neon
  logger.info('Database initialized successfully.');
} catch (error) {
  logger.error('Database initialization failed:', error.message);
  process.exit(1);
}
