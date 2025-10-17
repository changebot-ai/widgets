#!/usr/bin/env bash
set -e

# Tigris CDN deployment script
# Deploys the core Stencil build (dist/ and loader/) to Tigris S3

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version from core package.json
VERSION=$(node -p "require('./packages/core/package.json').version")
BUCKET="${TIGRIS_BUCKET:-your-bucket-name}"
ENDPOINT="${TIGRIS_ENDPOINT:-https://fly.storage.tigris.dev}"

echo -e "${BLUE}🚀 Deploying Changebot Widgets to Tigris CDN${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo ""

# Ensure we have built packages
if [ ! -d "packages/core/dist" ]; then
  echo "Building packages first..."
  pnpm run build
fi

# Deploy versioned release
echo -e "${GREEN}📦 Deploying version ${VERSION}...${NC}"
aws s3 sync packages/core/dist/ "s3://${BUCKET}/v${VERSION}/dist/" \
  --endpoint-url "${ENDPOINT}" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.map"

aws s3 sync packages/core/loader/ "s3://${BUCKET}/v${VERSION}/loader/" \
  --endpoint-url "${ENDPOINT}" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.map"

# Update 'latest' symlink
echo -e "${GREEN}🔄 Updating 'latest' to ${VERSION}...${NC}"
aws s3 sync packages/core/dist/ "s3://${BUCKET}/latest/dist/" \
  --endpoint-url "${ENDPOINT}" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=300" \
  --delete \
  --exclude "*.map"

aws s3 sync packages/core/loader/ "s3://${BUCKET}/latest/loader/" \
  --endpoint-url "${ENDPOINT}" \
  --region auto \
  --acl public-read \
  --cache-control "public, max-age=300" \
  --delete \
  --exclude "*.map"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "CDN URLs:"
echo "  Versioned: https://${BUCKET}.fly.storage.tigris.dev/v${VERSION}/loader/index.js"
echo "  Latest:    https://${BUCKET}.fly.storage.tigris.dev/latest/loader/index.js"
echo ""
echo "Usage:"
echo '  <script type="module" src="https://'"${BUCKET}"'.fly.storage.tigris.dev/v'"${VERSION}"'/loader/index.js"></script>'
