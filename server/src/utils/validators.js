function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateSignupInput({ username, email, password }) {
  if (!username || !email || !password) {
    return "Username, email, and password are required.";
  }

  if (username.trim().length < 3) {
    return "Username must be at least 3 characters long.";
  }

  if (!isValidEmail(email)) {
    return "Please enter a valid email address.";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters long.";
  }

  return null;
}

function validateLoginInput({ email, password }) {
  if (!email || !password) {
    return "Email and password are required.";
  }

  if (!isValidEmail(email)) {
    return "Please enter a valid email address.";
  }

  return null;
}

module.exports = {
  validateSignupInput,
  validateLoginInput,
};