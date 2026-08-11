import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "debugger.db");

let db: Database.Database;
let queryCount = 0;

export function resetQueryCount() {
  queryCount = 0;
}

export function getQueryCount() {
  return queryCount;
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, {
      verbose: () => {
        queryCount++;
      },
    });
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        createdAt TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        authorId INTEGER NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (authorId) REFERENCES users(id)
      );
    `);
  }
  return db;
}

// --- User queries ---

export function getAllUsers() {
  const db = getDb();
  return db.prepare("SELECT * FROM users ORDER BY id").all();
}

export function getUserById(id: number) {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

// BUG #1: Runtime error — can you spot it?
export function createUser(name: string, email: string) {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO users (name, email) VALUES (?, ?)")
    .run(name, email);
  return getUserById(result.lastInsertRowid as number);
}

// --- Post queries ---

export function getAllPosts() {
  const db = getDb();
  return db.prepare("SELECT * FROM posts ORDER BY createdAt DESC").all();
}

export function getPostsByAuthor(authorId: number) {
  const db = getDb();
  return db.prepare("SELECT * FROM posts WHERE authorId = ?").all(authorId);
}

export function createPost(title: string, body: string, authorId: number) {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO posts (title, body, authorId) VALUES (?, ?, ?)")
    .run(title, body, authorId);
  return db.prepare("SELECT * FROM posts WHERE id = ?").get(result.lastInsertRowid);
}

// BUG #2: Logic bug — post count is wrong
export function getUserWithPostCount(userId: number) {
  const db = getDb();
  const user = getUserById(userId) as any;
  if (!user) return null;

  // Count posts for this user
  const countResult = db
    .prepare("SELECT COUNT(*) as count FROM posts WHERE authorId = ?")
    .get(userId) as any;

  return {
    ...user,
    postCount: countResult.count,
  };
}

export function getAllPostsWithAuthors() {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT posts.*, users.id as authorUserId, users.name as authorName
      FROM posts
      LEFT JOIN users ON posts.authorId = users.id
      ORDER BY posts.createdAt DESC
    `
    )
    .all() as any[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    authorId: row.authorId,
    createdAt: row.createdAt,
    author: row.authorUserId ? { id: row.authorUserId, name: row.authorName } : null,
  }));
}
