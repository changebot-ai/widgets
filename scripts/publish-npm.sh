#!/usr/bin/env bash
set -e

# npm publish script
# Publishes all three packages to npm registry

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VERSION=$(node -p "require('./packages/core/package.json').version")

echo -e "${BLUE}📦 Publishing Changebot Widgets to npm${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo ""

# Ensure we have built packages
if [ ! -d "packages/core/dist" ]; then
  echo "Building packages first..."
  pnpm run build
fi

# Check if user is logged into npm
if ! npm whoami &> /dev/null; then
  echo -e "${YELLOW}⚠️  You are not logged into npm. Please run: npm login${NC}"
  exit 1
fi

# Publish core package
echo -e "${GREEN}📤 Publishing @changebot/core...${NC}"
cd packages/core
npm publish --access public
cd ../..

# Publish React package
echo -e "${GREEN}📤 Publishing @changebot/widgets-react...${NC}"
cd packages/react
npm publish --access public
cd ../..

# Publish Vue package
echo -e "${GREEN}📤 Publishing @changebot/widgets-vue...${NC}"
cd packages/vue
npm publish --access public
cd ../..

echo ""
echo -e "${GREEN}✅ All packages published successfully!${NC}"
echo ""
echo "Published packages:"
echo "  - @changebot/core@${VERSION}"
echo "  - @changebot/widgets-react@${VERSION}"
echo "  - @changebot/widgets-vue@${VERSION}"
echo ""
echo "Usage:"
echo "  npm install @changebot/core"
echo "  npm install @changebot/widgets-react"
echo "  npm install @changebot/widgets-vue"
