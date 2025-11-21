#!/bin/bash

set -e

VERSION=$(node -p "require('./packages/core/package.json').version")
BUCKET="widgets"
ENDPOINT="https://t3.storage.dev"

echo "Deploying version ${VERSION} to CDN..."

# Deploy versioned release - only ESM modules needed for lazy loading
aws s3 sync packages/core/dist/esm/ "s3://${BUCKET}/v${VERSION}/dist/esm/" \
  --endpoint-url "${ENDPOINT}" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "application/javascript" \
  --exclude "*.map"

aws s3 sync packages/core/loader/ "s3://${BUCKET}/v${VERSION}/loader/" \
  --endpoint-url "${ENDPOINT}" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "application/javascript" \
  --exclude "*.map"

# Copy loader to shorter URL: /v{version}.js
aws s3 cp packages/core/loader/index.js "s3://${BUCKET}/v${VERSION}.js" \
  --endpoint-url "${ENDPOINT}" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "application/javascript"

# Update 'latest' symlink
aws s3 sync packages/core/dist/esm/ "s3://${BUCKET}/latest/dist/esm/" \
  --endpoint-url "${ENDPOINT}" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=300" \
  --content-type "application/javascript" \
  --delete \
  --exclude "*.map"

aws s3 sync packages/core/loader/ "s3://${BUCKET}/latest/loader/" \
  --endpoint-url "${ENDPOINT}" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=300" \
  --content-type "application/javascript" \
  --delete \
  --exclude "*.map"

# Copy loader to shorter URL: /latest.js
aws s3 cp packages/core/loader/index.js "s3://${BUCKET}/latest.js" \
  --endpoint-url "${ENDPOINT}" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=300" \
  --content-type "application/javascript"

echo "CDN URLs:"
echo "  Latest: ${ENDPOINT}/latest.js"
echo "  Versioned: ${ENDPOINT}/v${VERSION}.js"
