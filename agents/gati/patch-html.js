// ============================================================
// gati/patch-html.js — Dashboard card patcher
// PRISM · W3 Dashboard Keeper · Prisha Publications
//
// Reads prism-decisions.json → moves kb-cards in
// prisha-dashboard.html via jsdom → writes back to disk.
// Called by watch.js on every decisions file change,
// or directly via index.js --once.
// ============================================================

'use strict';

const fs     = require('fs');
const path   = require('path');
const axios  = require('axios');
const dotenv = require('dotenv');
const { JSDOM } = require('jsdom');

dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const DASHBOARD_PATH = process.env.PRISM_DASHBOARD_PATH;
const DECISIONS_PATH = process.env.GATI_DECISIONS_PATH
  || path.join(__dirname, '../../prism-decisions.json');
const WEBHOOK_URL    = process.env.DISCORD_WEBHOOK_URL;

// ── Column class maps ────────────────────────────────────────
// Maps a decision status value to the .kb-col-hd CSS class
// that identifies the target column in the dashboard HTML.
// null = no move (card stays wherever it is).

const T1_COL_MAP = {
  pending:    null,         // no move — stays in Act Now / Radar / Watching
  watching:   'kch-watch', // → Watching column
  inProgress: 'kch-watch', // → Watching column
  cleared:    'kch-done',  // → Cleared column
};

const T5_COL_MAP = {
  toResearch: 'kch-todo',   // → To Research column
  readyToAct: 'kch-act',    // → Ready to Act column
  filed:      'kch-filed',  // → Filed / In Progress column
  secured:    'kch-secure', // → Secured column
};

// ── Find target column element ───────────────────────────────
// Within a tab panel, finds the .kb-col whose header (.kb-col-hd)
// carries the given class name.
function findTargetCol(panel, targetClass) {
  const cols = Array.from(panel.querySelectorAll('.kb-col'));
  for (const col of cols) {
    const hd = col.querySelector('.kb-col-hd');
    if (hd && hd.classList.contains(targetClass)) return col;
  }
  return null;
}

// ── Apply t1 (Overview Kanban) moves ────────────────────────
function applyT1Moves(document, kanban_t1) {
  const panel = document.getElementById('t1');
  if (!panel) { console.warn('  ⚠️  #t1 panel not found in dashboard'); return 0; }

  let moved = 0;
  for (const [id, entry] of Object.entries(kanban_t1)) {
    const targetClass = T1_COL_MAP[entry.status];
    if (!targetClass) continue; // pending = no move

    const card = panel.querySelector(`[data-decision-id="${id}"]`);
    if (!card) {
      console.warn(`  ⚠️  t1 card not found in DOM: data-decision-id="${id}"`);
      continue;
    }

    const targetCol = findTargetCol(panel, targetClass);
    if (!targetCol) {
      console.warn(`  ⚠️  t1 target column not found: .${targetClass}`);
      continue;
    }

    // Skip if already in correct column
    const currentCol = card.closest('.kb-col');
    if (currentCol === targetCol) continue;

    targetCol.appendChild(card);
    console.log(`  ✓ t1: ${id} → .${targetClass} (status: ${entry.status})`);
    moved++;
  }
  return moved;
}

// ── Apply t5 (Legal Kanban) moves ───────────────────────────
function applyT5Moves(document, legal_t5) {
  const panel = document.getElementById('t5');
  if (!panel) { console.warn('  ⚠️  #t5 panel not found in dashboard'); return 0; }

  let moved = 0;
  for (const [id, entry] of Object.entries(legal_t5)) {
    const targetClass = T5_COL_MAP[entry.status];
    if (!targetClass) continue;

    const card = panel.querySelector(`[data-decision-id="${id}"]`);
    if (!card) {
      console.warn(`  ⚠️  t5 card not found in DOM: data-decision-id="${id}"`);
      continue;
    }

    const targetCol = findTargetCol(panel, targetClass);
    if (!targetCol) {
      console.warn(`  ⚠️  t5 target column not found: .${targetClass}`);
      continue;
    }

    const currentCol = card.closest('.kb-col');
    if (currentCol === targetCol) continue;

    targetCol.appendChild(card);
    console.log(`  ✓ t5: ${id} → .${targetClass} (status: ${entry.status})`);
    moved++;
  }
  return moved;
}

// ── Update all column badge counts ──────────────────────────
// Counts non-empty kb-cards in each .kb-col and updates .kb-col-cnt
function updateBadges(document) {
  let updated = 0;
  document.querySelectorAll('.kb-col').forEach(col => {
    const badge = col.querySelector('.kb-col-cnt');
    if (!badge) return;
    const count = col.querySelectorAll('.kb-card:not(.kb-card-empty)').length;
    badge.textContent = String(count);
    updated++;
  });
  return updated;
}

// ── Discord notification ─────────────────────────────────────
async function notifyDiscord(moved, details) {
  if (!WEBHOOK_URL || moved === 0) return;
  try {
    const lines = details.map(d => `• ${d}`).join('\n') || 'No moves';
    await axios.post(WEBHOOK_URL, {
      embeds: [{
        title: '🔀 Gati · Dashboard updated',
        color: 0x7c3aed,
        fields: [
          { name: `${moved} card${moved !== 1 ? 's' : ''} moved`, value: lines, inline: false }
        ],
        footer: { text: 'PRISM · W3 Dashboard Keeper · Prisha Publications' },
        timestamp: new Date().toISOString()
      }]
    }, { timeout: 10000 });
  } catch (err) {
    console.warn('  ⚠️  Discord notify failed:', err.message);
  }
}

// ── Main patch function ──────────────────────────────────────
async function patchDashboard() {
  // Validate paths
  if (!DASHBOARD_PATH) {
    throw new Error('PRISM_DASHBOARD_PATH not set in .env');
  }
  if (!fs.existsSync(DASHBOARD_PATH)) {
    throw new Error(`Dashboard not found at: ${DASHBOARD_PATH}`);
  }
  if (!fs.existsSync(DECISIONS_PATH)) {
    throw new Error(`prism-decisions.json not found at: ${DECISIONS_PATH}`);
  }

  // Read files
  console.log('  📖 Reading dashboard + decisions...');
  const html      = fs.readFileSync(DASHBOARD_PATH, 'utf8');
  const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, 'utf8'));
  console.log(`     decisions v${decisions.version} · updated: ${decisions.lastUpdated}`);

  // Parse with jsdom (no script execution, no external resource loads)
  const dom      = new JSDOM(html, { runScripts: 'outside-only' });
  const document = dom.window.document;

  // Apply moves
  console.log('  🔀 Applying card moves...');
  const movedT1 = applyT1Moves(document, decisions.kanban_t1 || {});
  const movedT5 = applyT5Moves(document, decisions.legal_t5  || {});
  const totalMoved = movedT1 + movedT5;

  // Update column badges
  updateBadges(document);

  if (totalMoved === 0) {
    console.log('  ℹ️  All cards already in correct columns — no changes');
    return 0;
  }

  // Serialize and write back
  const updated = dom.serialize();
  fs.writeFileSync(DASHBOARD_PATH, updated, 'utf8');
  console.log(`  💾 Written: ${DASHBOARD_PATH}`);
  console.log(`  ✅ ${totalMoved} card${totalMoved !== 1 ? 's' : ''} moved (t1: ${movedT1}, t5: ${movedT5})`);

  // Discord
  const discordDetails = [];
  if (movedT1 > 0) discordDetails.push(`t1 Overview: ${movedT1} card${movedT1 !== 1 ? 's' : ''} moved`);
  if (movedT5 > 0) discordDetails.push(`t5 Legal: ${movedT5} card${movedT5 !== 1 ? 's' : ''} moved`);
  await notifyDiscord(totalMoved, discordDetails);

  return totalMoved;
}

module.exports = { patchDashboard };
