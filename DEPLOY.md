# Achieve & Thrive 2026 — Steering Group
## Deployment Guide: Netlify PWA + Supabase Sync

---

## What you're deploying
- A React PWA (installable as a Mac/iPhone app from the browser)
- Persistent data stored in Supabase (free tier)
- Real-time sync: changes on one device appear instantly on others
- Hosted on Netlify (same as your correspondence tool)

---

## Step 1: Create your Supabase project (5 minutes)

1. Go to **https://supabase.com** → Sign in / Create account
2. Click **New Project**
   - Name: `achieve-thrive-steering`
   - Database password: choose something strong, save it
   - Region: **West EU (Ireland)** — closest to you
3. Wait ~2 minutes for it to spin up
4. Go to **Project Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

5. Go to **SQL Editor** → New Query → paste and run this:

```sql
CREATE TABLE IF NOT EXISTS programmes (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read/write" ON programmes
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO programmes (id, data) 
VALUES ('achieve-thrive-2026', '[]'::jsonb)
ON CONFLICT DO NOTHING;
```

---

## Step 2: Push to GitHub (2 minutes)

```bash
# In this folder:
git init
git add .
git commit -m "Initial deploy: AT Steering Group PWA"

# Create a new repo on github.com called 'at-steering-group' then:
git remote add origin https://github.com/YOUR_USERNAME/at-steering-group.git
git push -u origin main
```

---

## Step 3: Deploy on Netlify (3 minutes)

1. Go to **https://app.netlify.com** → Add new site → Import from GitHub
2. Select your `at-steering-group` repo
3. Build settings (should auto-detect):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Before clicking Deploy, go to **Environment variables** and add:
   - `VITE_SUPABASE_URL` = your Project URL from Step 1
   - `VITE_SUPABASE_ANON_KEY` = your anon public key from Step 1
5. Click **Deploy site**

Netlify will build and deploy in ~2 minutes.

---

## Step 4: Install as a Mac app (30 seconds)

1. Open your Netlify URL in **Safari** on Mac
2. In the menu bar: **File → Add to Dock**
   - Or share icon → "Add to Dock" on iPhone/iPad
3. It now appears in your Dock/Home Screen as a standalone app
4. Chrome on Mac: three-dot menu → "Save and share" → "Install as app"

---

## Step 5: Set a custom domain (optional)

In Netlify: **Domain management → Add custom domain**
e.g. `steering.achieveandthrive.gov.uk`

---

## How sync works

- Every change you make is saved to Supabase after 1.5 seconds
- Any other open instance (phone, tablet, colleague's browser) updates in real-time via websockets
- The status chip (bottom right of Timelines view) shows: `✓ Saved` / `● Saving…` / `○ Local`
- If offline, the app still works — it just won't sync until reconnected

---

## Local development

```bash
npm install

# Create .env.local with your Supabase credentials:
echo "VITE_SUPABASE_URL=https://xxxx.supabase.co" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=eyJ..." >> .env.local

npm run dev
# Opens at http://localhost:5173
```

---

## File structure

```
src/
  main.jsx          # Entry point + PWA service worker registration
  App.jsx           # Thin wrapper, wires sync hook into component
  SteeringGroup.jsx # Main UI component (receives themes/setThemes as props)
  data.js           # All constants, INITIAL_THEMES, POLICY_SUMMARIES
  useSync.js        # Supabase load/save/realtime hook
  supabase.js       # Supabase client (reads env vars)
public/
  favicon.svg
  pwa-192.png       # PWA icon
  pwa-512.png       # PWA icon (large)
  apple-touch-icon.png
vite.config.js      # Vite + PWA plugin config
netlify.toml        # Build + redirect config
```
