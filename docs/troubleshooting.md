# Troubleshooting Guide

## Common CI/CD Issues

### GitHub Actions Failures

#### Authentication Issues

**Problem**: `Error: Could not assume role with OIDC`
```
Error: Could not assume role with OIDC: Access denied
```

**Solutions**:
1. Verify OIDC provider is configured in AWS
2. Check IAM role trust policy includes your repository
3. Ensure repository path matches exactly in trust policy
4. Verify `AWS_ROLE_ARN` secret is correct

**Trust Policy Check**:
```bash
aws iam get-role --role-name GitHubActionsRole --query 'Role.AssumeRolePolicyDocument'
```

#### Build Failures

**Problem**: `npm ci` fails
```
npm ERR! Cannot read properties of null (reading 'path')
```

**Solutions**:
1. Clear npm cache in workflow:
   ```yaml
   - name: Clear npm cache
     run: npm cache clean --force
   ```
2. Update package-lock.json
3. Check Node.js version compatibility

**Problem**: TypeScript build fails
```
error TS2307: Cannot find module 'aws-amplify/data'
```

**Solutions**:
1. Ensure all dependencies are installed
2. Check tsconfig.json paths configuration
3. Verify Amplify outputs are generated
4. Add explicit dependency installation:
   ```yaml
   - name: Install Amplify CLI
     run: npm install -g @aws-amplify/cli
   ```

#### Test Failures

**Problem**: Tests fail in CI but pass locally
```
TypeError: Cannot read properties of undefined (reading 'mockReturnValue')
```

**Solutions**:
1. Check test environment variables
2. Verify mocks are properly configured in test setup
3. Add CI-specific test configuration:
   ```javascript
   // In test setup
   if (process.env.CI) {
     // CI-specific setup
   }
   ```

**Problem**: E2E tests timeout
```
Timeout of 30000ms exceeded
```

**Solutions**:
1. Increase timeout in playwright.config.ts
2. Add wait conditions:
   ```javascript
   await page.waitForLoadState('networkidle');
   ```
3. Check server startup in CI
4. Add retry configuration

### AWS Amplify Deployment Issues

#### Build Failures

**Problem**: Amplify build fails with memory issues
```
JavaScript heap out of memory
```

**Solutions**:
1. Increase Node.js memory in build settings:
   ```yaml
   build:
     commands:
       - export NODE_OPTIONS="--max_old_space_size=4096"
       - npm run build
   ```
2. Optimize bundle size
3. Use dynamic imports for large components

**Problem**: Environment variables not available
```
ReferenceError: NEXT_PUBLIC_API_URL is not defined
```

**Solutions**:
1. Check Amplify console environment variables
2. Verify variable names match exactly
3. Restart build after adding variables
4. Check if variables are prefixed with `NEXT_PUBLIC_`

#### Deployment Failures

**Problem**: Deployment succeeds but app shows 404
```
Application Error: The page you are looking for doesn't exist
```

**Solutions**:
1. Check Next.js output directory in amplify.yml
2. Verify static export configuration
3. Check routing configuration
4. Review Amplify rewrite rules

**Problem**: API routes not working
```
GET /api/health 404 Not Found
```

**Solutions**:
1. Verify API routes are included in build
2. Check Next.js API configuration
3. Add API route rewrites in Amplify:
   ```json
   {
     "source": "/api/<*>",
     "target": "/api/<*>",
     "status": "200",
     "condition": null
   }
   ```

### Testing Issues

#### Unit Test Problems

**Problem**: AWS Amplify mocks not working
```
TypeError: generateClient is not a function
```

**Solutions**:
1. Update test setup file:
   ```javascript
   vi.mock('aws-amplify/data', () => ({
     generateClient: vi.fn(() => ({
       models: {
         // Mock models
       }
     }))
   }));
   ```
2. Check mock file location and imports
3. Verify Vitest configuration

**Problem**: Coverage reports not generated
```
Coverage file not found
```

**Solutions**:
1. Ensure coverage provider is installed:
   ```bash
   npm install --save-dev @vitest/coverage-v8
   ```
2. Check vitest.config.ts coverage settings
3. Run tests with coverage flag: `npm run test:coverage`

#### E2E Test Problems

**Problem**: Playwright tests fail on CI
```
browserType.launch: Executable doesn't exist
```

**Solutions**:
1. Install browsers in CI:
   ```yaml
   - name: Install Playwright browsers
     run: npx playwright install --with-deps
   ```
2. Use correct browser names in configuration
3. Check Playwright version compatibility

**Problem**: Page load timeouts
```
page.goto: Timeout 30000ms exceeded
```

**Solutions**:
1. Increase timeout in test:
   ```javascript
   await page.goto('/', { timeout: 60000 });
   ```
2. Check if development server is running
3. Add wait conditions:
   ```javascript
   await page.waitForSelector('main');
   ```
4. Use `waitForLoadState`:
   ```javascript
   await page.waitForLoadState('networkidle');
   ```

### Performance Issues

#### Lighthouse Failures

**Problem**: Performance score below threshold
```
Lighthouse performance score: 65 (expected: > 80)
```

**Solutions**:
1. Optimize images:
   ```javascript
   // Use Next.js Image component
   import Image from 'next/image';
   ```
2. Implement code splitting:
   ```javascript
   const Component = dynamic(() => import('./Component'));
   ```
3. Add performance budget:
   ```javascript
   // In next.config.js
   experimental: {
     bundlePagesRouterDependencies: true,
   }
   ```

**Problem**: Lighthouse audit fails to start
```
Chrome launch failed: Browser closed unexpectedly
```

**Solutions**:
1. Add Lighthouse CI configuration:
   ```javascript
   // lighthouserc.js
   module.exports = {
     ci: {
       collect: {
         chromePath: '/usr/bin/google-chrome-stable',
       },
     },
   };
   ```
2. Install Chrome in CI environment
3. Use headless mode

#### Bundle Size Issues

**Problem**: Bundle size too large
```
Bundle size increased by 500KB
```

**Solutions**:
1. Analyze bundle:
   ```bash
   npm run build -- --analyze
   ```
2. Use dynamic imports for large dependencies
3. Remove unused dependencies:
   ```bash
   npm-check-unused
   ```
4. Optimize imports:
   ```javascript
   // Instead of
   import _ from 'lodash';
   // Use
   import { debounce } from 'lodash-es';
   ```

### Security Scan Failures

#### Dependency Vulnerabilities

**Problem**: High severity vulnerabilities found
```
found 5 high severity vulnerabilities
```

**Solutions**:
1. Update dependencies:
   ```bash
   npm audit fix
   ```
2. For unfixable vulnerabilities:
   ```bash
   npm audit fix --force
   ```
3. Add audit exemptions (last resort):
   ```bash
   npm audit --audit-level=critical
   ```

**Problem**: License compliance failures
```
GPL license found in dependencies
```

**Solutions**:
1. Check which package has GPL license:
   ```bash
   npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD'
   ```
2. Find alternative packages
3. Add license exceptions if approved:
   ```bash
   npx license-checker --excludePackages 'problematic-package'
   ```

#### Code Scanning Issues

**Problem**: CodeQL analysis fails
```
CodeQL analysis failed: out of memory
```

**Solutions**:
1. Exclude large files from analysis:
   ```yaml
   # .github/codeql/codeql-config.yml
   paths-ignore:
     - 'node_modules'
     - 'dist'
     - '.next'
   ```
2. Use specific language analysis
3. Increase runner memory if needed

**Problem**: Secret scanning false positives
```
Potential secret found: API key
```

**Solutions**:
1. Use proper secret patterns
2. Add comments to exclude false positives:
   ```javascript
   // This is not a real secret
   const fakeKey = 'sk_test_1234567890';
   ```
3. Configure secret scanning rules

## Environment-Specific Issues

### Development Environment

**Problem**: Hot reload not working
```
Module not found: Can't resolve 'component'
```

**Solutions**:
1. Check file paths and extensions
2. Restart development server
3. Clear Next.js cache:
   ```bash
   rm -rf .next
   ```

**Problem**: Environment variables not loaded
```
process.env.NEXT_PUBLIC_API_URL is undefined
```

**Solutions**:
1. Check `.env.local` file exists
2. Verify variable names have `NEXT_PUBLIC_` prefix for client-side
3. Restart development server after changes
4. Check .gitignore doesn't exclude .env files

### Staging Environment

**Problem**: API endpoints return 404
```
GET /api/services 404 Not Found
```

**Solutions**:
1. Check API route deployment
2. Verify Amplify function configuration
3. Check environment variables in Amplify console
4. Review CloudWatch logs

**Problem**: Database connection issues
```
Connection timeout to database
```

**Solutions**:
1. Check RDS/DynamoDB permissions
2. Verify VPC configuration
3. Check security group rules
4. Review database connection strings

### Production Environment

**Problem**: Stripe payments failing
```
Invalid API key provided
```

**Solutions**:
1. Verify live Stripe keys are set
2. Check Stripe account status
3. Review webhook configurations
4. Check payment flow logs

**Problem**: Performance degradation
```
Page load times increased significantly
```

**Solutions**:
1. Check CloudWatch metrics
2. Review database performance
3. Check CDN cache hit rates
4. Monitor Lambda function duration

## Debugging Strategies

### CI/CD Pipeline Debugging

1. **Enable Debug Logging**:
   ```yaml
   - name: Debug step
     run: echo "Debug info: ${{ toJson(github) }}"
   ```

2. **Use Tmate for Interactive Debugging**:
   ```yaml
   - name: Setup tmate session
     uses: mxschmitt/action-tmate@v3
   ```

3. **Save Artifacts for Analysis**:
   ```yaml
   - name: Upload logs
     uses: actions/upload-artifact@v4
     with:
       name: debug-logs
       path: |
         *.log
         npm-debug.log*
   ```

### Application Debugging

1. **Enable Verbose Logging**:
   ```javascript
   // In next.config.js
   module.exports = {
     logging: {
       fetches: {
         fullUrl: true,
       },
     },
   };
   ```

2. **Use Performance Profiling**:
   ```javascript
   console.time('operation');
   // Code to measure
   console.timeEnd('operation');
   ```

3. **Monitor Real User Metrics**:
   ```javascript
   // Add to _app.tsx
   export function reportWebVitals(metric) {
     console.log(metric);
   }
   ```

## Getting Help

### Internal Resources
1. Check team documentation
2. Review previous issues and PRs
3. Contact DevOps team
4. Use internal Slack channels

### External Resources
1. [GitHub Actions Documentation](https://docs.github.com/en/actions)
2. [AWS Amplify Troubleshooting](https://docs.amplify.aws/console/troubleshooting/)
3. [Next.js Troubleshooting](https://nextjs.org/docs/messages)
4. [Playwright Troubleshooting](https://playwright.dev/docs/troubleshooting)

### Emergency Contacts
- DevOps On-Call: [Contact info]
- Platform Team Lead: [Contact info]
- Security Team: [Contact info]

## Escalation Process

### Level 1: Self-Service
1. Check this troubleshooting guide
2. Review CI/CD logs
3. Check application monitoring
4. Try common solutions

### Level 2: Team Support
1. Post in team Slack channel
2. Create internal ticket
3. Tag relevant team members
4. Provide detailed error information

### Level 3: Platform/DevOps Team
1. Create urgent ticket
2. Contact on-call engineer
3. Provide full context and impact
4. Include steps to reproduce

### Level 4: Emergency Response
1. Call emergency hotline
2. Page on-call team
3. Create incident room
4. Document for post-mortem