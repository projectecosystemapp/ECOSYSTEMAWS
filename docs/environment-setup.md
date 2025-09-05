# Environment Setup Guide

## Prerequisites

Before setting up the CI/CD pipeline, ensure you have the following:

### Required Accounts
- GitHub account with repository access
- AWS account with appropriate permissions
- Amplify app already created
- Stripe account (test and live)

### Local Development Requirements
- Node.js 20.x or later
- npm 10.x or later
- Git
- AWS CLI (for manual operations)

## GitHub Repository Setup

### 1. Repository Secrets Configuration

Navigate to your GitHub repository → Settings → Secrets and variables → Actions

#### AWS Secrets
```
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/GitHubActionsRole
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA1234567890EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY
AMPLIFY_APP_ID=d1234567890123
```

#### Environment-specific URLs
```
STAGING_API_URL=https://api-staging.yourmarketplace.com
PROD_API_URL=https://api.yourmarketplace.com
```

#### Stripe Configuration
```
STRIPE_TEST_PUBLIC_KEY=pk_test_51234567890abcdefghijklmnopqrstuvwxyz
STRIPE_LIVE_PUBLIC_KEY=pk_live_51234567890abcdefghijklmnopqrstuvwxyz
```

#### Optional Services
```
CODECOV_TOKEN=12345678-1234-1234-1234-123456789012
LHCI_GITHUB_APP_TOKEN=12345678-1234-1234-1234-123456789012
```

### 2. Branch Protection Rules

Set up branch protection for `main` and `develop` branches:

1. Go to Settings → Branches
2. Add rule for `main`:
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Required status checks:
     - `lint-and-type-check`
     - `security-scan`
     - `test`
     - `deploy-staging` (for production deployments)
   - Require branches to be up to date before merging
   - Restrict pushes that create files matching a prohibited pattern

3. Add rule for `develop`:
   - Require status checks to pass before merging
   - Required status checks:
     - `lint-and-type-check`
     - `security-scan`
     - `test`

### 3. Environment Configuration

Set up GitHub environments:

#### Staging Environment
1. Go to Settings → Environments
2. Create "staging" environment
3. No protection rules needed (auto-deploy)

#### Production Environment
1. Create "production" environment
2. Configure protection rules:
   - Required reviewers: Add team leads
   - Wait timer: 5 minutes (optional)
   - Deployment branches: Only `main` branch

#### Production Rollback Environment
1. Create "production-rollback" environment
2. Configure protection rules:
   - Required reviewers: Add DevOps/platform team
   - Allow administrators to bypass protection rules

## AWS Setup

### 1. IAM Role for GitHub Actions

Create an IAM role that GitHub Actions can assume:

#### Trust Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:yourusername/yourrepo:*"
        }
      }
    }
  ]
}
```

#### Permissions Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "amplify:*",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "cloudformation:*",
        "iam:PassRole",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. OIDC Provider Setup

If not already configured, set up the OIDC provider for GitHub Actions:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 3. Amplify App Configuration

Ensure your Amplify app is properly configured:

#### Build Settings (amplify.yml)
```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci
        - npx ampx generate outputs --app-id $AWS_APP_ID --branch $AWS_BRANCH --format json --out-dir src
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

#### Environment Variables
Set in Amplify Console for each branch:

**Develop Branch (Staging):**
```
NEXT_PUBLIC_API_URL=https://api-staging.yourmarketplace.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NODE_ENV=development
AMPLIFY_DIFF_DEPLOY=false
AMPLIFY_MONOREPO_APP_ROOT=.
```

**Main Branch (Production):**
```
NEXT_PUBLIC_API_URL=https://api.yourmarketplace.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NODE_ENV=production
AMPLIFY_DIFF_DEPLOY=false
AMPLIFY_MONOREPO_APP_ROOT=.
```

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/yourrepo.git
cd yourrepo
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. AWS Configuration (Optional)
For local Amplify operations:
```bash
aws configure
npx ampx configure profile
```

## Testing Setup

### 1. Unit Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### 2. E2E Testing
```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### 3. Performance Testing
```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run Lighthouse
lhci autorun
```

## Stripe Setup

### 1. Test Environment
1. Create Stripe test account
2. Get publishable key from dashboard
3. Add to GitHub secrets as `STRIPE_TEST_PUBLIC_KEY`
4. Configure webhooks for staging URL

### 2. Production Environment
1. Complete Stripe verification
2. Get live publishable key
3. Add to GitHub secrets as `STRIPE_LIVE_PUBLIC_KEY`
4. Configure webhooks for production URL

## Monitoring Setup

### 1. Codecov (Optional)
1. Sign up at codecov.io
2. Connect your repository
3. Add `CODECOV_TOKEN` to GitHub secrets

### 2. Lighthouse CI (Optional)
1. Set up Lighthouse CI app
2. Get GitHub app token
3. Add `LHCI_GITHUB_APP_TOKEN` to GitHub secrets

## Troubleshooting Common Setup Issues

### GitHub Actions Permission Errors
- Verify IAM role trust policy includes correct repository
- Check OIDC provider is properly configured
- Ensure role has necessary permissions

### AWS Amplify Build Failures
- Check build logs in Amplify console
- Verify environment variables are set
- Ensure Node.js version matches requirements

### Test Failures
- Run tests locally first
- Check environment variables
- Verify test data and mocks

### Dependency Issues
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall
- Check for conflicting versions

## Verification Checklist

After setup, verify everything works:

- [ ] Push to develop branch triggers staging deployment
- [ ] Push to main branch triggers production deployment
- [ ] All CI checks pass (lint, test, security)
- [ ] E2E tests run successfully
- [ ] Performance monitoring works
- [ ] Security scanning completes
- [ ] Deployment notifications are received
- [ ] Rollback procedures work

## Support

### AWS Support
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AWS Support Center](https://console.aws.amazon.com/support/)

### GitHub Support
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Support](https://support.github.com/)

### Platform Support
- Check internal documentation
- Contact DevOps team
- Review troubleshooting guides