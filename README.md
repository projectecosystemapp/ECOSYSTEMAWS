# Service Marketplace MVP

Next.js 14 + AWS Amplify Gen2 marketplace. This README documents only what’s needed to run and deploy the MVP.

## Requirements
- Node 20.x (use `.nvmrc`) and npm 10+
- AWS credentials configured (`aws configure`) for Amplify
- Stripe test keys if using payment flows

## Quick Start
```bash
npm install
# Terminal A – Next.js dev server
npm run dev
# Terminal B – Amplify sandbox (if working on backend)
npx ampx sandbox
```

## Project Structure (key paths)
```
amplify/           Amplify backend (auth, data, functions)
app/               Next.js App Router
  admin/ auth/ customer/ provider/ services/ bookings/ notifications/
  api/ messaging/ dashboard/ test-stripe/
components/        UI + feature components (e.g., ui/, admin/, messaging/)
lib/               Shared utils, types, clients
tests/e2e/         Playwright tests; unit setup in test/
```

## Commands
- `npm run dev`: Start Next.js dev server (http://localhost:3000)
- `npm run build` → `npm start`: Production build and start
- `npm run lint`: ESLint (type-aware rules configured)
- `npm test` | `npm run test:coverage`: Vitest unit tests
- `npm run test:e2e` | `:ui` | `:headed`: Playwright E2E
  - Example: `PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 npm run test:e2e`

## Environment
Create `.env.local`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Deploy (Amplify Hosting)
```bash
npx ampx pipeline-deploy --branch main --app-id <YOUR_APP_ID>
```

## Notes
- `amplify_outputs.json` is generated and used by the app; don’t edit manually.
- We removed non-functional AI/MCP tooling from this README to keep the MVP lean.
