const { getDB } = require("../config/db");

async function getUserByEmail(email) {
  const db = getDB();
  return db.get(`
    SELECT id, username, email, password_hash, profile_pic_url, bio, created_at
    FROM users
    WHERE email = ?
  `, [email]);
}

async function getUserById(id) {
  const db = getDB();
  return db.get(`
    SELECT u.id, u.username, u.email, u.profile_pic_url, u.bio, u.created_at,
    (SELECT COUNT(*) FROM follows WHERE followed_id = u.id) as followers_count,
    (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count
    FROM users u
    WHERE u.id = ?
  `, [id]);
}

async function updateUserProfile(id, { bio, profilePicUrl }) {
  const db = getDB();
  if (profilePicUrl) {
    await db.run(`
      UPDATE users 
      SET bio = ?, profile_pic_url = ?
      WHERE id = ?
    `, [bio, profilePicUrl, id]);
  } else {
    await db.run(`
      UPDATE users 
      SET bio = ?
      WHERE id = ?
    `, [bio, id]);
  }
  return getUserById(id);
}

async function createUser({ username, email, passwordHash }) {
  const db = getDB();
  const result = await db.run(`
    INSERT INTO users (username, email, password_hash)
    VALUES (?, ?, ?)
  `, [username, email, passwordHash]);

  return getUserById(result.lastID);
}

module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  updateUserProfile,
};