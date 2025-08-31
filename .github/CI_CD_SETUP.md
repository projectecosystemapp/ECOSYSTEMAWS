# CI/CD Configuration Guide

## Overview
This repository uses a streamlined CI/CD setup optimized for practical development while maintaining security and code quality standards.

## Workflows

### 1. Continuous Integration (`ci.yml`)
**Triggers**: Pull requests and pushes to main branch
**Purpose**: Ensure code quality without blocking development

#### Features:
- ✅ TypeScript type checking (required)
- ✅ Build verification (required)
- ⚠️ Linting (warnings only, won't block merge)
- ⚠️ Tests (warnings only if no tests exist)
- 💬 PR status comments

#### Why This Approach:
- **Type checking is required** because type errors will break the build
- **Linting is non-blocking** because style issues don't affect functionality
- **Tests are non-blocking** to allow development while tests are being written

### 2. Security Scanning (`security.yml`)
**Triggers**: Weekly schedule, dependency changes, manual
**Purpose**: Identify vulnerabilities without constant noise

#### Features:
- 🔒 npm audit (fails only on critical vulnerabilities)
- 📜 License compliance checking
- 🔍 Secret detection with Gitleaks
- 📊 Automated issue creation for critical findings

#### Schedule:
- Runs every Monday at 9 AM UTC
- Can be triggered manually when needed
- Runs on PRs that modify dependencies

### 3. Dependabot Auto-Merge (`dependabot-auto-merge.yml`)
**Triggers**: Dependabot pull requests
**Purpose**: Reduce PR management overhead

#### Features:
- ✅ Auto-approve and merge patch/minor updates
- ⚠️ Require manual review for major updates
- 🏷️ Automatic labeling based on update type
- 💬 Comments on major version updates

## Dependabot Configuration

### Update Schedule:
- **npm packages**: Weekly (Mondays)
- **GitHub Actions**: Monthly
- **PR Limit**: 3 for npm, 1 for Actions

### Grouping Strategy:
All minor and patch updates are grouped into a single PR to reduce noise.

### Ignored Major Updates:
- Next.js
- React/React-DOM
- TypeScript
- AWS Amplify packages

These require manual updates due to potential breaking changes.

## GitHub Settings Recommendations

### Branch Protection Rules (for `main`):
```yaml
Required status checks:
  - code-quality (from ci.yml)
  
Settings:
  - Require branches to be up to date: OFF (allows easier merging)
  - Include administrators: OFF (allows emergency fixes)
  - Allow force pushes: OFF
  - Allow deletions: OFF
```

### Auto-merge Settings:
Enable auto-merge in repository settings to allow Dependabot automation.

## Local Development

### Pre-commit Hooks:
The repository uses Husky for pre-commit hooks. To bypass when needed:
```bash
git commit -m "message" --no-verify
```

### Running Workflows Locally:
```bash
# Run CI checks
npm run lint
npm run build
npm test

# Security audit
npm audit
```

## Deployment

**Important**: This repository uses AWS Amplify for deployment. GitHub Actions do NOT deploy the application.

Deployment happens automatically when:
1. Code is pushed to `main` branch
2. AWS Amplify detects the change
3. Amplify runs its own build process

## Troubleshooting

### If CI is failing:
1. Check TypeScript errors: `npx tsc --noEmit`
2. Check build: `npm run build`
3. Linting failures are warnings only

### If Security scan fails:
1. Run `npm audit fix` for automatic fixes
2. Review critical vulnerabilities manually
3. Check the created GitHub issue for details

### If Dependabot PRs aren't merging:
1. Ensure CI checks are passing
2. Check if it's a major version update (requires manual review)
3. Verify auto-merge is enabled in repository settings

## Best Practices

1. **Don't ignore CI failures** - They indicate real problems
2. **Review security alerts** - Even if they don't block merging
3. **Update major versions carefully** - Test thoroughly before merging
4. **Keep dependencies current** - Reduces security risk
5. **Use conventional commits** - Helps with changelog generation

## Contact

For CI/CD issues or questions, create an issue in the repository.