#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CONFIG_ENV="$ROOT/../config/.env"
DATA_DIR="$ROOT/../../data/localization"
LOG_FILE="$DATA_DIR/autofeed.log"
ENDPOINT="${APEX_AUTOFEEED_URL:-https://apexnewsindia.com/api/internal/autofeed}"

if [ "${1:-}" = "--retry-failed" ]; then
  ENDPOINT="${ENDPOINT}?retryFailed=true"
elif [ -n "${1:-}" ]; then
  printf '%s\n' "Usage: $0 [--retry-failed]" >&2
  exit 2
fi

mkdir -p "$DATA_DIR"

if [ ! -f "$CONFIG_ENV" ]; then
  printf '%s autofeed failed: runtime env file missing\n' "$(date -u +%FT%TZ)" >> "$LOG_FILE"
  exit 1
fi

# Read only the dedicated cron secret. Never eval/source the complete env file.
SECRET_LINE="$(grep -m1 '^APEX_AUTOFEEED_SECRET=' "$CONFIG_ENV" || true)"
SECRET="${SECRET_LINE#APEX_AUTOFEEED_SECRET=}"
SECRET="$(printf '%s' "$SECRET" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"

if [ "${#SECRET}" -lt 32 ]; then
  printf '%s autofeed failed: APEX_AUTOFEEED_SECRET is missing or too short\n' "$(date -u +%FT%TZ)" >> "$LOG_FILE"
  exit 1
fi

printf '%s autofeed start\n' "$(date -u +%FT%TZ)" >> "$LOG_FILE"

TMP="$LOG_FILE.response.$$"
status=0
http_code="$(
  curl --silent --show-error --max-time 240 \
    --output "$TMP" \
    --write-out '%{http_code}' \
    --request POST \
    --header "x-apex-autofeed-secret: $SECRET" \
    "$ENDPOINT"
)" || status=$?

if [ "$status" -ne 0 ]; then
  printf '%s autofeed failed: curl status=%s\n' "$(date -u +%FT%TZ)" "$status" >> "$LOG_FILE"
  [ -f "$TMP" ] && cat "$TMP" >> "$LOG_FILE"
  rm -f "$TMP"
  exit "$status"
fi

cat "$TMP" >> "$LOG_FILE"
printf '\n' >> "$LOG_FILE"
rm -f "$TMP"

if [ "$http_code" != "200" ]; then
  printf '%s autofeed failed: HTTP %s\n' "$(date -u +%FT%TZ)" "$http_code" >> "$LOG_FILE"
  exit 1
fi

printf '%s autofeed complete\n' "$(date -u +%FT%TZ)" >> "$LOG_FILE"

tail -n 2000 "$LOG_FILE" > "$LOG_FILE.tmp"
mv "$LOG_FILE.tmp" "$LOG_FILE"
