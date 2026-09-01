import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../src/server.js";

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.blacklistedToken.deleteMany();
});

afterAll(async () => {
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.blacklistedToken.deleteMany();
  await prisma.$disconnect();
});

describe("POST /api/auth/register", () => {
  it("should register a new user and return a token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "register-happy@example.com",
      password: "password123",
      name: "Register Happy",
    });
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({
      email: "register-happy@example.com",
      name: "Register Happy",
    });
    expect(res.body.user.password).toBeUndefined();
  });

  it("should reject registration with missing fields", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "missing-fields@example.com",
      password: "password123",
    });
    expect(res.status).toBe(400);
  });

  it("should reject registration with an invalid email format", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "password123",
      name: "Bad Email",
    });
    expect(res.status).toBe(400);
  });

  it("should reject registration with a password shorter than 8 characters", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "short-password@example.com",
      password: "short1",
      name: "Short Password",
    });
    expect(res.status).toBe(400);
  });

  it("should reject registration with a duplicate email", async () => {
    const first = await request(app).post("/api/auth/register").send({
      email: "duplicate@example.com",
      password: "password123",
      name: "First",
    });
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/auth/register").send({
      email: "duplicate@example.com",
      password: "password456",
      name: "Second",
    });
    expect(second.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await request(app).post("/api/auth/register").send({
      email: "login-user@example.com",
      password: "correct-password",
      name: "Login User",
    });
  });

  it("should log in with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login-user@example.com",
      password: "correct-password",
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe("login-user@example.com");
  });

  it("should reject login with missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login-user@example.com",
    });
    expect(res.status).toBe(400);
  });

  it("should reject login with an unknown email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "no-such-user@example.com",
      password: "whatever123",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("should reject login with the wrong password using the same generic message", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login-user@example.com",
      password: "wrong-password",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });
});

describe("POST /api/auth/logout", () => {
  it("should invalidate the token for future protected-route use", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "logout-user@example.com",
      password: "password123",
      name: "Logout User",
    });
    const token = registerRes.body.token;

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    const reuseRes = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Should be rejected", content: "Token is revoked." });
    expect(reuseRes.status).toBe(401);
  });

  it("should reject logout without a token", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(401);
  });
});
