#!/bin/bash

set -e

VERSION=$(node -p "require('./packages/core/package.json').version")
echo "Publishing version ${VERSION} to npm..."

# pnpm doesn't support OIDC Trusted Publishing yet, so we use npm directly
# npm CLI 11.5.1+ handles OIDC authentication and generates provenance automatically
cd packages/core && npm publish --access public --provenance
cd ../widgets-react && npm publish --access public --provenance
cd ../widgets-vue && npm publish --access public --provenance
cd ../..

echo "Published: @changebot/core@${VERSION}, @changebot/widgets-react@${VERSION}, @changebot/widgets-vue@${VERSION}"
