#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Clean up temporary files
  const clientDir = path.join(__dirname, 'node_modules', '.prisma', 'client');
  if (fs.existsSync(clientDir)) {
    fs.readdirSync(clientDir)
      .filter(f => f.includes('.tmp'))
      .forEach(f => {
        try {
          fs.unlinkSync(path.join(clientDir, f));
          console.log('Removed:', f);
        } catch (e) {
          console.warn('Could not remove:', f);
        }
      });
  }

  // Run prisma generate
  console.log('Regenerating Prisma client...');
  execSync('npx prisma generate', {
    cwd: __dirname,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  console.log('✓ Prisma client regenerated successfully');
} catch (error) {
  console.error('✗ Failed to regenerate Prisma:', error.message);
  process.exit(1);
}
