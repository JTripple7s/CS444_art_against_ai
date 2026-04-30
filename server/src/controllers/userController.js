const { getDB } = require("../config/db");

const followUser = async (req, res) => {
  const { id } = req.params; // ID of the user to follow
  const followerId = req.user.id;

  if (parseInt(id) === followerId) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  try {
    const db = getDB();
    
    // Check if target user exists
    const targetUser = await db.get("SELECT id FROM users WHERE id = ?", [id]);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already following
    const existingFollow = await db.get(
      "SELECT * FROM follows WHERE follower_id = ? AND followed_id = ?",
      [followerId, id]
    );

    if (existingFollow) {
      return res.status(400).json({ message: "You are already following this user" });
    }

    await db.run(
      "INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)",
      [followerId, id]
    );

    res.json({ message: "Successfully followed user" });
  } catch (error) {
    console.error("Database error during follow:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const unfollowUser = async (req, res) => {
  const { id } = req.params;
  const followerId = req.user.id;

  try {
    const db = getDB();
    
    await db.run(
      "DELETE FROM follows WHERE follower_id = ? AND followed_id = ?",
      [followerId, id]
    );

    res.json({ message: "Successfully unfollowed user" });
  } catch (error) {
    console.error("Database error during unfollow:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getFollowing = async (req, res) => {
    const userId = req.user.id;
    try {
        const db = getDB();
        const following = await db.all(
            "SELECT followed_id FROM follows WHERE follower_id = ?",
            [userId]
        );
        res.json(following.map(f => f.followed_id));
    } catch (error) {
        console.error("Database error fetching following list:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
  followUser,
  unfollowUser,
  getFollowing,
};
