const express = require('express');
const cors = require('cors');
const crypto = require('crypto'); // built-in, no install needed

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'PRAVIN+ backend running ✓' });
});

// ── /balance endpoint ──────────────────────────────────────────────
app.post('/balance', async (req, res) => {
  try {
    // Use env vars first, fall back to request body
    const api_key    = process.env.DELTA_API_KEY    || req.body.key;
    const api_secret = process.env.DELTA_API_SECRET || req.body.secret;

    if (!api_key || !api_secret) {
      return res.json({ error: 'missing_keys', success: false });
    }

    // Delta Exchange India requires HMAC signature
    const timestamp  = Math.floor(Date.now() / 1000).toString();
    const method     = 'GET';
    const path       = '/v2/wallet/balances';
    const payload    = method + timestamp + path;

    const signature = crypto
      .createHmac('sha256', api_secret)
      .update(payload)
      .digest('hex');

    const response = await fetch('https://api.india.delta.exchange' + path, {
      method: 'GET',
      headers: {
        'api-key':   api_key,
        'timestamp': timestamp,
        'signature': signature,
        'Accept':    'application/json',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.json({ error: { code: 'backend_error', message: err.message }, success: false });
  }
});

// ── /profile endpoint (for direct key test) ────────────────────────
app.post('/profile', async (req, res) => {
  try {
    const api_key    = process.env.DELTA_API_KEY    || req.body.key;
    const api_secret = process.env.DELTA_API_SECRET || req.body.secret;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method    = 'GET';
    const path      = '/v2/profile';
    const payload   = method + timestamp + path;

    const signature = crypto
      .createHmac('sha256', api_secret)
      .update(payload)
      .digest('hex');

    const response = await fetch('https://api.india.delta.exchange' + path, {
      method: 'GET',
      headers: {
        'api-key':   api_key,
        'timestamp': timestamp,
        'signature': signature,
        'Accept':    'application/json'
      }
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.json({ error: { code: 'backend_error', message: err.message }, success: false });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('PRAVIN+ backend running on port ' + PORT));
