const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY    = process.env.DELTA_API_KEY;
const API_SECRET = process.env.DELTA_API_SECRET;

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'PRAVIN+ backend running' });
});

// Balance endpoint
app.post('/balance', async (req, res) => {
  try {
    const key    = API_KEY    || req.body.key;
    const secret = API_SECRET || req.body.secret;

    const response = await fetch('https://api.india.delta.exchange/v2/wallet/balances', {
      method: 'GET',
      headers: {
        'api-key': key,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.json({ error: { code: 'backend_error', message: err.message }, success: false });
  }
});

app.listen(process.env.PORT || 10000, () => {
  console.log('Server running');
});
