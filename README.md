# coupletote.com — Sales Admin Dashboard

A simple, static sales-tracking dashboard for coupletote.com. No backend —
everything is saved in the browser's `localStorage` on whatever device you
use to open it.

## Files
- `index.html` — page structure
- `styles.css` — all styling
- `script.js` — passcode lock, calculations, storage, chart, CSV/backup

## Running locally
Just open `index.html` in a browser, or serve the folder:
```
python3 -m http.server 8000
```
then visit `http://localhost:8000`.

## Deploying on GitHub Pages
1. Create a repo (can be private) and push these three files to it.
2. Go to **Settings → Pages**, set the source to your main branch / root.
3. Your dashboard will be live at `https://<username>.github.io/<repo>/`.

## About the "admin lock"
The first time you open the dashboard, you'll set a passcode. It's hashed
and stored in `localStorage`, and the dashboard stays hidden behind it.
**This is a convenience lock, not real security** — anyone with browser
devtools access to that device could bypass it. If you need genuine access
control:
- Keep the GitHub repo **private** and only share Pages access with people
  you trust (GitHub Pages sites from private repos are only viewable by
  people with repo access, unless you're on certain paid plans where Pages
  can be public regardless — check your plan's current behavior), or
- Put the site behind a proper auth layer (e.g. a small hosted function or
  a service like Cloudflare Access) if this ever needs to be truly private.

## About data storage
Reports are saved per-browser, per-device — they will **not** sync across
computers or survive clearing browser data. Use the **Download backup**
button regularly, and **Restore backup** to bring that JSON file back in
(on this device or a new one). **Export CSV** is for opening reports in
Excel/Sheets — it's not meant for restoring data.

## Features
- Log weekly or monthly sales reports (total sales, total cost/expenses,
  optional notes) with the gain/loss auto-calculated as you type
- Summary cards: total sales, net gain/loss, best and weakest periods
- A simple bar chart of your last 8 reports (sales vs. gain/loss)
- Filterable, editable, deletable report history table
- CSV export and JSON backup/restore
- "Erase all data" option for a clean slate
