const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const https = require("https");

const app = express();
app.use(cors());
app.use(express.json());

const DELTA_BASE = "https://api.delta.exchange";

function sign(secret, method, path, timestamp, body = "") {
  const message = method + timestamp + path + body;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function deltaRequest(method, path, key, secret, bodyObj = null) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyStr = bodyObj ? JSON.stringify(bodyObj) : "";
    const sig = sign(secret, method.toUpperCase(), path, timestamp, bodyStr);

    const options = {
      hostname: "api.delta.exchange",
      path,
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        "api-key": key,
        "timestamp": timestamp,
        "signature": sig,
        "User-Agent": "PRAVIN-Terminal/1.0",
      },
    };

    if (bodyStr) {
      options.headers["Content-Length"] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Invalid JSON from Delta"));
        }
      });
    });

    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

app.get("/", (req, res) => {
  res.json({ status: "PRAVIN+ backend running", time: new Date().toISOString() });
});

app.post("/balance", async (req, res) => {
  const { key, secret } = req.body;
  if (!key || !secret) return res.status(400).json({ error: "key and secret required" });
  try {
    const data = await deltaRequest("GET", "/v2/wallet/balances", key, secret);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/positions", async (req, res) => {
  const { key, secret } = req.body;
  if (!key || !secret) return res.status(400).json({ error: "key and secret required" });
  try {
    const data = await deltaRequest("GET", "/v2/positions/margined", key, secret);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/orders", async (req, res) => {
  const { key, secret } = req.body;
  if (!key || !secret) return res.status(400).json({ error: "key and secret required" });
  try {
    const data = await deltaRequest("GET", "/v2/orders?state=open", key, secret);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/orders/history", async (req, res) => {
  const { key, secret, product_id } = req.body;
  if (!key || !secret) return res.status(400).json({ error: "key and secret required" });
  try {
    const path = product_id ? `/v2/orders/history?product_id=${product_id}` : "/v2/orders/history";
    const data = await deltaRequest("GET", path, key, secret);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/place-order", async (req, res) => {
  const { key, secret, ...orderBody } = req.body;
  if (!key || !secret) return res.status(400).json({ error: "key and secret required" });
  try {
    const data = await deltaRequest("POST", "/v2/orders", key, secret, orderBody);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/cancel-order", async (req, res) => {
  const { key, secret, id, product_id } = req.body;
  if (!key || !secret) return res.status(400).json({ error: "key and secret required" });
  try {
    const data = await deltaRequest("DELETE", `/v2/orders/${id}`, key, secret, { product_id });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/products", async (req, res) => {
  try {
    const data = await new Promise((resolve, reject) => {
      https.get(`${DELTA_BASE}/v2/products`, (response) => {
        let raw = "";
        response.on("data", (c) => (raw += c));
        response.on("end", () => resolve(JSON.parse(raw)));
      }).on("error", reject);
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/ticker/:symbol", async (req, res) => {
  try {
    const data = await new Promise((resolve, reject) => {
      const path = `/v2/tickers/${encodeURIComponent(req.params.symbol)}`;
      https.get(`${DELTA_BASE}${path}`, (response) => {
        let raw = "";
        response.on("data", (c) => (raw += c));
        response.on("end", () => resolve(JSON.parse(raw)));
      }).on("error", reject);
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/profile", async (req, res) => {
  const { key, secret } = req.body;
  if (!key || !secret) return res.status(400).json({ error: "key and secret required" });
  try {
    const data = await deltaRequest("GET", "/v2/profile", key, secret);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅  PRAVIN+ backend running on port ${PORT}`);
});
