#!/usr/bin/env bash
set -euo pipefail

: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"

BUCKET="widgets"
ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "WARNING: This will delete ALL objects in the ${BUCKET} R2 bucket!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "Deleting all objects from s3://${BUCKET}..."

aws s3 rm "s3://${BUCKET}" \
  --endpoint-url "$ENDPOINT" \
  --region auto \
  --recursive

echo "Successfully deleted all objects from the bucket."
