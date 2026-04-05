const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Allow all origins for development to avoid CORS issues
app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API is running." });
});

app.use("/api/auth", authRoutes);

module.exports = app;