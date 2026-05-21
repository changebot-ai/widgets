#!/usr/bin/env bash
set -euo pipefail

: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"

BUCKET="${BUCKET:-widgets}"
ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
PREFIX="${1:-}"
PARALLEL="${PARALLEL:-8}"

export BUCKET ENDPOINT AWS_PAGER=""

list_args=(s3api list-objects-v2
  --bucket "$BUCKET"
  --endpoint-url "$ENDPOINT"
  --region auto
  --output text
  --query "Contents[].[Key]")
[ -n "$PREFIX" ] && list_args+=(--prefix "$PREFIX")

printf "%s\t%s\t%s\n" "KEY" "CONTENT-TYPE" "CACHE-CONTROL"

# shellcheck disable=SC2016  # vars expand in inner shell, BUCKET/ENDPOINT exported above
aws "${list_args[@]}" \
  | grep -v '^$' \
  | xargs -P "$PARALLEL" -I {} sh -c '
      out=$(aws s3api head-object \
              --bucket "$BUCKET" --key "$1" \
              --endpoint-url "$ENDPOINT" --region auto \
              --output text --query "[ContentType, CacheControl]" 2>/dev/null) \
        || { printf "%s\t<error>\t<error>\n" "$1"; exit 0; }
      printf "%s\t%s\n" "$1" "$out"
    ' _ {}
