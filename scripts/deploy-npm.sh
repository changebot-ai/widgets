#!/bin/bash

set -e

VERSION=$(node -p "require('./packages/core/package.json').version")
echo "Publishing version ${VERSION} to npm..."

pnpm --filter @changebot/core publish --access public --no-git-checks
pnpm --filter @changebot/widgets-react publish --access public --no-git-checks
pnpm --filter @changebot/widgets-vue publish --access public --no-git-checks

echo "Published: @changebot/core@${VERSION}, @changebot/widgets-react@${VERSION}, @changebot/widgets-vue@${VERSION}"
