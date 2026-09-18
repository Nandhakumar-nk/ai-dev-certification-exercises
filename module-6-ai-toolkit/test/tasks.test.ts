import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/index";
import { resetTasks } from "../src/routes/tasks";
import { resetUsers } from "../src/routes/users";

const API_KEY = "test-api-key";

describe("Task API", () => {
  beforeEach(() => {
    resetTasks();
    resetUsers();
    process.env.API_KEY = API_KEY;
  });

  it("GET /api/tasks should return all tasks", async () => {
    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${API_KEY}`);

    expect(res.status).toBe(200);
    expect(res.body.tasks).toBeDefined();
    expect(res.body.total).toBe(3);
  });

  it("POST /api/tasks should create a new task", async () => {
    const newTask = {
      title: "New test task",
      description: "A task created in a test",
      priority: "low",
      tags: ["test"],
    };

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${API_KEY}`)
      .send(newTask);

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe("New test task");
    expect(res.body.task.status).toBe("todo");
    expect(res.body.task.id).toBeDefined();
  });

  it("GET /api/tasks/:id should return a specific task", async () => {
    const res = await request(app)
      .get("/api/tasks/task-001")
      .set("Authorization", `Bearer ${API_KEY}`);

    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe("Set up project structure");
  });

  it("GET /api/tasks/:id should return 404 for missing task", async () => {
    const res = await request(app)
      .get("/api/tasks/nonexistent")
      .set("Authorization", `Bearer ${API_KEY}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Task not found");
  });

  it("DELETE /api/tasks/:id should remove a task", async () => {
    const res = await request(app)
      .delete("/api/tasks/task-001")
      .set("Authorization", `Bearer ${API_KEY}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Task deleted");

    // Verify it's gone
    const checkRes = await request(app)
      .get("/api/tasks/task-001")
      .set("Authorization", `Bearer ${API_KEY}`);
    expect(checkRes.status).toBe(404);
  });

  it("GET /api/tasks without a token should be rejected", async () => {
    const res = await request(app).get("/api/tasks");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("GET /api/tasks with an invalid token should be rejected", async () => {
    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", "Bearer wrong-key");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });
});
