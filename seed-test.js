const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const template = await prisma.template.create({
      data: {
        name: 'Power BI Sales Dashboard',
        price: 1999,
        category: 'Analytics',
        description: 'A complete Power BI dashboard for sales analytics. Includes revenue trends, regional comparisons, and product category breakdowns.',
        image: 'https://res.cloudinary.com/demo/image/upload/v1571218980/sample.jpg',
        templateUrl: 'https://res.cloudinary.com/demo/raw/upload/sample.pdf',
        rating: '4.8',
        features: ['Pre-built KPIs', '20+ Charts', 'Editable Source', 'Sample Data Included'],
      },
    });
    console.log('Created template:', template.name);

    const template2 = await prisma.template.create({
      data: {
        name: 'Excel Financial Model',
        price: 999,
        category: 'Finance',
        description: 'Comprehensive Excel financial model for startups and SMEs. Tracks revenue, expenses, runway, and provides scenario analysis.',
        image: null,
        templateUrl: 'https://example.com/excel-model.xlsx',
        rating: '4.5',
        features: ['Dynamic Formulas', 'Scenario Analysis', 'Charts & Graphs', 'Print-Ready'],
      },
    });
    console.log('Created template:', template2.name);

    const all = await prisma.template.findMany();
    console.log('Total templates now:', all.length);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
