// ============================================================
// gati/index.js — Dashboard Keeper Agent · Entry Point
// PRISM · W3 · Prisha Publications
//
// Modes:
//   node index.js          → start persistent watcher
//   node index.js --once   → one-time patch and exit (for testing)
// ============================================================

'use strict';

const dotenv = require('dotenv');
const path   = require('path');

// Load .env before requiring any other module
// (patch-html.js and watch.js read env vars at require-time)
dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const args    = process.argv.slice(2);
const oneShot = args.includes('--once');

if (oneShot) {
  // ── One-shot mode: patch and exit ─────────────────────────
  const { patchDashboard } = require('./patch-html');

  console.log('');
  console.log('🔧 Gati — one-shot patch');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  patchDashboard()
    .then(moved => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ Done — ${moved} card${moved !== 1 ? 's' : ''} moved`);
      console.log('');
      process.exit(0);
    })
    .catch(err => {
      console.error('');
      console.error('❌ Gati failed:', err.message);
      console.error('');
      process.exit(1);
    });

} else {
  // ── Watcher mode: persistent background process ────────────
  const { startWatcher } = require('./watch');

  console.log('');
  console.log('🔮 Gati — Dashboard Keeper · W3 · PRISM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Event-driven: watching prism-decisions.json');
  console.log('Card moves applied immediately on every write');
  console.log('');

  try {
    startWatcher();
    console.log('✅ Watcher active. Press Ctrl+C to stop.');
    console.log('');
  } catch (err) {
    console.error('❌ Failed to start watcher:', err.message);
    process.exit(1);
  }
}
