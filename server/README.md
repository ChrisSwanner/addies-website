Server for sending contact form emails

Quick start

1. Copy `.env.example` to `.env` and set values (GMAIL_USER, GMAIL_PASS, TO_EMAIL).
   - For Gmail, create an App Password (recommended) and use it as `GMAIL_PASS`.
2. Install dependencies and start server:

```bash
cd server
npm install
npm start
```

3. Open http://localhost:3000 in your browser and submit the contact form.

Notes
- This server serves the static site (parent directory) so the client will POST to the same origin (`/send`).
- For production, consider using a transactional email provider (SendGrid, Mailgun) or OAuth2 for Gmail.
- Do not commit real credentials to source control.
