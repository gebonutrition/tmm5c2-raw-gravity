# TMM5C2 — Raw Gravity × Take My Muffin

Production copy of `tmm5c1-raw-gravity`, with the same responsive design and content.

## What changed for TMM5C2

- All Amazon CTAs use the new Attribution ID `799ABB226F6E59DBE055DECE8147C7A5`.
- Klaviyo list ID is `TyKHnV`; set `KLAVIYO_API_KEY` in Vercel (never commit the key).
- TikTok Pixel loads dynamically from `?pixel=PIXEL_ID` using `pixel.js`.
- Meta Pixel loads dynamically from `?fbpixel=PIXEL_ID` using `fbpixel.js`; no hardcoded Pixel ID is included.
- After a successful Klaviyo signup, TikTok sends `SubmitForm` and `Contact`; Meta sends `Lead` and `Contact`.
- The marquee is implemented as two identical, sufficiently wide groups; the track translates by exactly one group width (`-50%`) so the loop is seamless on desktop and mobile.
- Telegram notifications are sent best-effort if `TG_BOT_TOKEN` and `TG_CHAT_ID` are configured.

## Environment variables

Set these in Vercel for Production and Preview:

- `KLAVIYO_API_KEY` — full private Klaviyo API key.
- `KLAVIYO_LIST_ID` — `TyKHnV`.
- `TG_BOT_TOKEN` — existing Telegram bot token, stored only in Vercel Environment Variables.
- `TG_CHAT_ID` — Telegram destination chat; defaults in code/example to `1540072090`.

## Vercel deployment

Static HTML is served from the project root, with the serverless handler at `/api/subscribe.js`. No build command or output directory is required. Attach `tmm5c2.rawgravity.coffee` after the first deployment.

The Vercel Function logs lead metadata (timestamp, landing, source, creative, page), not the email address. Unlike the PHP/Apache version in the handoff PDF, Vercel Functions do not provide a persistent writable project directory, so this project does not create `data/leads.ndjson`; Telegram is the lead notification channel.

## Pixel smoke test

Open a URL using test IDs:

`https://tmm5c2.rawgravity.coffee/?pixel=TEST123&fbpixel=TEST456&creative=handoff_test`

Check the browser Network tab for TikTok and Meta page-view requests. Submit a valid email to test the post-success events. Replace fake IDs with ad platform IDs in actual ad destination URLs.
