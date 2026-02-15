# XtapX — CLAUDE.md

Cryptographic NFC verification system built for **CalgaryHacks 2026**. Combats physical misinformation by leveraging NTAG 424 DNA hardware to generate mathematically verifiable proofs of authenticity on every tap.

---

## Project Structure

```
XtapX/
├── server.js                   # Express entry point, middleware, route mounting
├── package.json                # Backend dependencies
├── .env                        # Supabase URL/keys, MASTER_KEY, PORT, BASE_URL
├── src/
│   ├── db.js                   # Supabase client singleton
│   ├── crypto.js               # AES-128-CBC, CMAC, key generation, storage encryption
│   ├── anomaly.js              # Counter, velocity, geographic, post-transfer analysis
│   └── routes/
│       ├── verify.js           # GET /verify (browser redirect) + /verify/api + /verify/lookup/:uid
│       ├── register.js         # POST /api/register, /api/simulate-scan, GET /api/tags
│       ├── claim.js            # POST /api/claim
│       ├── transfer.js         # POST /api/transfer, /api/transfer/accept, GET /api/transfer/:uid
│       └── history.js          # GET /api/history/:uid
├── scripts/
│   └── seed-demo.js            # Seeds 3 demo products (Nike, Adidas, Rolex)
├── public/                     # Built React SPA (output of `client` build)
│   └── assets/
└── client/                     # React 18 + Vite frontend
    ├── vite.config.js          # Dev server :5173, proxy /api+/verify → :5000, build → ../public
    ├── tailwind.config.js      # Custom vault/truth colors + animations
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx             # React Router: / /scan /history /register
    │   ├── index.css           # Tailwind + glow/scan-line/grid-bg utilities
    │   ├── utils/api.js        # fetch wrapper, formatDate, maskEmail
    │   ├── components/
    │   │   ├── Nav.jsx
    │   │   ├── StatusIndicator.jsx   # Pulsing dot: green/red/yellow/loading
    │   │   ├── ScrambleText.jsx      # Matrix-style character reveal animation
    │   │   └── ScanResultView.jsx    # Main verdict UI (LOADING/VERIFIED/SUSPICIOUS/ANOMALY)
    │   └── pages/
    │       ├── Landing.jsx     # Hero, features bento, how-it-works, live demo
    │       ├── Verify.jsx      # Reads ?result&reason&uid, fetches /verify/lookup/:uid
    │       ├── Register.jsx    # Admin tag registration + key display + sim tap
    │       └── History.jsx     # UID search → provenance chain + scan ledger
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express ^4.21.2 |
| Database | Supabase (PostgreSQL hosted) |
| Crypto | Node built-in `crypto` (AES-128-CBC, CMAC) |
| Frontend | React 18 + Vite 6 |
| Styling | Tailwind CSS 3 + custom theme |
| Animation | Framer Motion 11 |
| Routing | React Router DOM 7 |

---

## Commands

```bash
# Backend (from root)
node server.js                  # Start Express on PORT (default 5000)
node scripts/seed-demo.js       # Seed 3 demo products

# Frontend (from client/)
npm run dev                     # Vite dev server on :5173 (proxies /api + /verify to :5000)
npm run build                   # Build to ../public (production)
```

Both servers must run simultaneously for full dev experience.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/verify?d={enc}&m={cmac}` | Main NFC tap → redirects to `/scan?result=...` |
| GET | `/verify/api?d={enc}&m={cmac}` | Same verification, returns JSON |
| GET | `/verify/lookup/:uid` | Product + scan + ownership details (used by Verify page) |
| POST | `/api/register` | Register tag, generate AES-128 keys, returns keys (shown once) |
| POST | `/api/simulate-scan` | Fake scan without real hardware, returns verify URL |
| GET | `/api/tags` | List all registered tags (no keys) |
| POST | `/api/claim` | First ownership claim (requires ≥1 authentic scan) |
| POST | `/api/transfer` | Initiate transfer (seller) |
| POST | `/api/transfer/accept` | Accept transfer (buyer must have tapped tag — counter must advance) |
| GET | `/api/transfer/:uid` | List transfers for tag |
| GET | `/api/history/:uid` | Full provenance chain + scan ledger |
| GET | `/api/health` | Health check |

---

## Database Schema (Supabase)

**`tags`**: uid, secret_key_enc, cmac_key_enc, product_name, product_brand, product_image, product_sku, registered_by, last_counter, total_scans, current_owner, registered_at, status

**`scans`**: tag_uid, counter_value, result (authentic|suspicious|counterfeit), result_reason, ip_address, scanned_at

**`owners`**: tag_uid, owner_email, claimed_at, counter_at_claim, released_at, transfer_type (initial_claim|transfer_received)

**`transfers`**: tag_uid, from_email, to_email, transfer_token (UUID), counter_at_initiate, status (pending|completed), initiated_at, completed_at

---

## Core Cryptography (`src/crypto.js`)

- **`decryptPICCData(encryptedHex, keyHex)`** — AES-128-CBC decrypt; validates header byte `0xC7`, extracts uid (7B) + counter (3B)
- **`aesCMAC(keyHex, message)`** — RFC 4493 CMAC with K1/K2 subkeys from AES-ECB
- **`verifyCMAC(cmacHex, cmacKeyHex, uid, counter, encryptedHex)`** — Session vector → session key via CMAC → MAC over encrypted data → truncated 8-byte comparison
- **`generateTagKeys()`** — Returns random `{piccKey, cmacKey}` hex strings
- **`encryptKeyForStorage(keyHex)`** / **`decryptKeyFromStorage(stored)`** — AES-128-CBC with MASTER_KEY; format `{iv}:{ciphertext}`
- **`simulateTagScan(uid, counter, piccKeyHex, cmacKeyHex)`** — Builds + encrypts PICCData, computes CMAC; used for demo/testing

---

## Anomaly Detection (`src/anomaly.js`)

Four independent checks combined into `generateAnomalyReport()`:

| Check | Trigger | Result |
|-------|---------|--------|
| Counter regression | counter < last_counter | **clone** |
| Counter unchanged | counter == last_counter | **replay** |
| Counter gap >50 | difference > 50 | suspicious |
| Velocity | ≥20 scans in 10 min | suspicious |
| Geographic | Different IP within 5 min | suspicious |
| Post-transfer | 3+ different IPs after transfer | suspicious |

Overall status: `normal` → `suspicious` → `replay` → `clone`

---

## Verification Flow

1. NFC tap opens `/verify?d={enc}&m={cmac}` in browser
2. Server iterates all registered tags, attempts AES-128-CBC decryption
3. Tag identified by valid decryption + `0xC7` header
4. CMAC signature validated (ensures tag not tampered/spoofed)
5. Anomaly detection runs on counter + velocity + geography
6. Scan logged to `scans` table; tag counters updated
7. Browser redirected to `/scan?result={result}&reason={reason}&uid={uid}`
8. Verify page shows LOADING → fetches `/verify/lookup/:uid` → renders verdict

---

## UI Design System

**Colors** (Tailwind custom):
- Background: `vault-black` (#000000), `vault-card` (#1A1A1A), `vault-border` (#2A2A2A)
- Accent: `truth-green` (#00FF41), `truth-red` (#FF003C), `truth-blue` (#00F0FF)

**Fonts**: Space Grotesk (display), JetBrains Mono (code/UIDs/counters)

**Animations**: pulse-green, pulse-red, scan-line, glitch (keyframe), Framer Motion spring/stagger

**ScanResultView states**:
- `LOADING` — skeleton + scramble text animation (1.8s)
- `VERIFIED` — green banner + bento grid (product, crypto proof, owner, scan#, provenance)
- `SUSPICIOUS` — yellow banner + anomaly detail
- `ANOMALY` — red banner + rejection analysis + "Physical Misinformation Detected" warning

---

## Ownership Model

- **Claim**: Consumer taps (proves authenticity via scan count ≥1), enters email
- **Transfer**: Seller initiates with buyer email → buyer taps tag → counter must advance vs `counter_at_initiate` → buyer accepts with token
- **Immutable**: All ownership events recorded with counter snapshot; full chain queryable

---

## Environment Variables

```env
SUPABASE_URL=          # Supabase project URL
SUPABASE_SERVICE_KEY=  # Supabase service role key
PORT=5000
HOST=0.0.0.0
MASTER_KEY=            # 32 hex chars = 16 bytes for AES-128 storage encryption
BASE_URL=              # Full URL shown in NFC tag template (e.g. https://xtapx.com)
```

---

## Demo Products (from seed-demo.js)

| UID | Product |
|-----|---------|
| 04A23B1C2D3E4F | Nike Air Jordan 1 Retro High OG |
| 04B45D2E3F4A5B | Adidas Ultra Boost 22 |
| 04C67F3A4B5C6D | Rolex Classic Leather Watch |

Use `/api/simulate-scan` with these UIDs to generate valid verification URLs for demos.
