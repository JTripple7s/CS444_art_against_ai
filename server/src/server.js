require("dotenv").config();
const { initDB } = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initDB();
    console.log("Connected to SQLite database.");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();