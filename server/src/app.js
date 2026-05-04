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

app.get("/", (req, res) => {
  res.json({ message: "API is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/artworks", artworkRoutes);
app.use("/api/users", userRoutes);

module.exports = app;
