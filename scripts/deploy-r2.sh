#!/usr/bin/env bash
set -euo pipefail

: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"

VERSION=$(node -p "require('./packages/core/package.json').version")
BUCKET="widgets"
ENDPOINT="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo "Deploying version ${VERSION} to R2..."

# Versioned (immutable)
aws s3 sync packages/core/dist/widgets "s3://${BUCKET}/v${VERSION}" \
  --endpoint-url "$ENDPOINT" \
  --region auto \
  --cache-control "public, max-age=31536000, immutable, stale-if-error=604800" \
  --exclude "*.map"

# Latest (mutable alias)
aws s3 sync packages/core/dist/widgets "s3://${BUCKET}/latest" \
  --endpoint-url "$ENDPOINT" \
  --region auto \
  --cache-control "public, max-age=300, stale-if-error=86400" \
  --delete \
  --exclude "*.map"

echo "Deployed. Public URLs depend on the bucket's configured public access"
echo "(custom domain or r2.dev subdomain). Paths:"
echo "  Latest esm entry:    /${BUCKET}/latest/widgets.esm.js"
echo "  Versioned esm entry: /${BUCKET}/v${VERSION}/widgets.esm.js"
