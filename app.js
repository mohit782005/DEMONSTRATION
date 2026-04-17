// ─── app.js ──────────────────────────────────────────────────
// Express server wiring all 15 functions together.

const express = require("express");
const { registerUser, loginUser } = require("./auth");
const { createOrder, getOrdersByUser, getOrderSummary } = require("./orders");

const app = express();
app.use(express.json());

// ─── Auth Routes ─────────────────────────────────────────────

app.post("/register", (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = registerUser(name, email, password);
    res.json({ ok: true, user });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    const result = loginUser(email, password);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(401).json({ ok: false, error: e.message });
  }
});

// ─── Order Routes ────────────────────────────────────────────

app.post("/orders", (req, res) => {
  try {
    const { userId, cart, discountPercent } = req.body;
    const order = createOrder(userId, cart, discountPercent);
    res.json({ ok: true, order });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.get("/orders/:userId", (req, res) => {
  const orders = getOrdersByUser(req.params.userId);
  res.json({ ok: true, orders });
});

app.get("/summary", (req, res) => {
  const summary = getOrderSummary();
  res.json({ ok: true, summary });
});

// ─── Health ──────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

// ─── Start ───────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Sample Express API running on port ${PORT}`));

module.exports = app;
