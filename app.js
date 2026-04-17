// ─── app.js ──────────────────────────────────────────────────
// Express server wiring all 15 functions together.
// Streams ALL logs to Nexus-X via WebSocket (like nexus attach).

const express = require("express");
const WebSocket = require("ws");
const { registerUser, loginUser } = require("./auth");
const { createOrder, getOrdersByUser, getOrderSummary } = require("./orders");

const NEXUS_API_URL = process.env.NEXUS_API_URL || "";
const NEXUS_PROJECT = process.env.NEXUS_PROJECT || "mohit-s-workspace/DEMONSTRATION";

const app = express();
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
// Nexus-X WebSocket Telemetry — streams every log to dashboard
// ═══════════════════════════════════════════════════════════════

let nexusWs = null;

function connectToNexus() {
  if (!NEXUS_API_URL) return;

  const parts = NEXUS_PROJECT.split("/");
  const wsBase = NEXUS_API_URL.replace("https://", "wss://").replace("http://", "ws://");
  const wsUrl = `${wsBase}/ws/runner/${parts[0]}/${parts[1]}`;

  console.log(`[Nexus-X] Connecting WebSocket → ${wsUrl}`);

  nexusWs = new WebSocket(wsUrl);

  nexusWs.on("open", () => {
    console.log("[Nexus-X] ✅ WebSocket connected — streaming logs to dashboard");
    // Send initial handshake
    nexusWs.send(JSON.stringify({
      type: "init",
      command: "node app.js",
      cwd: process.cwd(),
      timestamp: Date.now(),
    }));
  });

  nexusWs.on("close", () => {
    console.log("[Nexus-X] WebSocket disconnected — reconnecting in 5s...");
    setTimeout(connectToNexus, 5000);
  });

  nexusWs.on("error", (err) => {
    console.error(`[Nexus-X] WebSocket error: ${err.message}`);
  });
}

function sendLog(line, stream = "stdout") {
  if (nexusWs && nexusWs.readyState === WebSocket.OPEN) {
    nexusWs.send(JSON.stringify({
      type: "log",
      line: line,
      stream: stream,
      ts: Date.now(),
    }));
  }
}

function sendExit(code) {
  if (nexusWs && nexusWs.readyState === WebSocket.OPEN) {
    nexusWs.send(JSON.stringify({
      type: "exit",
      code: code,
      ts: Date.now(),
    }));
  }
}

// ── Intercept console.log & console.error ──
const _origLog = console.log;
const _origErr = console.error;

console.log = function (...args) {
  const line = args.map(String).join(" ");
  _origLog.apply(console, args);
  sendLog(line, "stdout");
};

console.error = function (...args) {
  const line = args.map(String).join(" ");
  _origErr.apply(console, args);
  sendLog(line, "stderr");
};

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
  console.error("🚨 CRASH TRIGGERED BY USER — simulating fatal error...");
  res.json({ message: "Crashing in 1 second..." });
  setTimeout(() => {
    throw new Error("FATAL: Unhandled payment gateway timeout in processCheckout()");
  }, 1000);
});

// ─── Error Handlers ──────────────────────────────────────────

// Global Express error handler
app.use((err, req, res, next) => {
  console.error(`[Express Error] ${err.message}`);
  res.status(500).json({ ok: false, error: err.message });
});

// Catch uncaught exceptions — report to Nexus then exit
process.on("uncaughtException", (err) => {
  console.error(`[FATAL] ${err.message}`);
  console.error(err.stack);
  sendExit(1);
  setTimeout(() => process.exit(1), 2000);
});

// ─── Start ───────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Sample Express API running on port ${PORT}`);
  // Connect to Nexus-X via WebSocket after server starts
  connectToNexus();
});

module.exports = app;
