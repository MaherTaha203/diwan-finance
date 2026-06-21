# Rebrand — ديوان آل طه "COUNCIL" Identity

Applied the approved geometric **COUNCIL** mark (eight elements converging on a shared center) and the institutional color system across the app.

## Color system
| Token | Old | New |
|---|---|---|
| Navy (brand/chrome) | `#1C2B3A` / `#1A1A2E` | `#0F1B2D` |
| Gold (accent) | `#C4A450` / `#C8961A` | `#C6A46A` |
| Ivory (surface) | `#F5F3EE` / `#F7F3EC` | `#F2EEE7` |

Functional green `#00C896` is **kept** as the credit / positive-amount semantic (changing it would break financial meaning).

## Files modified
- `public/logo.svg` — COUNCIL mark, navy + gold (light backgrounds)
- `public/logo-dark.svg` — COUNCIL mark, ivory + gold (dark/header)
- `public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` — regenerated
- `public/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — new app icons
- `public/site.webmanifest` — new PWA manifest (theme `#0F1B2D`)
- `public/index.html` — favicon/manifest/theme-color head tags; login emblem now renders the mark; login + brand tokens updated
- `public/css/app.css` — brand tokens (navy/gold), header, sidebar, table headers, treasury/letterhead, dashboard chrome
- `public/reset-password.html` — palette, mark in badge, favicons
- `public/verify.html` — header mark, gold token, favicons, theme-color
- `public/js/app.js` — PRINT_TOKENS (receipts/reports), print QR color, Excel header navy, session modal
- `public/js/qr-print.js` — QR navy → `#0F1B2D`

## Touchpoints updated
favicon · app icons · login page · dashboard · sidebar · header · reports/print layouts · document-verification page
