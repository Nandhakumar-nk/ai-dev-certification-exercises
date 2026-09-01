require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("./middleware/auth");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable must be set");
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: () => process.env.NODE_ENV === "test",
});

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
}

// Register a new user
app.post("/api/auth/register", authRateLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: passwordHash, name },
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Log in an existing user
app.post("/api/auth/login", authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);
    res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to log in" });
  }
});

// Log out (blacklist the presented token)
app.post("/api/auth/logout", requireAuth, async (req, res) => {
  try {
    const decoded = jwt.decode(req.token);
    await prisma.blacklistedToken.create({
      data: {
        token: req.token,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to log out" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// List all published posts
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Get a single post with comments
app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { comments: { orderBy: { createdAt: "desc" } } },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Create a new post
app.post("/api/posts", requireAuth, async (req, res) => {
  try {
    const { title, content, published } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published: published ?? false,
        authorId: req.user.id,
      },
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Update a post
app.put("/api/posts/:id", requireAuth, async (req, res) => {
  try {
    const { title, content, published } = req.body;

    const existing = await prisma.post.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!existing) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: "You can only update your own posts" });
    }

    const post = await prisma.post.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(published !== undefined && { published }),
      },
    });

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to update post" });
  }
});

// Delete a post
app.delete("/api/posts/:id", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.post.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!existing) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    await prisma.post.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Add a comment to a post
app.post("/api/posts/:id/comments", async (req, res) => {
  try {
    const { content, authorName } = req.body;

    if (!content || !authorName) {
      return res
        .status(400)
        .json({ error: "Content and authorName are required" });
    }

    const post = await prisma.post.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorName,
        postId: parseInt(req.params.id),
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Start server only when run directly (not imported for tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3456;
  app.listen(PORT, () => {
    console.log(`Blog API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
