import "dotenv/config";
import { prisma } from "../src/utils/prisma";

async function main() {
  await prisma.assignment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.student.deleteMany();

  await prisma.student.createMany({
    data: [
      {
        firstName: "Jeff",
        lastName: "Ding",
        email: "jeff.student@example.com",
        studentId: "S1001",
        major: "Software Engineering",
        yearLevel: "Senior",
        phone: "8011111111",
        city: "Salt Lake City",
        state: "Utah",
      },
      {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice.student@example.com",
        studentId: "S1002",
        major: "Computer Science",
        yearLevel: "Junior",
        phone: "8012222222",
        city: "Provo",
        state: "Utah",
      },
      {
        firstName: "Bob",
        lastName: "Smith",
        email: "bob.student@example.com",
        studentId: "S1003",
        major: "Information Technology",
        yearLevel: "Sophomore",
        phone: "8013333333",
        city: "Ogden",
        state: "Utah",
      },
      {
        firstName: "Emma",
        lastName: "Davis",
        email: "emma.student@example.com",
        studentId: "S1004",
        major: "Data Science",
        yearLevel: "Freshman",
        phone: "8014444444",
        city: "Draper",
        state: "Utah",
      },
    ],
  });

  await prisma.course.createMany({
    data: [
      {
        courseCode: "CS420",
        title: "AI Systems",
        description: "Introduction to AI and cloud systems",
        department: "Computer Science",
        instructor: "Professor Jones",
        credits: 3,
        room: "Room 201",
        schedule: "Monday and Wednesday",
        semester: "Fall 2026",
      },
      {
        courseCode: "CS460",
        title: "Spring Boot",
        description: "Backend development using Spring Boot",
        department: "Computer Science",
        instructor: "Professor Smith",
        credits: 3,
        room: "Room 202",
        schedule: "Tuesday and Thursday",
        semester: "Fall 2026",
      },
      {
        courseCode: "CS350",
        title: "Database Systems",
        description: "Relational databases and SQL",
        department: "Computer Science",
        instructor: "Professor Davis",
        credits: 3,
        room: "Room 203",
        schedule: "Monday and Wednesday",
        semester: "Fall 2026",
      },
      {
        courseCode: "CS300",
        title: "Algorithms",
        description: "Data structures and algorithm analysis",
        department: "Computer Science",
        instructor: "Professor Brown",
        credits: 3,
        room: "Room 204",
        schedule: "Tuesday and Thursday",
        semester: "Fall 2026",
      },
    ],
  });

  await prisma.assignment.createMany({
    data: [
      {
        title: "Prisma Database Assignment",
        description: "Create Prisma models and sample records",
        courseCode: "CS350",
        dueDate: new Date("2026-07-25"),
        points: 100,
        status: "Completed",
        category: "Database",
        submitted: true,
        notes: "Submitted through Canvas",
      },
      {
        title: "REST API Assignment",
        description: "Create API routes using Next.js",
        courseCode: "CS420",
        dueDate: new Date("2026-07-28"),
        points: 100,
        status: "In Progress",
        category: "API",
        submitted: false,
        notes: "Testing endpoints",
      },
      {
        title: "Spring Boot Security",
        description: "Add authentication and authorization",
        courseCode: "CS460",
        dueDate: new Date("2026-08-01"),
        points: 100,
        status: "Not Started",
        category: "Backend",
        submitted: false,
        notes: "Review course material first",
      },
      {
        title: "Algorithm Analysis",
        description: "Compare sorting algorithms",
        courseCode: "CS300",
        dueDate: new Date("2026-08-05"),
        points: 100,
        status: "Not Started",
        category: "Algorithms",
        submitted: false,
        notes: "Use Big O notation",
      },
    ],
  });

  console.log("Seed data inserted successfully.");
}

main()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
