const multer = require("multer");
const path = require("path");
const { getDB } = require("../config/db");

// Configure Multer for storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only images are allowed (jpeg, jpg, png, webp)"));
    }
  },
}).single("image");

const uploadArtwork = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded" });
    }

    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    try {
      const db = getDB();
      const imageUrl = `/uploads/${req.file.filename}`;
      const userId = req.user.id; // From authMiddleware

      const result = await db.run(
        "INSERT INTO artworks (title, description, image_url, user_id) VALUES (?, ?, ?, ?)",
        [title, description, imageUrl, userId]
      );

      res.status(201).json({
        message: "Artwork uploaded successfully",
        artwork: {
          id: result.lastID,
          title,
          description,
          image_url: imageUrl,
          user_id: userId,
        },
      });
    } catch (error) {
      console.error("Database error during upload:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
};

const getArtworks = async (req, res) => {
  const userId = req.user ? req.user.id : null;
  try {
    const db = getDB();
    // Join with users to get the username of the artist
    // Also join with artwork_votes to see if the current user upvoted
    const artworks = await db.all(`
      SELECT a.*, u.username as artist,
      (SELECT COUNT(*) FROM artwork_votes WHERE artwork_id = a.id) as votes,
      CASE WHEN ? IS NOT NULL THEN (SELECT 1 FROM artwork_votes WHERE artwork_id = a.id AND user_id = ?) ELSE 0 END as is_upvoted
      FROM artworks a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `, [userId, userId]);
    res.json(artworks);
  } catch (error) {
    console.error("Database error fetching artworks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getArtworkById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user ? req.user.id : null;
  try {
    const db = getDB();
    const artwork = await db.get(`
      SELECT a.*, u.username as artist,
      (SELECT COUNT(*) FROM artwork_votes WHERE artwork_id = a.id) as votes,
      CASE WHEN ? IS NOT NULL THEN (SELECT 1 FROM artwork_votes WHERE artwork_id = a.id AND user_id = ?) ELSE 0 END as is_upvoted
      FROM artworks a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `, [userId, userId, id]);

    if (!artwork) {
      return res.status(404).json({ message: "Artwork not found" });
    }

    res.json(artwork);
  } catch (error) {
    console.error("Database error fetching artwork:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const upvoteArtwork = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const db = getDB();
    
    // Check if already upvoted
    const existingVote = await db.get(
      "SELECT * FROM artwork_votes WHERE user_id = ? AND artwork_id = ?",
      [userId, id]
    );

    if (existingVote) {
      return res.status(400).json({ message: "You have already upvoted this artwork" });
    }

    // Add vote
    await db.run(
      "INSERT INTO artwork_votes (user_id, artwork_id) VALUES (?, ?)",
      [userId, id]
    );

    await db.run(
      "UPDATE artworks SET vote_count = vote_count + 1 WHERE id = ?",
      [id]
    );

    res.json({ message: "Artwork upvoted successfully" });
  } catch (error) {
    console.error("Database error during upvote:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const removeUpvoteArtwork = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const db = getDB();
    
    // Check if vote exists
    const existingVote = await db.get(
      "SELECT * FROM artwork_votes WHERE user_id = ? AND artwork_id = ?",
      [userId, id]
    );

    if (!existingVote) {
      return res.status(400).json({ message: "You have not upvoted this artwork" });
    }

    // Remove vote
    await db.run(
      "DELETE FROM artwork_votes WHERE user_id = ? AND artwork_id = ?",
      [userId, id]
    );

    await db.run(
      "UPDATE artworks SET vote_count = MAX(0, vote_count - 1) WHERE id = ?",
      [id]
    );

    res.json({ message: "Upvote removed successfully" });
  } catch (error) {
    console.error("Database error during upvote removal:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  uploadArtwork,
  getArtworks,
  getArtworkById,
  upvoteArtwork,
  removeUpvoteArtwork,
};
