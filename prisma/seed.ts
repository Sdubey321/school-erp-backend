// @ts-nocheck
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv/config');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Super Admin
  const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@schoolerp.com' },
    update: {},
    create: {
      role: 'SUPER_ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@schoolerp.com',
      phone: '9999999999',
      password: superAdminPassword,
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // 2. Create Demo School
  const school = await prisma.school.upsert({
    where: { code: 'DPS001' },
    update: {},
    create: {
      name: 'Delhi Public School - Demo',
      code: 'DPS001',
      address: '123 School Road, Sector 15',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      phone: '011-12345678',
      email: 'info@dps-demo.edu.in',
      board: 'CBSE',
      plan: 'PREMIUM',
      principalName: 'Dr. Rajesh Kumar',
      establishedYear: 1998,
      isActive: true,
    },
  });
  console.log('✅ Demo school created:', school.name);

  // 3. Create Academic Year
  const currentYear = new Date().getFullYear();
  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: `${currentYear}-${(currentYear + 1).toString().slice(2)}`,
      startDate: new Date(`${currentYear}-04-01`),
      endDate: new Date(`${currentYear + 1}-03-31`),
      isCurrent: true,
    },
  }).catch(() => prisma.academicYear.findFirst({ where: { schoolId: school.id, isCurrent: true } }));
  console.log('✅ Academic year created:', academicYear.name);

  // 4. Create School Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dps-demo.edu.in' },
    update: {},
    create: {
      schoolId: school.id,
      role: 'SCHOOL_ADMIN',
      firstName: 'School',
      lastName: 'Administrator',
      email: 'admin@dps-demo.edu.in',
      phone: '9876543210',
      password: await bcrypt.hash('Admin@123', 10),
    },
  });
  console.log('✅ School Admin created:', adminUser.email);

  // 5. Create Accountant
  const accountantUser = await prisma.user.upsert({
    where: { email: 'accounts@dps-demo.edu.in' },
    update: {},
    create: {
      schoolId: school.id,
      role: 'ACCOUNTANT',
      firstName: 'Ravi',
      lastName: 'Sharma',
      email: 'accounts@dps-demo.edu.in',
      phone: '9876543211',
      password: await bcrypt.hash('Accounts@123', 10),
    },
  });
  await prisma.accountant.upsert({
    where: { userId: accountantUser.id },
    update: {},
    create: { userId: accountantUser.id, employeeCode: 'ACC001' },
  });
  console.log('✅ Accountant created');

  // 6. Create Classes
  const classNames = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
                      'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
  const classes = [];
  for (const name of classNames) {
    const cls = await prisma.class.create({
      data: { schoolId: school.id, academicYearId: academicYear.id, name },
    }).catch(() => prisma.class.findFirst({ where: { schoolId: school.id, name } }));
    classes.push(cls);
  }
  console.log('✅ Classes created:', classes.length);

  const class1 = classes[0];

  // 7. Create Sections
  const sections = [];
  for (const cls of classes.slice(0, 5)) {
    for (const sectionName of ['A', 'B']) {
      const sec = await prisma.section.create({
        data: { classId: cls.id, name: sectionName },
      }).catch(() => prisma.section.findFirst({ where: { classId: cls.id, name: sectionName } }));
      sections.push(sec);
    }
  }
  for (const cls of classes.slice(5)) {
    const sec = await prisma.section.create({
      data: { classId: cls.id, name: 'A' },
    }).catch(() => prisma.section.findFirst({ where: { classId: cls.id, name: 'A' } }));
    sections.push(sec);
  }
  console.log('✅ Sections created:', sections.length);

  const section1A = sections.find(s => s.name === 'A' && s.classId === class1.id);

  // 8. Create Subjects for all classes
  const subjectsByClass = {
    'Class 1': ['Mathematics', 'English', 'Hindi', 'Science', 'EVS'],
    'Class 6': ['Mathematics', 'English', 'Hindi', 'Science', 'Social Science', 'Computer'],
    'Class 9': ['Mathematics', 'English', 'Hindi', 'Physics', 'Chemistry', 'Biology', 'Social Science'],
  };
  
  const class1Subjects = [];
  const allSubjectNames = ['Mathematics', 'English', 'Hindi', 'Science', 'EVS'];
  for (const name of allSubjectNames) {
    const sub = await prisma.subject.create({
      data: { classId: class1.id, name, code: name.slice(0, 3).toUpperCase(), maxMarks: 100, passMark: 33 },
    }).catch(() => prisma.subject.findFirst({ where: { classId: class1.id, name } }));
    class1Subjects.push(sub);
  }
  console.log('✅ Subjects created for Class 1:', class1Subjects.length);

  // 9. Create Teachers
  const teacherData = [
    { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@dps-demo.edu.in', code: 'TCH001', specialization: 'Mathematics', gender: 'FEMALE' },
    { firstName: 'Amit', lastName: 'Kumar', email: 'amit.kumar@dps-demo.edu.in', code: 'TCH002', specialization: 'Science', gender: 'MALE' },
    { firstName: 'Sunita', lastName: 'Rao', email: 'sunita.rao@dps-demo.edu.in', code: 'TCH003', specialization: 'English', gender: 'FEMALE' },
    { firstName: 'Rahul', lastName: 'Verma', email: 'rahul.verma@dps-demo.edu.in', code: 'TCH004', specialization: 'Hindi', gender: 'MALE' },
    { firstName: 'Deepa', lastName: 'Singh', email: 'deepa.singh@dps-demo.edu.in', code: 'TCH005', specialization: 'Social Studies', gender: 'FEMALE' },
  ];

  const teachers = [];
  for (let i = 0; i < teacherData.length; i++) {
    const td = teacherData[i];
    const tUser = await prisma.user.upsert({
      where: { email: td.email },
      update: {},
      create: {
        schoolId: school.id,
        role: 'TEACHER',
        firstName: td.firstName,
        lastName: td.lastName,
        email: td.email,
        phone: `9876${50000 + i}`,
        password: await bcrypt.hash('Teacher@123', 10),
      },
    });
    const teacher = await prisma.teacher.upsert({
      where: { userId: tUser.id },
      update: {},
      create: {
        userId: tUser.id,
        employeeCode: td.code,
        qualification: 'B.Ed, M.Sc',
        specialization: td.specialization,
        experience: 5 + i,
        joiningDate: new Date('2020-04-01'),
        salary: 45000 + (i * 5000),
        gender: td.gender,
      },
    });
    teachers.push(teacher);
  }
  console.log('✅ Teachers created:', teachers.length);

  // Assign class teacher
  await prisma.class.update({
    where: { id: class1.id },
    data: { classTeacherId: teachers[0].id },
  });

  // 10. Create Parents
  const parentData = [
    { firstName: 'Suresh', lastName: 'Mehta', email: 'suresh.mehta@parent.com', phone: '9811111111' },
    { firstName: 'Kavita', lastName: 'Gupta', email: 'kavita.gupta@parent.com', phone: '9811111112' },
    { firstName: 'Vijay', lastName: 'Patel', email: 'vijay.patel@parent.com', phone: '9811111113' },
    { firstName: 'Anita', lastName: 'Joshi', email: 'anita.joshi@parent.com', phone: '9811111114' },
    { firstName: 'Ramesh', lastName: 'Nair', email: 'ramesh.nair@parent.com', phone: '9811111115' },
  ];
  const parents = [];
  for (const pd of parentData) {
    const pUser = await prisma.user.upsert({
      where: { email: pd.email },
      update: {},
      create: {
        schoolId: school.id,
        role: 'PARENT',
        firstName: pd.firstName,
        lastName: pd.lastName,
        email: pd.email,
        phone: pd.phone,
        password: await bcrypt.hash('Parent@123', 10),
      },
    });
    const parent = await prisma.parent.upsert({
      where: { userId: pUser.id },
      update: {},
      create: { userId: pUser.id, occupation: 'Business', relation: 'Father' },
    });
    parents.push(parent);
  }
  console.log('✅ Parents created:', parents.length);

  // 11. Create Students
  const studentData = [
    { firstName: 'Aryan', lastName: 'Mehta', admissionNo: 'ADM2024001', rollNo: '01', gender: 'MALE' },
    { firstName: 'Priya', lastName: 'Gupta', admissionNo: 'ADM2024002', rollNo: '02', gender: 'FEMALE' },
    { firstName: 'Rohan', lastName: 'Patel', admissionNo: 'ADM2024003', rollNo: '03', gender: 'MALE' },
    { firstName: 'Sneha', lastName: 'Joshi', admissionNo: 'ADM2024004', rollNo: '04', gender: 'FEMALE' },
    { firstName: 'Karan', lastName: 'Nair', admissionNo: 'ADM2024005', rollNo: '05', gender: 'MALE' },
    { firstName: 'Riya', lastName: 'Sharma', admissionNo: 'ADM2024006', rollNo: '06', gender: 'FEMALE' },
    { firstName: 'Vikram', lastName: 'Kapoor', admissionNo: 'ADM2024007', rollNo: '07', gender: 'MALE' },
    { firstName: 'Neha', lastName: 'Bhat', admissionNo: 'ADM2024008', rollNo: '08', gender: 'FEMALE' },
  ];
  const students = [];
  for (let i = 0; i < studentData.length; i++) {
    const sd = studentData[i];
    const sUser = await prisma.user.upsert({
      where: { email: `${sd.admissionNo.toLowerCase()}@student.dps.edu` },
      update: {},
      create: {
        schoolId: school.id,
        role: 'STUDENT',
        firstName: sd.firstName,
        lastName: sd.lastName,
        email: `${sd.admissionNo.toLowerCase()}@student.dps.edu`,
        phone: `9872200${i + 10}`,
        password: await bcrypt.hash(sd.admissionNo, 10),
      },
    });
    const student = await prisma.student.upsert({
      where: { admissionNo: sd.admissionNo },
      update: {},
      create: {
        userId: sUser.id,
        admissionNo: sd.admissionNo,
        rollNo: sd.rollNo,
        classId: class1.id,
        sectionId: section1A.id,
        academicYearId: academicYear.id,
        parentId: parents[i % parents.length].id,
        gender: sd.gender,
        bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'B-'][i % 5],
        dateOfBirth: new Date(`2015-0${(i % 9) + 1}-15`),
      },
    });
    students.push(student);
  }
  console.log('✅ Students created:', students.length);

  // 12. Create Fee Structures
  const tuitionFee = await prisma.feeStructure.create({
    data: {
      schoolId: school.id,
      classId: class1.id,
      name: 'Tuition Fee',
      amount: 5000,
      frequency: 'MONTHLY',
      dueDay: 10,
    },
  }).catch(() => prisma.feeStructure.findFirst({ where: { schoolId: school.id, name: 'Tuition Fee' } }));

  await prisma.feeStructure.create({
    data: { schoolId: school.id, name: 'Annual Fee', amount: 15000, frequency: 'ANNUAL', dueDay: 30 },
  }).catch(() => null);

  await prisma.feeStructure.create({
    data: { schoolId: school.id, name: 'Computer Lab Fee', amount: 2000, frequency: 'QUARTERLY', dueDay: 15 },
  }).catch(() => null);
  console.log('✅ Fee structures created');

  // 13. Create Sample Fee Invoices
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const student = students[i];
    await prisma.feeInvoice.create({
      data: {
        studentId: student.id,
        feeStructureId: tuitionFee.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalAmount: 5000,
        dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
        status: i === 0 ? 'PAID' : 'PENDING',
        paidAmount: i === 0 ? 5000 : 0,
      },
    }).catch(() => null);
  }
  console.log('✅ Sample fee invoices created');

  // 14. Create Exam Types
  const examType = await prisma.examType.create({
    data: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: 'Unit Test 1',
      weightage: 20,
      startDate: new Date(`${currentYear}-06-01`),
      endDate: new Date(`${currentYear}-06-15`),
    },
  }).catch(() => prisma.examType.findFirst({ where: { schoolId: school.id, name: 'Unit Test 1' } }));

  const finalExam = await prisma.examType.create({
    data: {
      schoolId: school.id,
      academicYearId: academicYear.id,
      name: 'Final Examination',
      weightage: 80,
      startDate: new Date(`${currentYear}-11-01`),
      endDate: new Date(`${currentYear}-11-30`),
    },
  }).catch(() => null);
  console.log('✅ Exam types created');

  // 15. Create Sample Exam Results
  const marks = [85, 92, 78, 88, 65, 72, 95, 55];
  for (let i = 0; i < Math.min(students.length, 5); i++) {
    for (let j = 0; j < Math.min(class1Subjects.length, 3); j++) {
      await prisma.examResult.create({
        data: {
          studentId: students[i].id,
          subjectId: class1Subjects[j].id,
          examTypeId: examType.id,
          marksObtained: marks[(i + j) % marks.length],
          maxMarks: 100,
          grade: marks[(i + j) % marks.length] >= 90 ? 'A+' : marks[(i + j) % marks.length] >= 80 ? 'A' : marks[(i + j) % marks.length] >= 70 ? 'B+' : 'B',
        },
      }).catch(() => null);
    }
  }
  console.log('✅ Sample exam results created');

  // 16. Create Sample Attendance (last 5 days)
  for (let day = 0; day < 5; day++) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (let i = 0; i < students.length; i++) {
      await prisma.attendance.upsert({
        where: { studentId_date: { studentId: students[i].id, date } },
        update: {},
        create: {
          studentId: students[i].id,
          sectionId: section1A.id,
          date,
          status: (i === 2 && day === 0) ? 'ABSENT' : (i === 5 && day === 1) ? 'LATE' : 'PRESENT',
          markedById: teachers[0].id,
          notifiedParent: (i === 2 && day === 0),
        },
      });
    }
  }
  console.log('✅ Sample attendance created (last 5 days)');

  // 17. Create Sample Homework
  await prisma.homework.create({
    data: {
      subjectId: class1Subjects[0].id,
      teacherId: teachers[0].id,
      classId: class1.id,
      title: 'Chapter 5 - Fractions Practice',
      description: 'Solve problems 1-20 from the textbook. Show all working steps. Submit in the copy.',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  }).catch(() => null);

  await prisma.homework.create({
    data: {
      subjectId: class1Subjects[1].id,
      teacherId: teachers[2].id,
      classId: class1.id,
      title: 'Essay Writing - My School',
      description: 'Write a 200-word essay about your school. Use proper paragraphs and punctuation.',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  }).catch(() => null);
  console.log('✅ Sample homework created');

  // 18. Create Transport Route
  await prisma.transport.create({
    data: {
      schoolId: school.id,
      routeName: 'Route A - North Zone',
      busNo: 'DL-1C-0001',
      driverName: 'Ramesh Kumar',
      driverPhone: '9899988777',
      capacity: 40,
      stops: {
        create: [
          { stopName: 'Sector 15 Market', stopTime: '07:30', order: 1 },
          { stopName: 'Rohini Metro', stopTime: '07:45', order: 2 },
          { stopName: 'Pitampura Chowk', stopTime: '08:00', order: 3 },
          { stopName: 'School Gate', stopTime: '08:15', order: 4 },
        ],
      },
    },
  }).catch(() => null);
  console.log('✅ Transport route created');

  // 19. Create Library Books
  const books = [
    { title: 'Mathematics Textbook Class 1', author: 'NCERT', isbn: '978-81-7450-001-1', category: 'Textbook' },
    { title: 'English Reader Class 1', author: 'NCERT', isbn: '978-81-7450-002-2', category: 'Textbook' },
    { title: 'The Jungle Book', author: 'Rudyard Kipling', isbn: '978-0-14-303706-0', category: 'Fiction' },
    { title: 'Harry Potter and the Philosopher\'s Stone', author: 'J.K. Rowling', isbn: '978-0-7475-3269-9', category: 'Fiction' },
    { title: 'Wings of Fire', author: 'Dr. A.P.J. Abdul Kalam', isbn: '978-81-7450-018-9', category: 'Biography' },
  ];
  for (const book of books) {
    await prisma.libraryBook.create({
      data: { schoolId: school.id, ...book, totalCopies: 3, availableCopies: 3 },
    }).catch(() => null);
  }
  console.log('✅ Library books created');

  // 20. Create Events
  await prisma.event.create({
    data: {
      schoolId: school.id,
      title: 'Annual Sports Day',
      description: 'Annual sports day with various athletic events for all classes.',
      startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      createdBy: adminUser.id,
    },
  }).catch(() => null);

  await prisma.event.create({
    data: {
      schoolId: school.id,
      title: 'Independence Day',
      description: 'National holiday - School closed.',
      startDate: new Date(`${currentYear}-08-15`),
      isHoliday: true,
      createdBy: adminUser.id,
    },
  }).catch(() => null);
  console.log('✅ Events created');

  // 21. Create Sample Announcements
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      title: 'Parent-Teacher Meeting - July 20th',
      content: 'Dear Parents, PTM will be held on July 20th from 9 AM to 1 PM. Please attend to discuss your child\'s progress.',
      createdBy: adminUser.id,
    },
  }).catch(() => null);

  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      title: 'Fee Payment Reminder',
      content: 'This is a reminder that the last date for fee payment for July is 10th July. Please pay before the due date to avoid late fees.',
      targetRole: 'PARENT',
      createdBy: accountantUser.id,
    },
  }).catch(() => null);
  console.log('✅ Announcements created');

  console.log('\n🎉 Database seeding completed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 LOGIN CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔴 Super Admin:  superadmin@schoolerp.com     | SuperAdmin@123');
  console.log('🟠 School Admin: admin@dps-demo.edu.in        | Admin@123');
  console.log('🟡 Teacher:      priya.sharma@dps-demo.edu.in | Teacher@123');
  console.log('🟢 Parent:       suresh.mehta@parent.com      | Parent@123');
  console.log('🔵 Student:      adm2024001@student.dps.edu   | ADM2024001');
  console.log('🟣 Accountant:   accounts@dps-demo.edu.in     | Accounts@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Seed failed:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  });
