const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // Create seed user
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.create({
    data: {
      email: "seed@example.com",
      password: passwordHash,
      name: "Seed User",
    },
  });

  // Create sample posts
  const post1 = await prisma.post.create({
    data: {
      title: "Getting Started with Express.js",
      content:
        "Express.js is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. In this post, we will walk through the basics of setting up an Express server and creating your first routes.",
      published: true,
      authorId: user.id,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      title: "Understanding Prisma ORM",
      content:
        "Prisma is a next-generation ORM that makes working with databases easy. It provides a type-safe query builder, automated migrations, and a powerful studio for exploring your data. Let us dive into how Prisma simplifies database access in Node.js applications.",
      published: true,
      authorId: user.id,
    },
  });

  const post3 = await prisma.post.create({
    data: {
      title: "REST API Design Best Practices",
      content:
        "Designing a good REST API requires careful thought about resource naming, HTTP methods, status codes, and error handling. This guide covers the essential best practices every API developer should follow.",
      published: true,
      authorId: user.id,
    },
  });

  const post4 = await prisma.post.create({
    data: {
      title: "Draft: Upcoming Features",
      content:
        "This is a draft post about upcoming features. It should not appear in the public listing since it is not published yet.",
      published: false,
      authorId: user.id,
    },
  });

  // Add comments to published posts
  await prisma.comment.createMany({
    data: [
      {
        content: "Great introduction! Very helpful for beginners.",
        authorName: "Alice",
        postId: post1.id,
      },
      {
        content: "I wish I had this guide when I started learning Express.",
        authorName: "Bob",
        postId: post1.id,
      },
      {
        content: "Prisma has completely changed how I work with databases.",
        authorName: "Charlie",
        postId: post2.id,
      },
      {
        content:
          "Could you write a follow-up on Prisma migrations? That would be super useful.",
        authorName: "Alice",
        postId: post2.id,
      },
      {
        content: "Solid advice on REST design. Bookmarked for reference!",
        authorName: "Diana",
        postId: post3.id,
      },
    ],
  });

  console.log("Seed data created:");
  console.log(`  - ${4} posts (3 published, 1 draft)`);
  console.log(`  - ${5} comments`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
