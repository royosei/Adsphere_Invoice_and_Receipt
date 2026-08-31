# Ledger — Invoice & Receipt Generator

A static web app (no build step) that saves invoices and receipts to a Supabase database and deploys as-is on Vercel.

## Files
- `index.html` — page structure
- `styles.css` — all styling
- `app.js` — app logic + Supabase reads/writes
- `config.js` — **put your Supabase URL and anon key here**
- `supabase-schema.sql` — run once in Supabase to create the table

## Local setup
1. Create a Supabase project, run `supabase-schema.sql` in the SQL Editor.
2. Copy your Project URL and anon public key into `config.js`.
3. In Supabase, go to Authentication -> Users -> Add user, and create an account (email + password) for each admin. There is no public sign-up screen — accounts are created by you in the dashboard only.
4. Open `index.html` directly in a browser, or run a local server:
   ```
   npx serve .
   ```
5. Sign in with the email/password you created. All signed-in admins share the same set of invoices — there's no per-admin data separation.

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import the repo.
3. Framework preset: "Other" (it's static files, no build command needed).
4. Deploy. Vercel gives you a live `https://your-project.vercel.app` URL.

See the full step-by-step walkthrough in chat for details on securing the database with Row Level Security and adding per-user login later.
