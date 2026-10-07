#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
RUNTIME_ENV_DIR="$ROOT/../config"
NODE_BIN="${NODE_BIN:-/opt/alt/alt-nodejs22/root/usr/bin/node}"
DATA_DIR="${LOCALIZATION_DATA_DIR:-$ROOT/../../data/localization}"
LOCK_DIR="$DATA_DIR/.autofeed-lock"
LOG_FILE="$DATA_DIR/autofeed.log"

mkdir -p "$DATA_DIR"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  printf '%s autofeed skipped: another run is active\n' "$(date -u +%FT%TZ)" >> "$LOG_FILE"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT INT TERM

cd "$ROOT"
printf '%s autofeed start\n' "$(date -u +%FT%TZ)" >> "$LOG_FILE"

if APEX_RUNTIME_ENV_DIR="$RUNTIME_ENV_DIR" \
   LOCALIZATION_DATA_DIR="$DATA_DIR" \
   REQUIRE_PERSISTENT_LOCALIZATION=true \
   "$NODE_BIN" scripts/localize.mjs autofeed --limit=6 >> "$LOG_FILE" 2>&1; then
  printf '%s autofeed complete\n' "$(date -u +%FT%TZ)" >> "$LOG_FILE"
else
  status=$?
  printf '%s autofeed failed status=%s\n' "$(date -u +%FT%TZ)" "$status" >> "$LOG_FILE"
  exit "$status"
fi

if [ -f "$LOG_FILE" ]; then
  tail -n 2000 "$LOG_FILE" > "$LOG_FILE.tmp"
  mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
