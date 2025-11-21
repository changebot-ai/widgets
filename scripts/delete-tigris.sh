#!/usr/bin/env bash
set -euo pipefail

BUCKET="widgets"
ENDPOINT="https://t3.storage.dev"

echo "WARNING: This will delete ALL objects in the ${BUCKET} bucket!"
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
