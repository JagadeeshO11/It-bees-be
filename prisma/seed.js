const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Create Super Admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.admin.upsert({
    where: { email: 'admin@itbeesglobal.com' },
    update: {},
    create: {
      email: 'admin@itbeesglobal.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN'
    }
  });

  console.log('Super Admin created:', superAdmin.email);

  // Create some initial Courses
  const course1 = await prisma.course.create({
    data: {
      title: 'Data Automation & Power BI',
      category: 'Analytics',
      hours: 40,
      duration: '8 Weeks',
      price: 14999,
      description: 'Master data pipelines and interactive dashboards with Power BI.',
      rating: '4.9',
      icon: '📊'
    }
  });

  const course2 = await prisma.course.create({
    data: {
      title: 'Enterprise ERP Solutions',
      category: 'Consulting',
      hours: 60,
      duration: '12 Weeks',
      price: 24999,
      description: 'Learn to implement and manage enterprise-grade ERP systems.',
      rating: '4.8',
      icon: '💼'
    }
  });

  console.log('Initial courses created');

  // Create Assessment Category
  const cat = await prisma.assessmentCategory.create({
    data: {
      name: 'Data Analytics',
      description: 'Assessments for data science and BI roles'
    }
  });

  // Create Assessment
  const assessment = await prisma.assessment.create({
    data: {
      categoryId: cat.id,
      title: 'Power BI Fundamentals',
      instructions: 'Answer all 5 questions. Passing score is 80%.',
      totalMarks: 5
    }
  });

  // Add Questions
  await prisma.assessmentQuestion.createMany({
    data: [
      {
        assessmentId: assessment.id,
        questionText: 'What does DAX stand for?',
        options: [
          { text: 'Data Analysis Expressions', isCorrect: true },
          { text: 'Dynamic Analytics Extension', isCorrect: false },
          { text: 'Database Access XML', isCorrect: false },
          { text: 'Digital Asset Exchange', isCorrect: false }
        ],
        correctAnswer: 0,
        marks: 1
      },
      {
        assessmentId: assessment.id,
        questionText: 'Which tool is used for ETL in Power BI?',
        options: [
          { text: 'Power Pivot', isCorrect: false },
          { text: 'Power Query', isCorrect: true },
          { text: 'Power View', isCorrect: false },
          { text: 'Power Map', isCorrect: false }
        ],
        correctAnswer: 1,
        marks: 1
      }
    ]
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
