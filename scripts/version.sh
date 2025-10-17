#!/usr/bin/env bash
set -e

# Version bumping script
# Bumps version across all packages

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage: ./scripts/version.sh <major|minor|patch|version>${NC}"
  echo ""
  echo "Examples:"
  echo "  ./scripts/version.sh patch     # 0.0.1 -> 0.0.2"
  echo "  ./scripts/version.sh minor     # 0.0.1 -> 0.1.0"
  echo "  ./scripts/version.sh major     # 0.0.1 -> 1.0.0"
  echo "  ./scripts/version.sh 1.2.3     # Set to specific version"
  exit 1
fi

VERSION_ARG=$1

echo -e "${BLUE}🔄 Bumping version to ${VERSION_ARG}...${NC}"
echo ""

# Bump core package
echo -e "${GREEN}📦 Updating @changebot/core...${NC}"
cd packages/core
npm version $VERSION_ARG --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
cd ../..

# Update React package to same version
echo -e "${GREEN}📦 Updating @changebot/widgets-react to ${NEW_VERSION}...${NC}"
cd packages/react
npm version $NEW_VERSION --no-git-tag-version
cd ../..

# Update Vue package to same version
echo -e "${GREEN}📦 Updating @changebot/widgets-vue to ${NEW_VERSION}...${NC}"
cd packages/vue
npm version $NEW_VERSION --no-git-tag-version
cd ../..

echo ""
echo -e "${GREEN}✅ All packages updated to version ${NEW_VERSION}${NC}"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit: git add . && git commit -m \"chore: bump version to ${NEW_VERSION}\""
echo "  3. Tag: git tag v${NEW_VERSION}"
echo "  4. Deploy: pnpm run deploy"
