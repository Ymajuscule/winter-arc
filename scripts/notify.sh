#!/usr/bin/env bash
# Send a short message to Julien via Telegram.
# Requires: TG_BOT_TOKEN and TG_CHAT_ID in .env (repo root, gitignored).
#
# Usage: ./scripts/notify.sh "your message here"

set -euo pipefail

MSG="${1:?message required}"

# Load env if present
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
fi

: "${TG_BOT_TOKEN:?TG_BOT_TOKEN missing in .env}"
: "${TG_CHAT_ID:?TG_CHAT_ID missing in .env}"

curl -sS --max-time 10 \
  -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TG_CHAT_ID}" \
  --data-urlencode "text=${MSG}" \
  --data-urlencode "disable_web_page_preview=true" \
  -o /dev/null || {
    echo "notify: telegram send failed (non-fatal)" >&2
    exit 0
  }
