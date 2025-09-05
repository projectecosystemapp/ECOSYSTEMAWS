# Deployment Guide

## Overview

This marketplace platform uses a comprehensive CI/CD pipeline with GitHub Actions and AWS Amplify for automated deployments. The pipeline includes multiple environments, comprehensive testing, security scanning, and performance monitoring.

## Environments

### Staging Environment
- **Branch**: `develop`
- **URL**: `https://develop.{AMPLIFY_APP_ID}.amplifyapp.com`
- **Purpose**: Testing and QA before production deployment
- **Auto-deploy**: Yes, on push to `develop` branch
- **Stripe**: Test mode keys

### Production Environment
- **Branch**: `main`
- **URL**: `https://main.{AMPLIFY_APP_ID}.amplifyapp.com`
- **Purpose**: Live production environment
- **Auto-deploy**: Yes, on push to `main` branch (after staging validation)
- **Stripe**: Live mode keys
- **Approval**: Required for manual deployments

## GitHub Actions Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Pull requests to `main` or `develop`
- Push to `main` or `develop`

**Jobs:**
- **Lint and Type Check**: ESLint and TypeScript validation
- **Security Scan**: npm audit and Trivy security scanning
- **Test**: Unit tests with Vitest and coverage reporting

**Required Secrets:**
- `CODECOV_TOKEN` (optional): For coverage reporting

### 2. E2E Testing (`.github/workflows/e2e.yml`)

**Triggers:**
- Pull requests to `main` or `develop`
- Push to `main` or `develop`
- Daily at 2 AM UTC
- Manual trigger

**Jobs:**
- **E2E Tests**: Playwright tests across multiple browsers
- **Mobile Tests**: Mobile-specific test scenarios
- **Lighthouse Audit**: Performance and accessibility testing

**Test Matrix:**
- Browsers: Chromium, Firefox, WebKit
- Mobile: Chrome Mobile, Safari Mobile
- Sharding: 4 parallel shards for faster execution

### 3. Security Scanning (`.github/workflows/security.yml`)

**Triggers:**
- Pull requests to `main` or `develop`
- Push to `main` or `develop`
- Daily at 6 AM UTC
- Manual trigger

**Security Checks:**
- Dependency vulnerability scanning
- Code security analysis with CodeQL
- Secret scanning with TruffleHog
- License compliance checking
- Security headers validation
- Container security scanning

### 4. Performance Monitoring (`.github/workflows/performance.yml`)

**Triggers:**
- Push to `main`
- Pull requests to `main`
- Weekly on Sundays at 3 AM UTC
- Manual trigger

**Performance Tests:**
- Lighthouse CI audits
- Bundle size analysis
- Load testing with Artillery

### 5. Deployment Pipeline (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to `main` (production) or `develop` (staging)
- Manual workflow dispatch

**Deployment Flow:**
1. **Pre-deployment Checks**: Lint, type-check, and test
2. **Staging Deployment**: Deploy to staging environment
3. **Production Deployment**: Deploy to production (requires staging success)
4. **Rollback**: Automatic rollback on production failure

## Required GitHub Secrets

### AWS Configuration
```
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT:role/GitHubActionsRole
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AMPLIFY_APP_ID=d1234567890123
```

### Environment URLs
```
STAGING_API_URL=https://api-staging.yourapp.com
PROD_API_URL=https://api.yourapp.com
```

### Stripe Configuration
```
STRIPE_TEST_PUBLIC_KEY=pk_test_...
STRIPE_LIVE_PUBLIC_KEY=pk_live_...
```

### Optional
```
CODECOV_TOKEN=...
LHCI_GITHUB_APP_TOKEN=...
```

## Manual Deployment

### Using GitHub UI

1. Go to Actions tab in your GitHub repository
2. Select "Deploy to AWS Amplify" workflow
3. Click "Run workflow"
4. Choose environment (staging/production)
5. Optionally skip tests for emergency deployments
6. Click "Run workflow"

### Using GitHub CLI

```bash
# Deploy to staging
gh workflow run deploy.yml -f environment=staging

# Deploy to production
gh workflow run deploy.yml -f environment=production

# Emergency deployment (skip tests)
gh workflow run deploy.yml -f environment=production -f skip_tests=true
```

## Branch Strategy

### Development Flow
1. Create feature branch from `develop`
2. Make changes and commit
3. Open PR to `develop`
4. CI pipeline runs automatically
5. After review and approval, merge to `develop`
6. Staging deployment happens automatically

### Production Release
1. Open PR from `develop` to `main`
2. Full CI/CD pipeline runs
3. After review and approval, merge to `main`
4. Production deployment happens automatically

### Hotfix Flow
1. Create hotfix branch from `main`
2. Make critical fix
3. Open PR to `main`
4. Emergency deployment can skip tests if needed
5. Also merge hotfix back to `develop`

## Environment Variables

### Staging Environment
```
NEXT_PUBLIC_API_URL=https://api-staging.yourapp.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NODE_ENV=development
```

### Production Environment
```
NEXT_PUBLIC_API_URL=https://api.yourapp.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NODE_ENV=production
```

## Monitoring and Alerts

### Build Status
- GitHub Actions provides build status badges
- Email notifications on failure
- PR comments with deployment status

### Performance Monitoring
- Lighthouse scores in PR comments
- Performance regression alerts
- Bundle size tracking

### Security Alerts
- Dependency vulnerability notifications
- Security scanning results
- License compliance reports

## Rollback Procedures

### Automatic Rollback
- Triggered automatically on production deployment failure
- Reverts to previous commit
- Notifications sent to team

### Manual Rollback
1. Identify the last known good commit
2. Create rollback branch from that commit
3. Deploy using manual workflow
4. Or use Amplify console for immediate rollback

## Troubleshooting

### Common Issues

#### Deployment Fails
1. Check GitHub Actions logs
2. Verify AWS credentials and permissions
3. Check Amplify build logs in AWS console
4. Verify environment variables are set correctly

#### Tests Failing
1. Run tests locally: `npm run test`
2. Check for environment-specific issues
3. Review test failure logs in Actions
4. Update tests if application changes

#### Security Scan Failures
1. Review security scan results
2. Update vulnerable dependencies: `npm audit fix`
3. Address code security issues
4. Update security policies if needed

#### Performance Issues
1. Review Lighthouse reports
2. Check bundle size analysis
3. Optimize images and assets
4. Review Core Web Vitals metrics

### Emergency Procedures

#### Emergency Deployment
```bash
# Skip all tests and deploy immediately
gh workflow run deploy.yml \
  -f environment=production \
  -f skip_tests=true
```

#### Emergency Rollback
1. Go to AWS Amplify console
2. Find the app in the region
3. Go to the main branch
4. Click on previous successful deployment
5. Click "Redeploy this version"

## Best Practices

### Code Quality
- Always run tests locally before pushing
- Use meaningful commit messages
- Keep PRs small and focused
- Review security scan results

### Deployment Safety
- Test in staging before production
- Use feature flags for risky changes
- Monitor application after deployment
- Have rollback plan ready

### Performance
- Monitor bundle size regularly
- Optimize images and assets
- Use performance budgets
- Review Core Web Vitals

### Security
- Keep dependencies updated
- Review security scan results
- Use proper environment variables
- Follow security best practices

## Support

### Documentation
- [AWS Amplify Docs](https://docs.amplify.aws/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Playwright Docs](https://playwright.dev/)

### Team Contacts
- DevOps Lead: [Your contact]
- Security Team: [Your contact]
- Platform Team: [Your contact]