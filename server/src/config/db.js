const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

let db;

async function initDB() {
  if (db) return db;

  // The database folder is in server/src/database
  const dbPath = path.join(__dirname, "../database/AAA.db");
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS artworks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      vote_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Try to add vote_count if it doesn't exist (for existing databases)
  try {
    await db.exec("ALTER TABLE artworks ADD COLUMN vote_count INTEGER DEFAULT 0");
  } catch (e) {
    // Column might already exist
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      followed_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (follower_id) REFERENCES users (id),
      FOREIGN KEY (followed_id) REFERENCES users (id),
      UNIQUE(follower_id, followed_id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS artwork_votes (
      user_id INTEGER NOT NULL,
      artwork_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, artwork_id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (artwork_id) REFERENCES artworks (id)
    )
  `);

  return db;
}

function getDB() {
  if (!db) {
    throw new Error("Database not initialized. Call initDB() first.");
  }
  return db;
}

module.exports = { initDB, getDB };