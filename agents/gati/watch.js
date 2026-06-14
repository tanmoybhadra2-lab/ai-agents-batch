// ============================================================
// gati/watch.js — Persistent file watcher for prism-decisions.json
// PRISM · W3 Dashboard Keeper · Prisha Publications
//
// Uses Node's native fs.watch with an 800ms debounce to handle
// Windows firing multiple change events per file save.
// ============================================================

'use strict';

const fs   = require('fs');
const path = require('path');
const { patchDashboard } = require('./patch-html');

const DECISIONS_PATH = process.env.GATI_DECISIONS_PATH
  || path.join(__dirname, '../../prism-decisions.json');

const DEBOUNCE_MS = 800;
let debounceTimer = null;
let patchRunning  = false;

// ── Change handler ───────────────────────────────────────────
function handleChange(eventType) {
  // Debounce: Windows can fire 2-3 events per save
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    if (patchRunning) return; // skip if a patch is already in flight

    patchRunning = true;
    const ts = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`\n[${ts}] 🔔 prism-decisions.json changed (${eventType})`);

    try {
      const moved = await patchDashboard();
      if (moved > 0) {
        console.log(`[${ts}] ✅ Patch complete — ${moved} card${moved !== 1 ? 's' : ''} moved`);
      } else {
        console.log(`[${ts}] ℹ️  No changes needed`);
      }
    } catch (err) {
      console.error(`[${ts}] ❌ Patch failed:`, err.message);
    } finally {
      patchRunning = false;
    }
  }, DEBOUNCE_MS);
}

// ── Start watcher ────────────────────────────────────────────
function startWatcher() {
  if (!fs.existsSync(DECISIONS_PATH)) {
    throw new Error(`prism-decisions.json not found: ${DECISIONS_PATH}`);
  }

  console.log(`👁️  Watching: ${DECISIONS_PATH}`);

  const watcher = fs.watch(DECISIONS_PATH, { persistent: true }, handleChange);

  // Handle watcher errors (e.g. file deleted, OS limits)
  watcher.on('error', err => {
    console.error('❌ Watcher error:', err.message);
    console.log('   Attempting to restart in 5 seconds...');
    setTimeout(startWatcher, 5000);
  });

  return watcher;
}

module.exports = { startWatcher };
