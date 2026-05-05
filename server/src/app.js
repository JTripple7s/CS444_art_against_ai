const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const artworkRoutes = require("./routes/artworkRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploads as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve frontend static files from the root directory
app.use(express.static(path.join(__dirname, "../../")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../index.html"));
});

app.use("/api/auth", authRoutes);
app.use("/api/artworks", artworkRoutes);
app.use("/api/users", userRoutes);

// Fallback for SPA: send index.html for any other GET requests that aren't API
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "../../index.html"));
  }
});

module.exports = app;
