# Scan Gem Flow — Jewellery Inventory System (jp2)

A full-stack jewellery stock management app with QR code scanning, barcode printing, inventory tracking, sales recording, and audit sessions.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Render (Static Site)

---

## ✅ What Changed in jp2

| # | Fix | Details |
|---|-----|---------|
| 1 | **Multi-scan support** | After scanning one item you can press "Scan Again" to scan more. The scanner now properly destroys and re-creates the camera instance each time — no more getting stuck after the first scan. |
| 2 | **Everyone is Admin** | All new sign-ups receive the `admin` role automatically. The staff role is removed from the UI. Admin menu is always visible to all logged-in users. |
| 3 | **ZD230TA Barcode Printing** | A 🖨️ Printer icon is added to every inventory row. Clicking it sends a ZPL label to your Zebra ZD230TA via Zebra BrowserPrint (desktop app). If BrowserPrint is not installed, it downloads a `.zpl` file you can send manually via USB / Zebra Setup Utilities. |

---

## Step 1 — Run Supabase Migrations

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your project → **SQL Editor** → **New query**
3. Paste `supabase/migrations/20260429075944_initial_schema.sql` → **Run**
4. New query → paste `supabase/migrations/20260429080012_functions_triggers.sql` → **Run**

---

## Step 2 — Push to GitHub

```bash
git init
git add .
git commit -m "jp2 - multi-scan, all-admin, ZD230TA barcode print"
git remote add origin https://github.com/YOUR_USERNAME/scan-gem-flow.git
git push -u origin main
```

---

## Step 3 — Deploy on Render

1. Go to [render.com](https://render.com) → **New → Static Site**
2. Connect your GitHub repo
3. Set:
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`
4. Under **Environment** tab, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Create Static Site**

> **Supabase Storage Note:** Lovable's hosted version uses shared cloud storage. When you self-host on Render + your own Supabase project, you get your own private PostgreSQL database on Supabase's free tier (500 MB). The README instructions above show exactly how to switch to your own Supabase project — your data stays in your account.

---

## Step 4 — ZD230TA Printer Setup

1. Install **Zebra BrowserPrint** on the Windows/Mac desktop that has the printer connected:
   https://www.zebra.com/us/en/support-downloads/software/utilities/browser-print.html
2. Connect your **ZD230TA** via USB.
3. In the app → Inventory → click the 🖨️ icon on any row.
4. The ZPL label is sent directly to the printer and printed instantly.

**No BrowserPrint?** The app downloads a `.zpl` file instead — open Zebra Setup Utilities and send it to the printer manually.

### ZPL Label Contents (50mm × 25mm)
- Code 128 barcode of the serial number (e.g. `RNG-0001`)
- Human-readable serial below the barcode
- Category name + weight + purchase price

---

## Features

| Feature | Description |
|---|---|
| Dashboard | Live stats: total stock, available, sold, monthly revenue |
| Inventory | Add items with auto serial numbers, view stock, download QR codes, print ZD230TA barcodes |
| Sales | Record sales, track buyer info, see history |
| Scan | Camera QR scanner or manual serial lookup — scan multiple items in one session |
| Audit | Start/end stock audit sessions, scan items to verify |
| Admin | Manage jewellery categories and users (all users are admin) |

## Serial Number Format

Serials are auto-generated as `PREFIX-XXXX` — e.g. `RNG-0001`, `RNG-0002`.

## User Roles

- **Admin (everyone):** Full access including category management, user management, delete, and barcode printing.
