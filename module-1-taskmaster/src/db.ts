import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "tasks.db");

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Task {
  id: number;
  title: string;
  status: "todo" | "done";
  priority: Priority;
  createdAt: string;
}

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate databases created before the priority column existed.
    const columns = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
    if (!columns.some((c) => c.name === "priority")) {
      db.exec("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM'");
    }
  }
  return db;
}

export function getAllTasks(): Task[] {
  const rows = getDb()
    .prepare("SELECT id, title, status, priority, created_at as createdAt FROM tasks ORDER BY id")
    .all();
  return rows as Task[];
}

export function addTask(title: string, priority: Priority = "MEDIUM"): Task {
  const stmt = getDb().prepare(
    "INSERT INTO tasks (title, priority) VALUES (?, ?)"
  );
  const result = stmt.run(title, priority);
  return {
    id: result.lastInsertRowid as number,
    title,
    status: "todo",
    priority,
    createdAt: new Date().toISOString(),
  };
}

export function markDone(id: number): boolean {
  const result = getDb()
    .prepare("UPDATE tasks SET status = 'done' WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function deleteTask(id: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM tasks WHERE id = ?")
    .run(id);
  return result.changes > 0;
}
