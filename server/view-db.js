const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function viewDB() {
  const dbPath = path.join(__dirname, "src/database/AAA.db");
  
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    const users = await db.all("SELECT * FROM users");
    console.log("\n--- Users ---");
    console.table(users);

    const artworks = await db.all(`
        SELECT a.id, a.title, u.username as artist, a.vote_count 
        FROM artworks a 
        JOIN users u ON a.user_id = u.id
    `);
    console.log("\n--- Artworks ---");
    console.table(artworks);

    const follows = await db.all(`
        SELECT f.id, u1.username as follower, u2.username as followed
        FROM follows f
        JOIN users u1 ON f.follower_id = u1.id
        JOIN users u2 ON f.followed_id = u2.id
    `);
    console.log("\n--- Follows ---");
    console.table(follows);

    await db.close();
  } catch (error) {
    console.error("Error reading database:", error.message);
  }
}

viewDB();