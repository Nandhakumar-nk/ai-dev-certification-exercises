import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import app from "../src/server.js";

const prisma = new PrismaClient();

let owner;
let otherUser;
let ownerToken;
let otherUserToken;

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

beforeAll(async () => {
  // Ensure database is clean and seeded for tests
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  owner = await prisma.user.create({
    data: {
      id: 500,
      email: "owner@example.com",
      password: "not-checked-in-these-tests",
      name: "Owner User",
    },
  });

  otherUser = await prisma.user.create({
    data: {
      id: 501,
      email: "other@example.com",
      password: "not-checked-in-these-tests",
      name: "Other User",
    },
  });

  ownerToken = signToken(owner);
  otherUserToken = signToken(otherUser);

  await prisma.post.create({
    data: {
      id: 100,
      title: "Test Post One",
      content: "Content for test post one.",
      published: true,
      authorId: owner.id,
    },
  });

  await prisma.post.create({
    data: {
      id: 101,
      title: "Test Post Two (Draft)",
      content: "This draft should not appear in listings.",
      published: false,
      authorId: owner.id,
    },
  });

  // Dedicated posts for PUT/DELETE ownership tests
  await prisma.post.create({
    data: {
      id: 200,
      title: "Owner's post to update",
      content: "Original content.",
      published: true,
      authorId: owner.id,
    },
  });

  await prisma.post.create({
    data: {
      id: 201,
      title: "Owner's post to delete",
      content: "Original content.",
      published: true,
      authorId: owner.id,
    },
  });

  await prisma.post.create({
    data: {
      id: 202,
      title: "Owner's post (non-owner PUT target)",
      content: "Original content.",
      published: true,
      authorId: owner.id,
    },
  });

  await prisma.post.create({
    data: {
      id: 203,
      title: "Owner's post (non-owner DELETE target)",
      content: "Original content.",
      published: true,
      authorId: owner.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: "A test comment",
      authorName: "Tester",
      postId: 100,
    },
  });
});

afterAll(async () => {
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.blacklistedToken.deleteMany();
  await prisma.$disconnect();
});

describe("GET /health", () => {
  it("should return ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("GET /api/posts", () => {
  it("should return only published posts", async () => {
    const res = await request(app).get("/api/posts");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const titles = res.body.map((p) => p.title);
    expect(titles).toContain("Test Post One");
    expect(titles).not.toContain("Test Post Two (Draft)");
  });
});

describe("GET /api/posts/:id", () => {
  it("should return a post with its comments", async () => {
    const res = await request(app).get("/api/posts/100");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Test Post One");
    expect(Array.isArray(res.body.comments)).toBe(true);
    expect(res.body.comments.length).toBe(1);
    expect(res.body.comments[0].authorName).toBe("Tester");
  });

  it("should return 404 for a non-existent post", async () => {
    const res = await request(app).get("/api/posts/9999");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/posts", () => {
  it("should create a new post when authenticated", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "New Test Post",
        content: "Some content here.",
        published: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("New Test Post");
    expect(res.body.published).toBe(true);
    expect(res.body.authorId).toBe(owner.id);
  });

  it("should reject a post without a title", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        content: "Missing title",
      });
    expect(res.status).toBe(400);
  });

  it("should reject creating a post without a token", async () => {
    const res = await request(app).post("/api/posts").send({
      title: "No token post",
      content: "Should be rejected.",
    });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/posts/:id", () => {
  it("should allow the owner to update their post", async () => {
    const res = await request(app)
      .put("/api/posts/200")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Updated title" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated title");
  });

  it("should reject an update from a non-owner with 403", async () => {
    const res = await request(app)
      .put("/api/posts/202")
      .set("Authorization", `Bearer ${otherUserToken}`)
      .send({ title: "Hijacked title" });
    expect(res.status).toBe(403);
  });

  it("should reject an update with no token with 401", async () => {
    const res = await request(app)
      .put("/api/posts/200")
      .send({ title: "Should not apply" });
    expect(res.status).toBe(401);
  });

  it("should return 404 for a non-existent post before checking ownership", async () => {
    const res = await request(app)
      .put("/api/posts/9999")
      .set("Authorization", `Bearer ${otherUserToken}`)
      .send({ title: "Does not matter" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/posts/:id", () => {
  it("should reject a delete from a non-owner with 403", async () => {
    const res = await request(app)
      .delete("/api/posts/203")
      .set("Authorization", `Bearer ${otherUserToken}`);
    expect(res.status).toBe(403);
  });

  it("should reject a delete with no token with 401", async () => {
    const res = await request(app).delete("/api/posts/201");
    expect(res.status).toBe(401);
  });

  it("should return 404 for a non-existent post before checking ownership", async () => {
    const res = await request(app)
      .delete("/api/posts/9999")
      .set("Authorization", `Bearer ${otherUserToken}`);
    expect(res.status).toBe(404);
  });

  it("should allow the owner to delete their post", async () => {
    const res = await request(app)
      .delete("/api/posts/201")
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);

    const followUp = await request(app).get("/api/posts/201");
    expect(followUp.status).toBe(404);
  });
});
