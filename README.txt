VILTRUM XP GAMING HUB — SHARED ONLINE BOOKING UPGRADE

This version replaces browser-only localStorage bookings with a Cloudflare Worker + D1 database.

FILES:
- public/        Website files
- worker.js      Booking API + admin API
- schema.sql     D1 database tables
- wrangler.jsonc Cloudflare Worker configuration

SETUP SUMMARY:
1. In Cloudflare, create a D1 database named: viltrum-xp-bookings
2. Run schema.sql against that database.
3. Put the returned D1 database ID into wrangler.jsonc.
4. Deploy this Worker with static assets.
5. Add a Worker secret named ADMIN_KEY. Use a strong random value.
6. Open /admin.html and enter that key to view/manage bookings.

IMPORTANT: The admin key must be a Cloudflare secret, not hard-coded into the website.
