const {
  validateSignupInput,
  validateLoginInput,
} = require("../utils/validators");
const { getUserByEmail, createUser, getUserById } = require("../services/userService");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../services/authService");

async function signup(req, res) {
  try {
    const { username, email, password } = req.body;

    const validationError = validateSignupInput({ username, email, password });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedUsername = username.trim();

    const existingUser = await getUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({ message: "Email is already in use." });
    }

    const passwordHash = await hashPassword(password);

    const user = await createUser({
      username: trimmedUsername,
      email: normalizedEmail,
      passwordHash,
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error during signup." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const validationError = validateLoginInput({ email, password });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
    };

    const token = generateToken(safeUser);

    return res.status(200).json({
      message: "Logged in successfully.",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
}

async function getCurrentUser(req, res) {
  try {
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ message: "Server error fetching user." });
  }
}

module.exports = {
  signup,
  login,
  getCurrentUser,
};