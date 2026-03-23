require('dotenv').config();
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

/* Serve the static site (parent folder) so client and API share origin */
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 3000;

/* Simple auth check for required env vars */
if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
  console.warn('Warning: GMAIL_USER and GMAIL_PASS are not set. Server will start but send attempts will fail. See .env.example');
}

/* Nodemailer transporter using Gmail SMTP (App Password recommended)
   For production use OAuth2 or a transactional email provider.
*/
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

app.post('/send', async (req, res) => {
  const { name, email, type, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }

  const to = process.env.TO_EMAIL || process.env.GMAIL_USER;
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject: `Website contact from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nType: ${type || 'N/A'}\n\n${message}`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error sending mail:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
    res.json({ ok: true });
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
