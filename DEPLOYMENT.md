# Deployment Guide

This monorepo deploys to two targets:
1. **Tigris CDN** (https://t3.storage.dev) - For script tag users
2. **npm** - For React/Vue/bundler users

## Automated Deployment (Recommended)

Deployments are fully automated using [release-please](https://github.com/googleapis/release-please) and GitHub Actions.

### How It Works

1. **Make commits using [Conventional Commits](https://www.conventionalcommits.org/):**
   ```bash
   git commit -m "feat: add new widget feature"      # Minor version bump
   git commit -m "fix: resolve rendering issue"      # Patch version bump
   git commit -m "feat!: breaking API change"        # Major version bump
   git commit -m "docs: update README"               # No version bump
   ```

2. **Push to main:**
   ```bash
   git push origin main
   ```

3. **Release-please creates/updates a release PR automatically:**
   - Updates version numbers across all packages
   - Generates CHANGELOG.md with all changes
   - Groups all commits since last release

4. **Review and merge the release PR**

5. **On merge, GitHub Actions automatically:**
   - Builds all packages
   - Deploys to CDN at https://t3.storage.dev
   - Publishes to npm registry

### Required GitHub Secrets

Configure these at `https://github.com/changebot-ai/widgets/settings/secrets/actions`:

- `AWS_ACCESS_KEY_ID` - Tigris access key for CDN deployment
- `AWS_SECRET_ACCESS_KEY` - Tigris secret key for CDN deployment
- `NPM_TOKEN` - npm automation token for publishing

### Conventional Commit Prefixes

- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)
- `feat!:` or `BREAKING CHANGE:` - Breaking change (major version bump)
- `chore:`, `docs:`, `style:`, `refactor:`, `test:`, `ci:` - No version bump

## Manual Deployment (Backup)

Manual deployment scripts are available for emergency use or local testing.

### Prerequisites

#### Tigris Setup

The deployment script is pre-configured:
- Bucket: `widgets`
- Endpoint: `https://t3.storage.dev`

Configure AWS CLI credentials:

```bash
aws configure
# Enter your Tigris Access Key ID
# Enter your Tigris Secret Access Key
# Region: auto
# Output format: json
```

#### npm Setup

Login to npm:

```bash
npm login
```

### Manual Commands

```bash
# Deploy everything (CDN + npm)
pnpm run deploy

# Deploy CDN only
pnpm run deploy:cdn

# Deploy npm only
pnpm run deploy:npm

# Bump versions manually (syncs all packages)
./scripts/version.sh patch   # 0.0.1 -> 0.0.2
./scripts/version.sh minor   # 0.0.1 -> 0.1.0
./scripts/version.sh major   # 0.0.1 -> 1.0.0
./scripts/version.sh 1.2.3   # Set specific version
```

## Usage After Deployment

### Script Tag Users (CDN)

```html
<!-- Pinned version (recommended for production) -->
<script type="module" src="https://t3.storage.dev/v0.0.1/loader/index.js"></script>
<changebot-panel scope="my-app"></changebot-panel>

<!-- Latest (for development) -->
<script type="module" src="https://t3.storage.dev/latest/loader/index.js"></script>
```

### React Users (npm)

```bash
npm install @changebot/widgets-react
```

```jsx
import { ChangebotPanel } from '@changebot/widgets-react';

function App() {
  return <ChangebotPanel scope="my-app" />;
}
```

### Vue Users (npm)

```bash
npm install @changebot/widgets-vue
```

```vue
<template>
  <changebot-panel scope="my-app"></changebot-panel>
</template>

<script setup>
import { ChangebotPanel } from '@changebot/widgets-vue';
</script>
```

## CDN Configuration

### Versioning Strategy

- **Versioned URLs** (`/v0.0.1/`): Immutable, cached forever (1 year)
- **Latest URL** (`/latest/`): Short cache (5 minutes), always points to newest version

### CORS Configuration (One-time setup)

If accessing from browsers, configure CORS on your Tigris bucket:

```bash
aws s3api put-bucket-cors \
  --bucket widgets \
  --endpoint-url https://t3.storage.dev \
  --cors-configuration file://cors.json
```

`cors.json`:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

## Deployed Packages

All packages are licensed under Apache-2.0:

- **@changebot/core** - Core Stencil web components (framework-agnostic)
- **@changebot/widgets-react** - React wrapper components
- **@changebot/widgets-vue** - Vue 3 wrapper components

## Troubleshooting

### Release PR not created

- Ensure commits use conventional commit format
- Check GitHub Actions logs at https://github.com/changebot-ai/widgets/actions
- Verify release-please workflow has proper permissions

### Deployment fails

- Check GitHub secrets are configured correctly
- Verify AWS credentials have write access to Tigris bucket
- Verify npm token has publish permissions
- Review GitHub Actions logs for specific errors

### Manual deployment needed

Use the manual deployment scripts if automated deployment fails:

```bash
# Build and deploy manually
pnpm run build
pnpm run deploy:cdn
pnpm run deploy:npm
```
