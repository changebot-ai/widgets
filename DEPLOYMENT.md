# Deployment Guide

This monorepo deploys to two targets:
1. **Tigris CDN** - For script tag users
2. **npm** - For React/Vue/bundler users

## Prerequisites

### Tigris Setup

Configure AWS CLI for Tigris:

```bash
aws configure --profile tigris
# Enter your Tigris Access Key ID
# Enter your Tigris Secret Access Key
# Region: auto
# Output format: json
```

Set environment variables:

```bash
export TIGRIS_BUCKET="your-bucket-name"
export TIGRIS_ENDPOINT="https://fly.storage.tigris.dev"
export AWS_PROFILE=tigris  # Use Tigris credentials
```

### npm Setup

Login to npm:

```bash
npm login
```

## Deployment Commands

### Deploy Everything (CDN + npm)

```bash
pnpm run deploy
```

This will:
1. Build all packages
2. Deploy to Tigris CDN
3. Publish to npm

### Deploy CDN Only

```bash
pnpm run deploy:cdn
```

Deploys to:
- `https://{bucket}.fly.storage.tigris.dev/v{version}/loader/index.js` (versioned)
- `https://{bucket}.fly.storage.tigris.dev/latest/loader/index.js` (latest)

### Deploy npm Only

```bash
pnpm run deploy:npm
```

Publishes three packages:
- `@changebot/core` - Core Stencil components
- `@changebot/widgets-react` - React wrappers
- `@changebot/widgets-vue` - Vue wrappers

## Versioning

Before deploying, update the version in `packages/core/package.json`:

```bash
cd packages/core
npm version patch  # or minor, major
cd ../..
```

Then sync versions across packages:

```bash
# Update React package
cd packages/react
npm version {same-version-as-core}
cd ../..

# Update Vue package
cd packages/vue
npm version {same-version-as-core}
cd ../..
```

## Usage After Deployment

### Script Tag Users (CDN)

```html
<!-- Pinned version (recommended for production) -->
<script type="module" src="https://your-bucket.fly.storage.tigris.dev/v0.0.1/loader/index.js"></script>
<changebot-panel scope="my-app"></changebot-panel>

<!-- Latest (for development) -->
<script type="module" src="https://your-bucket.fly.storage.tigris.dev/latest/loader/index.js"></script>
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

## CORS Configuration (One-time setup)

If accessing from browsers, configure CORS on your Tigris bucket:

```bash
aws s3api put-bucket-cors \
  --bucket your-bucket-name \
  --endpoint-url https://fly.storage.tigris.dev \
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
