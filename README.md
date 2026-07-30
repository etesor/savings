# Ahorros — a private, local-first savings tracker

Track your savings as **buckets** (e.g. *Fondo de emergencia*, *Berlin*), record every
deposit and withdrawal, watch your history build up, and see color-coded progress toward
each goal. Everything runs on your own machine and your data lives in a plain `.json` file
that **you** own — nothing is ever uploaded to a server.

## Why local-first

- **Private by design** — your financial data never leaves your computer.
- **You own the file** — the app reads and writes a single `savings.json`. Drop it in
  Dropbox/iCloud to back it up or sync it between devices; commit it to a private repo; or
  keep it on a USB stick. It's just JSON.
- **No account, no cloud, no subscription.**

## Features

- Create savings **buckets** with a goal and account (bank or investment/broker).
- Update a bucket two ways, whichever matches what you have in front of you:
  - **Actualizar saldo** — type the balance you see in your bank account and the app
    works out the movement for you. This is the default: it's what you can read off a
    statement without remembering what changed since last time.
  - **Movimiento** — record a deposit or withdrawal directly, when you know the amount.
- Either way it's the same thing underneath: one dated, signed entry in an append-only log.
- **Historical view** per bucket (balance over time) — because balances are *derived* from
  the log, your history is captured automatically from day one.
- **Overall total** across all buckets, split by bank vs. investment.
- **Goals & visual cues**: progress bars colored red → amber → green, with a 🎉 when a goal
  is reached.
- **Backup**: one-click JSON export/import, works in any browser.

## How your data is stored

The app uses the browser's **File System Access API** to read/write a real file you pick.
This needs a Chromium-based browser (Chrome/Edge/Brave/Arc) and a secure context
(`localhost`), so run it with the dev/preview server below rather than opening the built
HTML directly. On unsupported browsers it automatically falls back to `localStorage`, and
you can still export/import a backup file manually.

## Setup

This project pins its Node version with [`nvm`](https://github.com/nvm-sh/nvm) and installs
everything **locally** — no global installs.

```bash
nvm install        # installs the version in .nvmrc (Node 22)
nvm use
npm install        # installs into ./node_modules only

npm run dev        # start the dev server, then open the printed http://localhost URL
```

Other scripts:

```bash
npm run build      # type-check + production build into ./dist
npm run preview    # serve the production build locally (also a secure context)
npm run lint       # oxlint
```

### First run

1. Open the app — you'll be asked where to keep your data.
2. Choose **Crear archivo nuevo** and save a `savings.json` wherever you like
   (e.g. in a Dropbox/iCloud folder).
3. Create your buckets. For each one, enter what you already have saved as the
   *Saldo inicial* — that seeds your history.

See [`savings.example.json`](./savings.example.json) for the data shape.

## Data model (for hacking on it)

Everything derives from an append-only list of **movements**; a bucket's balance is never
stored, only the sum of its movements. That's what makes the history, totals, and goal
percentages always consistent. The core logic lives in
[`src/model/calculations.ts`](./src/model/calculations.ts).

## Privacy note

Because this repo is public, your real `savings.json` is git-ignored and must never be
committed. Only the schema-only `savings.example.json` is tracked.

## License

MIT — see [LICENSE](./LICENSE).
