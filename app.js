// ─── app.js ──────────────────────────────────────────────────
// Express server wiring all 15 functions together.

const express = require("express");
const http = require("http");
const https = require("https");
const { registerUser, loginUser } = require("./auth");
const { createOrder, getOrdersByUser, getOrderSummary } = require("./orders");

const NEXUS_API_URL = process.env.NEXUS_API_URL || "";
const NEXUS_PROJECT = process.env.NEXUS_PROJECT || "mohit-s-workspace/DEMONSTRATION";

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

// ─── Trigger a crash (for demo) ──────────────────────────────

app.get("/crash", (req, res) => {
  res.json({ message: "Crashing in 1 second..." });
  setTimeout(() => {
    throw new Error("FATAL: Unhandled payment gateway timeout in processCheckout()");
  }, 1000);
});

// ─── Nexus-X Crash Reporter ─────────────────────────────────

function reportToNexus(errorMessage, stack) {
  if (!NEXUS_API_URL) return;
  const parts = NEXUS_PROJECT.split("/");
  const workspace = parts[0];
  const project = parts[1];
  const url = `${NEXUS_API_URL}/api/repo/${workspace}/${project}/logs`;

  const payload = JSON.stringify({
    logs: [
      { line: `[Render] CRASH: ${errorMessage}`, stream: "stderr", ts: Date.now() },
      { line: `[Render] Stack: ${(stack || "").split("\n").slice(0, 5).join(" | ")}`, stream: "stderr", ts: Date.now() },
    ],
    exit_code: 1,
  });

  const client = url.startsWith("https") ? https : http;
  const parsed = new URL(url);
  const opts = {
    hostname: parsed.hostname,
    port: parsed.port,
    path: parsed.pathname,
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
  };

  const req = client.request(opts, (res) => {
    console.log(`[Nexus-X] Crash reported → ${res.statusCode}`);
  });
  req.on("error", (e) => console.error(`[Nexus-X] Report failed: ${e.message}`));
  req.write(payload);
  req.end();
}

// Global Express error handler
app.use((err, req, res, next) => {
  console.error("[Express Error]", err.message);
  reportToNexus(err.message, err.stack);
  res.status(500).json({ ok: false, error: err.message });
});

// Catch uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("[FATAL]", err.message);
  reportToNexus(err.message, err.stack);
  setTimeout(() => process.exit(1), 2000); // give time for the HTTP request
});

// ─── Start ───────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Sample Express API running on port ${PORT}`);
  if (NEXUS_API_URL) {
    console.log(`📡 Nexus-X telemetry → ${NEXUS_API_URL} (${NEXUS_PROJECT})`);
  }
});

module.exports = app;
