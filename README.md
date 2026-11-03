# GradSetu — Early Access & Waitlist Platform

A modern, high-performance waitlist landing page and founder admin console designed for **GradSetu** — a student-focused ecosystem bridging the information gap across Indian college campuses.

![Brand Identity](logo.jpeg)

---

## ⚡ Design System & Visual Identity

- **Design Philosophy**: Pure White + Electric Blue (`#1769FF` / `#0B57D0`) inspired by Linear precision, Stripe visual clarity, and Notion minimalism.
- **Typography**: Plus Jakarta Sans & Inter hierarchy.
- **Componentry**:
  - Reelmark curved dynamic campus collaboration carousel
  - High-precision 4-unit launch countdown (Nov 20, 2026, 12:00 PM IST)
  - 3-step progressive early access pass registration
  - Dynamic pass card generator with referral link & WhatsApp sharing
  - Custom Electric Blue confetti celebration
  - Real-time Founder Admin Dashboard (`/admin`)

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Pure semantic HTML5, modern vanilla CSS3 design tokens, ES Modules JavaScript.
- **Backend / API**: Node.js micro-server (`server.js`) with serverless function handlers in `/api` for Vercel deployment.
- **Database / Storage**:
  - Live bi-directional sync with Google Sheets (via Google Apps Script Web App API)
  - High-speed LocalStorage fallback cache
  - Optional Supabase integration layer

---

## 🚀 Getting Started

### 1. Local Development Server

Run the local server to serve both the landing page and founder admin console:

```bash
node server.js
```

- **Waitlist Landing Page**: [http://localhost:3000/](http://localhost:3000/)
- **Founder Admin Console**: [http://localhost:3000/admin](http://localhost:3000/admin) *(Founder passkey required)*

### 2. Google Sheets Setup

1. Open a new Google Sheet at [sheets.new](https://sheets.new).
2. Navigate to **Extensions → Apps Script**.
3. Copy & paste the code from [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
4. Click **Deploy → New deployment → Web app**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
5. Copy the deployed Web App URL and paste it in `server.js` or via the **Sheets Config** modal in `/admin`.

---

## 📁 Repository Structure

```
├── admin.html               # Founder Admin Console & Student Registry
├── index.html               # Main Waitlist Landing Page
├── server.js                # Local server & Google Sheets API proxy
├── vercel.json              # Vercel deployment configuration & routing
├── api/                     # Serverless API routes (for Vercel)
│   ├── register.js          # Registration proxy endpoint
│   ├── admin-data.js        # Admin data proxy endpoint
│   └── lookup.js            # Pass lookup proxy endpoint
├── css/
│   └── style.css            # Complete Pure White + Electric Blue stylesheet
├── js/
│   ├── app.js               # Application coordinator & form validation
│   ├── carousel.js          # Curved carousel canvas engine
│   ├── confetti.js          # Custom celebration confetti engine
│   ├── countdown.js         # Countdown calculation to launch date
│   └── googleSheetsService.js # Google Sheets sync & cache layer
├── images/                  # Campus collaboration imagery
├── google-apps-script/
│   └── Code.gs              # Production Google Apps Script Web App
└── logo.jpeg                # GradSetu brand logo
```

---

## 🔒 Security & Privacy

- Client-secret verification on all Google Sheets API calls (`gs_sec_launch_nov2026_gradsetu`).
- Encrypted student coordinate handling with zero-spam privacy guarantee.
- Founder admin passkey protection with instant session locking.

