const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const all = await prisma.template.findMany();
    console.log('All templates (including deleted):', all.length);
    all.forEach(t => console.log('  -', t.id, t.name, 'deletedAt:', t.deletedAt, 'isArchived:', t.isArchived));

    const visible = await prisma.template.findMany({
      where: { deletedAt: null, isArchived: false }
    });
    console.log('Visible templates:', visible.length);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
