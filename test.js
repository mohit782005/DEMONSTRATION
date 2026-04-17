// ─── test.js ─────────────────────────────────────────────────
// Simple test runner that exercises the full call graph.
// Exit code 1 on any failure → triggers Nexus-X incident.

const { registerUser, loginUser, getUserById } = require("./auth");
const {
  checkStock, calculateTotal, applyDiscount, calculateTax,
  addLoyaltyPoints, createOrder, getOrdersByUser, getOrderSummary,
} = require("./orders");
const { validateEmail, hashPassword, generateId, formatCurrency } = require("./helpers");

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

console.log("\n═══════════════════════════════════════");
console.log("  Sample Express API — Test Suite");
console.log("═══════════════════════════════════════\n");

// ── Helpers ─────────────────────────────
console.log("📦 helpers.js");
assert("validateEmail accepts valid",    validateEmail("test@example.com"));
assert("validateEmail rejects invalid",  !validateEmail("nope"));
assert("hashPassword returns string",    typeof hashPassword("secret") === "string");
assert("generateId has prefix",          generateId("usr").startsWith("usr_"));
assert("formatCurrency formats",         formatCurrency(1234.5) === "₹1234.50");

// ── Auth ────────────────────────────────
console.log("\n🔐 auth.js");
const user = registerUser("Alice", "alice@shop.com", "pass123");
assert("registerUser returns id",        !!user.id);
assert("registerUser returns name",      user.name === "Alice");

const login = loginUser("alice@shop.com", "pass123");
assert("loginUser returns token",        login.token.startsWith("tok_"));

const fetched = getUserById(user.id);
assert("getUserById finds alice",        fetched.name === "Alice");

// ── Orders ──────────────────────────────
console.log("\n🛒 orders.js");
const stock = checkStock("p1", 2);
assert("checkStock finds product",       stock.name === "Wireless Mouse");

const total = calculateTotal([{ price: 599, qty: 2 }, { price: 2499, qty: 1 }]);
assert("calculateTotal = 3697",          total === 3697);

const disc = applyDiscount(3697, 10, 500);
assert("applyDiscount caps at 500",      disc <= 500);

const tax = calculateTax(3197);
assert("calculateTax returns number",    typeof tax === "number" && tax > 0);

// Full checkout
const order = createOrder(user.id, [
  { productId: "p1", qty: 2 },
  { productId: "p2", qty: 1 },
], 10);
assert("createOrder returns id",         !!order.id);
assert("createOrder status confirmed",   order.status === "confirmed");
assert("createOrder total > 0",          order.total > 0);

const userOrders = getOrdersByUser(user.id);
assert("getOrdersByUser finds 1",        userOrders.length === 1);

const summary = getOrderSummary();
assert("getOrderSummary totalOrders=1",  summary.totalOrders === 1);

// ── Results ────────────────────────────
console.log("\n═══════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════\n");

if (failed > 0) {
  console.error("❌ TEST SUITE FAILED");
  process.exit(1);
}
console.log("✅ ALL TESTS PASSED");
process.exit(0);
