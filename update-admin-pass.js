require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateAdminPassword() {
  const newPassword = 'A3-@_mkNn3qx';
  const hashed = await bcrypt.hash(newPassword, 12);

  const admins = await prisma.admin.findMany({ where: { deletedAt: null } });
  console.log(`Found ${admins.length} admin(s):`);
  admins.forEach(a => console.log(`  - ${a.email} (${a.role})`));

  const result = await prisma.admin.updateMany({
    where: { deletedAt: null },
    data: { password: hashed }
  });

  console.log(`\n✅ Password updated for ${result.count} admin account(s).`);
  console.log(`   New password: ${newPassword}`);

  await prisma.$disconnect();
}

updateAdminPassword().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
