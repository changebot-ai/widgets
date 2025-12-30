#!/usr/bin/env bash
set -euo pipefail

# Bump version in all package.json files
# Usage:
#   ./scripts/bump-version.sh          # Increment patch version (0.1.10 -> 0.1.11)
#   ./scripts/bump-version.sh 0.2.0    # Set specific version

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Get current version from core package.json
CURRENT_VERSION=$(jq -r '.version' "$ROOT_DIR/packages/core/package.json")

if [[ -n "${1:-}" ]]; then
  # Use provided version
  NEW_VERSION="$1"
else
  # Increment patch version
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
  NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
fi

echo "Bumping version: $CURRENT_VERSION -> $NEW_VERSION"

# Update all package.json files
for pkg in core react vue; do
  PKG_FILE="$ROOT_DIR/packages/$pkg/package.json"
  jq --arg v "$NEW_VERSION" '.version = $v' "$PKG_FILE" > "$PKG_FILE.tmp"
  mv "$PKG_FILE.tmp" "$PKG_FILE"
  echo "  Updated packages/$pkg/package.json"
done

# Stage, commit, and push
cd "$ROOT_DIR"
git add packages/*/package.json
git commit -m "chore: Bump all packages to v$NEW_VERSION"
git push origin main

echo ""
echo "Done! Version $NEW_VERSION pushed to main."
echo "GitHub Actions will automatically create tags and releases."
