#!/bin/bash

set -e

VERSION=$(node -p "require('./packages/core/package.json').version")
echo "Publishing version ${VERSION} to npm..."

# Clear NODE_AUTH_TOKEN set by setup-node action to allow OIDC authentication
# See: https://github.com/actions/setup-node/issues/1440
unset NODE_AUTH_TOKEN

# pnpm doesn't support OIDC Trusted Publishing yet, so we use npm directly
# npm CLI 11.5.1+ handles OIDC authentication and generates provenance automatically
(cd packages/core && npm publish --access public --provenance)
(cd packages/react && npm publish --access public --provenance)
(cd packages/vue && npm publish --access public --provenance)

echo "Published: @changebot/core@${VERSION}, @changebot/widgets-react@${VERSION}, @changebot/widgets-vue@${VERSION}"
