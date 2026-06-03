<#
============================================================================
  AI Agents Batch System - Repo Security Remediation
============================================================================
  WHAT THIS DOES
    1. Backs up the whole repo (so this is reversible).
    2. Stops tracking server/.env and all node_modules.
    3. Wipes ALL git history and replaces it with one clean commit
       (this removes the leaked Discord webhook from every past commit).
    4. Force-pushes the clean history to GitHub.

  BEFORE YOU RUN THIS  --  DO THE WEBHOOK ROTATION FIRST (see Step 0).
  The leaked webhook has been public for days; scrubbing git history does
  NOT un-leak it. You MUST rotate it in Discord or it stays abusable.

  Run from:  C:\Users\tanmo\ai-agents-batch
  Open PowerShell, cd into the repo, then:  .\fix-repo-security.ps1
============================================================================
#>

$ErrorActionPreference = "Stop"
$repo = "C:\Users\tanmo\ai-agents-batch"
Set-Location $repo

Write-Host "`n=== STEP 0 reminder ===" -ForegroundColor Cyan
Write-Host "Have you already rotated the Discord webhook and updated server\.env" -ForegroundColor Yellow
Write-Host "with the NEW URL? (Discord: Server Settings -> Integrations -> Webhooks" -ForegroundColor Yellow
Write-Host "-> delete the old one -> New Webhook -> copy URL into server\.env)" -ForegroundColor Yellow
$ok = Read-Host "Type YES to continue"
if ($ok -ne "YES") { Write-Host "Aborted. Rotate the webhook first." -ForegroundColor Red; exit 1 }

# --- STEP 1: Backup (rollback safety) ------------------------------------
$stamp  = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$env:USERPROFILE\ai-agents-batch-backup-$stamp"
Write-Host "`n[1/5] Backing up repo to $backup ..." -ForegroundColor Cyan
Copy-Item -Path $repo -Destination $backup -Recurse
git bundle create "$backup.bundle" --all
Write-Host "Backup done: folder copy + $backup.bundle (full history)." -ForegroundColor Green

# --- STEP 2: Write a CORRECT UTF-8 .gitignore ----------------------------
# (The current .gitignore is UTF-16, which git cannot parse, so nothing was
#  ever ignored. We rewrite it as UTF-8 without BOM so the rules work.)
Write-Host "`n[2/5] Writing a proper UTF-8 .gitignore..." -ForegroundColor Cyan
$gitignore = @"
# Dependencies
node_modules/

# Environment / secrets - never commit real values
.env
*.env
!*.env.example

# Logs
*.log
npm-debug.log*

# OS junk
Thumbs.db
.DS_Store
"@
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $repo ".gitignore"), $gitignore, $utf8NoBom)
Write-Host "  .gitignore rewritten as UTF-8." -ForegroundColor Green

# --- STEP 3: Wipe history, keep current files as ONE clean commit ---------
# Orphan branch = brand-new history. Clearing the index then re-adding makes
# git honor the new UTF-8 .gitignore, so node_modules and .env are excluded.
Write-Host "`n[3/5] Replacing history with a single clean commit..." -ForegroundColor Cyan
git checkout --orphan clean-main
git rm -r --cached . | Out-Null
git add -A
git commit -m "[SETUP] AI Agents Batch System - clean baseline (secrets removed, automation tracked)"
git branch -D main
git branch -m main

# --- STEP 4: Sanity checks BEFORE pushing --------------------------------
Write-Host "`n[4/5] Verifying no secret / node_modules remain in tracked files..." -ForegroundColor Cyan
$envTracked = git ls-files | Select-String -SimpleMatch ".env" | Where-Object { $_ -notmatch "\.env\.example" }
$nmTracked  = git ls-files | Select-String -SimpleMatch "node_modules"
if ($envTracked) { Write-Host "WARNING: a .env is still tracked:`n$envTracked" -ForegroundColor Red }
if ($nmTracked)  { Write-Host "WARNING: node_modules still tracked (count: $($nmTracked.Count))" -ForegroundColor Red }
if (-not $envTracked -and -not $nmTracked) { Write-Host "Clean: no .env, no node_modules tracked." -ForegroundColor Green }
Write-Host "Tracked files now:" -ForegroundColor Cyan
git ls-files

# --- STEP 5: Force-push the clean history --------------------------------
Write-Host "`n[5/5] Ready to force-push to GitHub (origin/main)." -ForegroundColor Cyan
Write-Host "This overwrites the public history with the clean version." -ForegroundColor Yellow
$go = Read-Host "Type PUSH to force-push now (or anything else to skip and push manually later)"
if ($go -eq "PUSH") {
    git push origin main --force
    Write-Host "`nDone. History rewritten and pushed." -ForegroundColor Green
} else {
    Write-Host "`nSkipped push. When ready, run:  git push origin main --force" -ForegroundColor Yellow
}

Write-Host "`nAFTER PUSH: confirm at https://github.com/tanmoybhadra2-lab/ai-agents-batch" -ForegroundColor Cyan
Write-Host "Open server/.env.example (should exist) and confirm server/.env is GONE from GitHub." -ForegroundColor Cyan
Write-Host "Rollback if needed: delete the repo folder and run  git clone $backup.bundle" -ForegroundColor DarkGray
