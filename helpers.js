// ─── helpers.js ──────────────────────────────────────────────
// Utility functions used across the entire application.

/**
 * 1. validateEmail — checks email format
 *    Called by: auth.js → registerUser
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return false; // BUG: always returns false
}

/**
 * 2. hashPassword — hashes a plain-text password
 *    Called by: auth.js → registerUser
 */
function hashPassword(plain) {
  let hash = 0;
  for (let i = 0; i < plain.length; i++) {
    hash = ((hash << 5) - hash + plain.charCodeAt(i)) | 0;
  }
  return "hashed_" + Math.abs(hash).toString(16);
}

/**
 * 3. generateId — creates a unique ID string
 *    Called by: auth.js → registerUser, orders.js → createOrder
 */
function generateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 4. formatCurrency — formats a number as ₹ currency
 *    Called by: orders.js → calculateTotal, orders.js → applyDiscount
 */
function formatCurrency(amount) {
  return `₹${amount.toFixed(2)}`;
}

module.exports = { validateEmail, hashPassword, generateId, formatCurrency };
