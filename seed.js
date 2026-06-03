const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const jobs = [
    { title: 'Senior React Developer', department: 'Engineering', location: 'Hyderabad (Hybrid)', type: 'Full-time', salary: '₹12L - ₹18L', description: 'We are looking for a Senior React Developer who has experience in building premium UI dashboards and working with REST APIs. You will lead the frontend implementation of our cloud systems.', requirements: ['3+ years React experience', 'CSS/HTML expert', 'Experience with state management (Redux/Zustand)', 'Familiarity with Vite/Webpack'] },
    { title: 'Data Scientist & BI Analyst', department: 'Analytics', location: 'Gachibowli, Hyderabad', type: 'Full-time', salary: '₹10L - ₹15L', description: 'Join our business intelligence unit. You will design, build, and deploy PowerBI and Custom SVG charts dashboard interfaces for corporate clients.', requirements: ['SQL Mastery', 'PowerBI / Tableau experience', 'Python (Pandas, Numpy)', 'Experience with client facing reporting'] },
    { title: 'ERP Solutions Consultant', department: 'Consulting', location: 'Remote', type: 'Contract', salary: '₹8L - ₹12L', description: 'Help implement and configure ERP software solutions for retail and manufacturing business partners. Coordinate with backend teams to integrate core databases.', requirements: ['ERP systems experience', 'Enterprise databases knowledge', 'Strong client communication skills'] },
    { title: 'HR Talent Acquisition Specialist', department: 'HR & Staffing', location: 'Gachibowli, Hyderabad', type: 'Full-time', salary: '₹6L - ₹9L', description: 'Build and cultivate our pipeline of talent. You will scan resumes, schedule candidate assessments, and manage training onboarding.', requirements: ['2+ years IT recruitment experience', 'Outstanding communication skills', 'ATS systems management'] }
  ];

  const courses = [
    { title: 'Excel (Basic & Advanced)', category: 'Productivity', hours: 20, duration: '3 Weeks', price: 4999, description: 'Master Excel from basics to advanced — formulas, pivot tables, conditional formatting, charts, and data validation for real-world business use.', rating: '4.8/5 (320+ students)', icon: '📊', image: 'https://res.cloudinary.com/dvqba5ker/image/upload/v1780160635/excel_cikbtx.png' },
    { title: 'Power Query', category: 'Data Analytics', hours: 30, duration: '4-5 Weeks', price: 5999, description: 'Learn to import, transform, and automate data workflows using Power Query in Excel and Power BI. Industry-standard ETL skill.', rating: '4.9/5 (210+ students)', icon: '🔄', image: 'https://res.cloudinary.com/dvqba5ker/image/upload/v1780160698/query_rzr5zx.png' },
    { title: 'VBA (Excel Automation)', category: 'Automation', hours: 30, duration: '4-5 Weeks', price: 5999, description: 'Write macros and VBA scripts to automate repetitive Excel tasks, build custom functions, and create interactive dashboards.', rating: '4.7/5 (180+ students)', icon: '⚡', image: 'https://res.cloudinary.com/dvqba5ker/image/upload/v1780160721/vba_eyqnhp.png' },
    { title: 'Python for Data Analytics', category: 'Data Science', hours: 15, duration: '2-3 Weeks', price: 6999, description: 'Hands-on Python training covering Pandas, NumPy, Matplotlib, and real data analysis projects for business decision-making.', rating: '5.0/5 (290+ students)', icon: '🐍', image: 'https://res.cloudinary.com/dvqba5ker/image/upload/v1780160666/python_cliam4.png' },
    { title: 'Power BI', category: 'BI Analytics', hours: 30, duration: '4-5 Weeks', price: 9999, description: 'Build stunning interactive dashboards in Power BI. Data modeling, DAX, report publishing, and corporate storytelling with data.', rating: '4.9/5 (380+ students)', icon: '📈', image: 'https://res.cloudinary.com/dvqba5ker/image/upload/v1780160599/bi_mggeci.png' }
  ];

  try {
    for (const job of jobs) {
      await sql`
        INSERT INTO jobs (title, department, location, type, salary, description, requirements)
        VALUES (${job.title}, ${job.department}, ${job.location}, ${job.type}, ${job.salary}, ${job.description}, ${job.requirements})
      `;
    }

    for (const course of courses) {
      await sql`
        INSERT INTO courses (title, category, hours, duration, price, description, rating, icon, image)
        VALUES (${course.title}, ${course.category}, ${course.hours}, ${course.duration}, ${course.price}, ${course.description}, ${course.rating}, ${course.icon}, ${course.image})
      `;
    }

    console.log('Seeding completed.');
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

main();
