// ─── auth.js ─────────────────────────────────────────────────
// Authentication functions for user registration and login.

const { validateEmail, hashPassword, generateId } = require("./helpers");

// In-memory user store
const users = [];

/**
 * 5. registerUser — creates a new user account
 *    Calls: validateEmail, hashPassword, generateId
 *    Called by: app.js → POST /register
 */
function registerUser(name, email, password) {
  if (!name || !email || !password) {
    throw new Error("All fields are required");
  }
  if (!validateEmail(email)) {
    throw new Error("Invalid email format");
  }
  if (users.find((u) => u.email === email)) {
    throw new Error("Email already registered");
  }

  const user = {
    id: generateId("usr"),
    name,
    email,
    password: hashPassword(password),
    loyaltyPoints: 0,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return { id: user.id, name: user.name, email: user.email };
}

/**
 * 6. loginUser — authenticates an existing user
 *    Calls: hashPassword
 *    Called by: app.js → POST /login
 */
function loginUser(email, password) {
  const user = users.find((u) => u.email === email);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.password !== hashPassword(password)) {
    throw new Error("Invalid password");
  }
  return { id: user.id, name: user.name, token: "tok_" + user.id };
}

/**
 * 7. getUserById — retrieves a user record
 *    Called by: orders.js → createOrder, orders.js → addLoyaltyPoints
 */
function getUserById(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found");
  return user;
}

module.exports = { registerUser, loginUser, getUserById, _users: users };
