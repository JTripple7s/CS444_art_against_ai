const upload = require("../utils/multerConfig").single("image");
const { getDB } = require("../config/db");

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
      SELECT a.*, u.username as artist, u.profile_pic_url as artist_pic, u.bio as artist_bio,
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

const deleteArtwork = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const db = getDB();
    
    // Check if user owns the artwork
    const artwork = await db.get("SELECT user_id FROM artworks WHERE id = ?", [id]);
    if (!artwork) {
      return res.status(404).json({ message: "Artwork not found" });
    }
    if (artwork.user_id !== userId) {
      return res.status(403).json({ message: "You are not authorized to delete this artwork" });
    }

    // Delete artwork (votes and comments should be handled by ON DELETE CASCADE if enabled, 
    // or manually deleted here for safety in SQLite)
    await db.run("DELETE FROM artwork_votes WHERE artwork_id = ?", [id]);
    await db.run("DELETE FROM comments WHERE artwork_id = ?", [id]);
    await db.run("DELETE FROM artworks WHERE id = ?", [id]);

    res.json({ message: "Artwork deleted successfully" });
  } catch (error) {
    console.error("Database error during deletion:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addComment = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const userId = req.user.id;

  if (!text) {
    return res.status(400).json({ message: "Comment text is required" });
  }

  try {
    const db = getDB();
    const result = await db.run(
      "INSERT INTO comments (text, user_id, artwork_id) VALUES (?, ?, ?)",
      [text, userId, id]
    );

    // Fetch the new comment with user details
    const newComment = await db.get(`
      SELECT c.*, u.username as author, u.profile_pic_url as author_pic
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.lastID]);

    res.status(201).json({
      message: "Comment added successfully",
      comment: newComment
    });
  } catch (error) {
    console.error("Database error during comment addition:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getComments = async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDB();
    const comments = await db.all(`
      SELECT c.*, u.username as author, u.profile_pic_url as author_pic
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.artwork_id = ?
      ORDER BY c.created_at ASC
    `, [id]);
    res.json(comments);
  } catch (error) {
    console.error("Database error fetching comments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  uploadArtwork,
  getArtworks,
  getArtworkById,
  upvoteArtwork,
  removeUpvoteArtwork,
  deleteArtwork,
  addComment,
  getComments,
};
