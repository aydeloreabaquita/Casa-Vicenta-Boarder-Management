# Security notes

This repository contains a **portfolio demo mode** and production-capable Cloudflare code.

- Never commit `.dev.vars`, production secrets, real tenant/applicant data, payment receipts, or exported D1/R2 data.
- The GitHub Pages workflow builds with `VITE_DEMO_MODE=true`, which uses local fixture data only and does not call the Worker API.
- Replace the placeholder D1 database ID in `wrangler.jsonc` only in your private deployment workflow or local production copy.
- Configure `SETUP_SECRET`, `BOOTSTRAP_ADMIN_PASSWORD`, and any SMS provider keys with Wrangler secrets for production.
- Rotate any credential that has ever been committed to source control before making a repository public.
