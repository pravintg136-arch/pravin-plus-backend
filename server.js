// ═══════════════════════════════════════════════════════
//  PRAVIN+ Backend — Render Deployment
//  Endpoints used by all HTML pages:
//    POST /balance         → main.html, orders.html, profile.html, apisetting.html
//    POST /positions       → main.html
//    POST /orders          → main.html, orders.html
//    POST /orders/history  → history.html
//    POST /place-order     → orders.html
//    POST /cancel-order    → main.html, orders.html
//    POST /profile         → apisetting.html (direct key test)
// ═══════════════════════════════════════════════════════

const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto'); // built-in — no install needed

const app = express();
app.use(cors());
app.use(express.json());

const BASE = 'https://api.india.delta.exchange';

// ── HELPERS ───────────────────────────────────────────
function makeHeaders(key, secret, method, path, bodyStr = '') {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload   = method + timestamp + path + bodyStr;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return {
    'api-key':      key,
    'timestamp':    timestamp,
    'signature':    signature,
    'Accept':       'application/json',
    'Content-Type': 'application/json'
  };
}

function getKeys(req) {
  return {
    key:    process.env.DELTA_API_KEY    || req.body?.key,
    secret: process.env.DELTA_API_SECRET || req.body?.secret
  };
}

function missingKeys(res) {
  return res.status(400).json({ error: { code: 'missing_keys', message: 'API key/secret not provided' }, success: false });
}

// ── HEALTH CHECK ──────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'PRAVIN+ backend running ✓', version: '2.0', time: new Date().toISOString() });
});

// ── /balance ──────────────────────────────────────────
// Used by: main.html, orders.html, profile.html, apisetting.html
app.post('/balance', async (req, res) => {
  try {
    const { key, secret } = getKeys(req);
    if (!key || !secret) return missingKeys(res);

    const path = '/v2/wallet/balances';
    const r    = await fetch(BASE + path, {
      method: 'GET',
      headers: makeHeaders(key, secret, 'GET', path)
    });
    const data = await r.json();

    // Normalise: ensure each wallet has a .balance field
    // Delta returns available_balance — add alias so all pages work
    if (data.result && Array.isArray(data.result)) {
      data.result = data.result.map(w => ({
        ...w,
        balance: w.available_balance ?? w.wallet_balance ?? w.balance ?? 0
      }));
    }

    res.json(data);
  } catch (e) {
    res.json({ error: { code: 'backend_error', message: e.message }, success: false });
  }
});

// ── /positions ────────────────────────────────────────
// Used by: main.html
app.post('/positions', async (req, res) => {
  try {
    const { key, secret } = getKeys(req);
    if (!key || !secret) return missingKeys(res);

    const path = '/v2/positions/margined';
    const r    = await fetch(BASE + path, {
      method: 'GET',
      headers: makeHeaders(key, secret, 'GET', path)
    });
    res.json(await r.json());
  } catch (e) {
    res.json({ error: { code: 'backend_error', message: e.message }, success: false });
  }
});

// ── /orders  (open orders) ────────────────────────────
// Used by: main.html, orders.html
app.post('/orders', async (req, res) => {
  try {
    const { key, secret } = getKeys(req);
    if (!key || !secret) return missingKeys(res);

    const path = '/v2/orders?state=open';
    const r    = await fetch(BASE + path, {
      method: 'GET',
      headers: makeHeaders(key, secret, 'GET', path)
    });
    res.json(await r.json());
  } catch (e) {
    res.json({ error: { code: 'backend_error', message: e.message }, success: false });
  }
});

// ── /orders/history ───────────────────────────────────
// Used by: history.html
app.post('/orders/history', async (req, res) => {
  try {
    const { key, secret } = getKeys(req);
    if (!key || !secret) return missingKeys(res);

    // Fetch last 100 closed/filled/cancelled orders
    const path = '/v2/orders?state=closed&page_size=100';
    const r    = await fetch(BASE + path, {
      method: 'GET',
      headers: makeHeaders(key, secret, 'GET', path)
    });
    res.json(await r.json());
  } catch (e) {
    res.json({ error: { code: 'backend_error', message: e.message }, success: false });
  }
});

// ── /place-order ──────────────────────────────────────
// Used by: orders.html
// Body fields: product_id, side, size, leverage, order_type, limit_price (optional)
app.post('/place-order', async (req, res) => {
  try {
    const { key, secret } = getKeys(req);
    if (!key || !secret) return missingKeys(res);

    const { product_id, side, size, leverage, order_type, limit_price } = req.body;

    const orderBody = { product_id, side, size, order_type: order_type || 'market_order' };
    if (limit_price)  orderBody.limit_price  = String(limit_price);
    if (leverage)     orderBody.leverage      = String(leverage);

    const path    = '/v2/orders';
    const bodyStr = JSON.stringify(orderBody);

    const r = await fetch(BASE + path, {
      method:  'POST',
      headers: makeHeaders(key, secret, 'POST', path, bodyStr),
      body:    bodyStr
    });
    res.json(await r.json());
  } catch (e) {
    res.json({ error: { code: 'backend_error', message: e.message }, success: false });
  }
});

// ── /cancel-order ─────────────────────────────────────
// Used by: main.html, orders.html
// Body fields: id (order id), product_id
app.post('/cancel-order', async (req, res) => {
  try {
    const { key, secret } = getKeys(req);
    if (!key || !secret) return missingKeys(res);

    const { id, product_id } = req.body;

    const path    = '/v2/orders';
    const bodyStr = JSON.stringify({ id, product_id });

    const r = await fetch(BASE + path, {
      method:  'DELETE',
      headers: makeHeaders(key, secret, 'DELETE', path, bodyStr),
      body:    bodyStr
    });
    res.json(await r.json());
  } catch (e) {
    res.json({ error: { code: 'backend_error', message: e.message }, success: false });
  }
});

// ── /profile ──────────────────────────────────────────
// Used by: apisetting.html (direct key verification test)
app.post('/profile', async (req, res) => {
  try {
    const { key, secret } = getKeys(req);
    if (!key || !secret) return missingKeys(res);

    const path = '/v2/profile';
    const r    = await fetch(BASE + path, {
      method: 'GET',
      headers: makeHeaders(key, secret, 'GET', path)
    });
    res.json(await r.json());
  } catch (e) {
    res.json({ error: { code: 'backend_error', message: e.message }, success: false });
  }
});

// ── START ─────────────────────────────────────────────
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ PRAVIN+ backend running on port ${PORT}`);
  console.log(`   API keys from env: ${process.env.DELTA_API_KEY ? '✓ set' : '✗ not set (will use request body)'}`);
});
