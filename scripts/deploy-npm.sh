#!/bin/bash

set -e

VERSION=$(node -p "require('./packages/core/package.json').version")
echo "Publishing version ${VERSION} to npm..."

# Clear NODE_AUTH_TOKEN set by setup-node action to allow OIDC authentication
# See: https://github.com/actions/setup-node/issues/1440
unset NODE_AUTH_TOKEN

# pnpm doesn't support OIDC Trusted Publishing yet, so we use npm directly
# However, we use pnpm pack to convert workspace: references to actual versions
# npm CLI 11.5.1+ handles OIDC authentication and generates provenance automatically

# Pack each package (converts workspace: to real versions)
echo "Packing @changebot/core..."
CORE_TARBALL=$(cd packages/core && pnpm pack --pack-destination .)
echo "Packing @changebot/widgets-react..."
REACT_TARBALL=$(cd packages/react && pnpm pack --pack-destination .)
echo "Packing @changebot/widgets-vue..."
VUE_TARBALL=$(cd packages/vue && pnpm pack --pack-destination .)

# Publish the packed tarballs
echo "Publishing @changebot/core..."
(cd packages/core && npm publish "$CORE_TARBALL" --access public --provenance)
echo "Publishing @changebot/widgets-react..."
(cd packages/react && npm publish "$REACT_TARBALL" --access public --provenance)
echo "Publishing @changebot/widgets-vue..."
(cd packages/vue && npm publish "$VUE_TARBALL" --access public --provenance)

# Clean up tarballs
rm -f "packages/core/$CORE_TARBALL"
rm -f "packages/react/$REACT_TARBALL"
rm -f "packages/vue/$VUE_TARBALL"

echo "Published: @changebot/core@${VERSION}, @changebot/widgets-react@${VERSION}, @changebot/widgets-vue@${VERSION}"
