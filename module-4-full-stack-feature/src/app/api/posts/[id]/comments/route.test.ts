import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "./route";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/posts/1/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

let postId: number;

beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();

  const post = await prisma.post.create({
    data: { title: "Test Post", body: "Test body" },
  });
  postId = post.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/posts/[id]/comments", () => {
  it("creates a comment for an existing post", async () => {
    const res = await POST(
      postRequest({ authorName: "Alice", body: "Great post!" }),
      context(String(postId))
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({
      authorName: "Alice",
      body: "Great post!",
      postId,
    });
    expect(json.id).toBeTypeOf("number");

    const persisted = await prisma.comment.findMany({ where: { postId } });
    expect(persisted).toHaveLength(1);
    expect(persisted[0].authorName).toBe("Alice");
  });

  it("rejects an empty body", async () => {
    const res = await POST(
      postRequest({ authorName: "Alice", body: "" }),
      context(String(postId))
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "authorName and body are required",
    });
  });

  it("rejects an empty authorName", async () => {
    const res = await POST(
      postRequest({ authorName: "", body: "Great post!" }),
      context(String(postId))
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "authorName and body are required",
    });
  });

  it("rejects an invalid postId", async () => {
    const res = await POST(
      postRequest({ authorName: "Alice", body: "Great post!" }),
      context("abc")
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid post id" });
  });

  it("404s for a nonexistent post", async () => {
    const res = await POST(
      postRequest({ authorName: "Alice", body: "Great post!" }),
      context(String(postId + 1000))
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Post not found" });
  });
});

describe("GET /api/posts/[id]/comments", () => {
  it("lists comments for a post in ascending createdAt order", async () => {
    await prisma.comment.create({
      data: { postId, authorName: "Alice", body: "First" },
    });
    await prisma.comment.create({
      data: { postId, authorName: "Bob", body: "Second" },
    });

    const res = await GET(
      new Request("http://localhost/api/posts/1/comments"),
      context(String(postId))
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(json[0].body).toBe("First");
    expect(json[1].body).toBe("Second");
  });

  it("returns an empty list for a post with no comments", async () => {
    const res = await GET(
      new Request("http://localhost/api/posts/1/comments"),
      context(String(postId))
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("rejects an invalid postId", async () => {
    const res = await GET(
      new Request("http://localhost/api/posts/abc/comments"),
      context("abc")
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid post id" });
  });
});
