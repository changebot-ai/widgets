#!/usr/bin/env bash
set -euo pipefail

VERSION=$(node -p "require('./packages/core/package.json').version")
BUCKET="widgets"
ENDPOINT="https://t3.storage.dev"

echo "Deploying version ${VERSION} to CDN..."

# Versioned (immutable)
aws s3 sync packages/core/dist/widgets "s3://${BUCKET}/v${VERSION}" \
  --endpoint-url "$ENDPOINT" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.map"

# Latest (mutable alias)
aws s3 sync packages/core/dist/widgets "s3://${BUCKET}/latest" \
  --endpoint-url "$ENDPOINT" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=300" \
  --delete \
  --exclude "*.map"

echo "CDN URLs (origin-level):"
echo "  Latest esm entry:    ${ENDPOINT}/${BUCKET}/latest/widgets.esm.js"
echo "  Versioned esm entry: ${ENDPOINT}/${BUCKET}/v${VERSION}/widgets.esm.js"
