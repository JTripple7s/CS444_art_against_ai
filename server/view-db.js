const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function viewUsers() {
  const dbPath = path.join(__dirname, "src/database/AAA.db");
  
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    const users = await db.all("SELECT id, username, email, created_at FROM users");
    
    console.log("\n--- Registered Users ---");
    if (users.length === 0) {
      console.log("No users found.");
    } else {
      console.table(users);
    }
    console.log("------------------------\n");

    await db.close();
  } catch (error) {
    console.error("Error reading database:", error.message);
  }
}

viewUsers();