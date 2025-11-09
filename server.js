// server.js
// Minimal Express server to create NOWPayments invoice
// Usage:
// 1. npm init -y
// 2. npm install express node-fetch dotenv
// 3. Create .env with NOWPAYMENTS_API_KEY=your_real_key
// 4. node server.js
//
// NOTE: For production, run behind HTTPS and validate inputs + protect endpoints.

const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // optional, serve index.html if placed in /public

const API_KEY = process.env.NOWPAYMENTS_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set NOWPAYMENTS_API_KEY in .env');
  process.exit(1);
}

app.post('/create-payment', async (req, res) => {
  try {
    const { price_amount, price_currency, order_description, is_fixed_rate } = req.body;

    // Basic validation
    if (!price_amount || Number(price_amount) <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    // Build body for NOWPayments invoice creation
    const body = {
      price_amount: Number(price_amount),
      price_currency: (price_currency || 'usd').toLowerCase(),
      // Optional: let buyer choose pay currency or fix it via "pay_currency"
      is_fee_paid_by_user: false,
      order_description: order_description ? String(order_description) : undefined,
      is_fixed_rate: !!is_fixed_rate,
      // Set URLs so user is redirected back after payment
      success_url: 'http://localhost:3000/success', // change to your domain
      cancel_url: 'http://localhost:3000/cancel'
    };

    // Remove undefined keys
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

    const resp = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json();

    if (!resp.ok) {
      // forward error message from NOWPayments
      return res.status(500).json({ message: data.message || 'NOWPayments error', raw: data });
    }

    // data.invoice_url contains the link where the customer can pay. Redirect client there.
    return res.json({ invoice_url: data.invoice_url, raw: data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// Simple success/cancel pages (optional)
app.get('/success', (req, res) => res.send('<h1>Payment success — thank you.</h1>'));
app.get('/cancel', (req, res) => res.send('<h1>Payment cancelled.</h1>'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
