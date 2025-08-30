# Deploy Notes

## Node.js Version Requirements

- The build requires Node.js v20.19.0+ because of Vite 7 and related dependencies
- CI is pinned via amplify.yml using nvm
- Local development is pinned with .nvmrc. Run `nvm use` before installing

## Local Development Setup

```bash
# Use the correct Node version
nvm use

# Install dependencies
npm ci

# Run development server
npm run dev
```

## Deployment

- AWS Amplify automatically uses Node 20.19.0 via the amplify.yml configuration
- The .npmrc file enforces strict engine requirements
- After any Node version changes, trigger a fresh Amplify build without cache

## Troubleshooting

If deployment fails:

1. Check the Amplify build logs for Node version output
2. Ensure all dependencies are compatible with Node 20
3. Clear Amplify build cache and redeploy
