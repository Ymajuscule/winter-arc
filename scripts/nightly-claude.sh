#!/usr/bin/env bash
# Winter Arc — nightly autonomous dev session
# Called from Windows Task Scheduler at 02:30 via nightly-claude.ps1
# Runs Claude Code with the standing prompt until credits deplete or exit 0.

set -euo pipefail

# ---- Config ------------------------------------------------------------------
REPO_DIR="${WINTER_ARC_REPO:-$HOME/winter-arc}"
LOG_DIR="$REPO_DIR/.claude/logs"
SESSION_STAMP="$(date +%Y-%m-%d_%H-%M)"
STDOUT_LOG="$LOG_DIR/session-$SESSION_STAMP.stdout.log"
STDERR_LOG="$LOG_DIR/session-$SESSION_STAMP.stderr.log"

mkdir -p "$LOG_DIR"

# ---- Preflight ---------------------------------------------------------------
cd "$REPO_DIR"

# Refuse to run if the working tree is dirty (Julien has uncommitted work).
if [[ -n "$(git status --porcelain)" ]]; then
  MSG="🚫 Night $(date +%Y-%m-%d) skipped: working tree dirty. Commit or stash before 02:30."
  ./scripts/notify.sh "$MSG" || true
  exit 0
fi

# Refuse to run if the API is unreachable (no wifi, DNS issue, whatever).
if ! curl -sS --max-time 10 https://api.anthropic.com/v1/health >/dev/null 2>&1; then
  MSG="🚫 Night $(date +%Y-%m-%d) skipped: Anthropic API unreachable."
  ./scripts/notify.sh "$MSG" || true
  exit 0
fi

# ---- Invoke Claude Code ------------------------------------------------------
# The session prompt is a stable file; we pipe its contents as the initial message.
# --dangerously-skip-permissions is intentional: this is an unattended session,
# and all guardrails are enforced by CLAUDE.md + the skills.
#
# Model choice: use whatever the shipping Claude Code CLI defaults to.
# Don't pin a model here — Julien can override via env if needed.

PROMPT_FILE="$REPO_DIR/.claude/prompts/nightly-session.md"

if [[ ! -f "$PROMPT_FILE" ]]; then
  MSG="🚫 Night $(date +%Y-%m-%d) skipped: prompt file missing at $PROMPT_FILE"
  ./scripts/notify.sh "$MSG" || true
  exit 1
fi

# The exact CLI invocation depends on your installed Claude Code version.
# The idea: feed the prompt file, let the session run, capture logs.
#
# If your CLI is `claude` and supports `--print` with a prompt arg:
#   claude --dangerously-skip-permissions --print "$(cat "$PROMPT_FILE")"
#
# If it's `claude-code`:
#   claude-code run --prompt "$PROMPT_FILE" --auto-approve
#
# Adapt this line to your actual CLI. Both stdout and stderr are captured
# because when things go sideways at 4am, you want the trail.

{
  echo "=== Winter Arc nightly session — $SESSION_STAMP ==="
  echo "repo: $REPO_DIR"
  echo "branch (main head): $(git rev-parse --short HEAD)"
  echo "----"
} | tee -a "$STDOUT_LOG"

# NOTE: replace the below with your actual Claude Code CLI invocation.
# This template assumes the `claude` CLI reads a prompt from stdin.
if command -v claude >/dev/null 2>&1; then
  cat "$PROMPT_FILE" | claude \
    --dangerously-skip-permissions \
    >>"$STDOUT_LOG" 2>>"$STDERR_LOG" \
    || CLAUDE_EXIT=$?
else
  echo "claude CLI not found in PATH" >>"$STDERR_LOG"
  CLAUDE_EXIT=127
fi

CLAUDE_EXIT="${CLAUDE_EXIT:-0}"

# ---- Postflight --------------------------------------------------------------
{
  echo "----"
  echo "session ended: $(date)"
  echo "claude exit: $CLAUDE_EXIT"
} | tee -a "$STDOUT_LOG"

# If Claude didn't send its own Telegram (e.g., crashed before session-report),
# send a fallback so Julien knows the run happened.
if [[ "$CLAUDE_EXIT" -ne 0 ]]; then
  ./scripts/notify.sh "⚠️ Night $(date +%Y-%m-%d) ended with exit $CLAUDE_EXIT. See $STDOUT_LOG" || true
fi

# Rotate old logs (keep last 30).
find "$LOG_DIR" -type f -name "session-*.log" -mtime +30 -delete || true

exit "$CLAUDE_EXIT"
