#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CONFIG_ENV="$ROOT/../config/.env"
NODE_BIN="${NODE_BIN:-/opt/alt/alt-nodejs22/root/usr/bin/node}"
LOCK_DIR="${LOCALIZATION_DATA_DIR:-$ROOT/.data/localization}/.autofeed-lock"
LOG_DIR="${LOCALIZATION_DATA_DIR:-$ROOT/.data/localization}"
LOG_FILE="$LOG_DIR/autofeed.log"

if [ -f "$CONFIG_ENV" ]; then
  set -a
  # Hostinger-managed application environment. Never echo its contents.
  . "$CONFIG_ENV"
  set +a
fi

mkdir -p "$LOG_DIR"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  printf '%s autofeed skipped: another run is active\n' "$(date -u +%FT%TZ)" >> "$LOG_FILE"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT INT TERM

cd "$ROOT"
printf '%s autofeed start\n' "$(date -u +%FT%TZ)" >> "$LOG_FILE"
if "$NODE_BIN" scripts/localize.mjs autofeed --limit=6 >> "$LOG_FILE" 2>&1; then
  printf '%s autofeed complete\n' "$(date -u +%FT%TZ)" >> "$LOG_FILE"
else
  status=$?
  printf '%s autofeed failed status=%s\n' "$(date -u +%FT%TZ)" "$status" >> "$LOG_FILE"
  exit "$status"
fi

# Keep only the most recent ~2000 log lines.
if [ -f "$LOG_FILE" ]; then
  tail -n 2000 "$LOG_FILE" > "$LOG_FILE.tmp"
  mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
