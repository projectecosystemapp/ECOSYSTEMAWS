# Contributing to ECOSYSTEM AWS Marketplace

Thank you for your interest in contributing to our service marketplace platform! Whether it's a bug report, new feature, correction, or additional documentation, we greatly value feedback and contributions from our community.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs/Feature Requests](#reporting-bugsfeature-requests)
- [Contributing via Pull Requests](#contributing-via-pull-requests)
- [Commit Guidelines](#commit-guidelines)
- [Testing Guidelines](#testing-guidelines)

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- AWS CLI configured (for deployment)
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/projectecosystemapp/ECOSYSTEMAWS.git
cd ECOSYSTEMAWS

# Install dependencies
npm install

# Run development server
npm run dev
```

## Development Process

### Branch Naming Convention

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/[feature-name]` - New features
- `bugfix/[bug-description]` - Bug fixes
- `hotfix/[issue]` - Urgent production fixes

### Workflow

1. Create a new branch from `develop`
2. Make your changes following our coding standards
3. Write/update tests as needed
4. Ensure all tests pass and linting succeeds
5. Submit a pull request to `develop`

## Coding Standards

### TypeScript/React Best Practices

- Use functional components with TypeScript interfaces
- Implement proper error handling with try/catch blocks
- Use meaningful variable and function names
- Prefer const over let, avoid var
- Use async/await over promise chains
- Destructure objects when possible
- Document complex logic with comments

### File Organization

```
app/              # Next.js App Router pages
amplify/          # AWS Amplify backend configuration
components/       # Reusable React components
hooks/           # Custom React hooks
utils/           # Utility functions
types/           # TypeScript type definitions
```

## Reporting Bugs/Feature Requests

We welcome you to use the GitHub issue tracker to report bugs or suggest features. Please use our issue templates and include:

- A reproducible test case or series of steps
- The version of our code being used
- Browser and OS information
- Console errors if applicable
- Screenshots for UI issues

## Contributing via Pull Requests

Before sending us a pull request, please ensure that:

1. You are working against the latest source on the `develop` branch
2. You check existing open and recently merged pull requests
3. You open an issue to discuss any significant work

To send us a pull request:

1. Fork the repository
2. Create a feature branch from `develop`
3. Make your changes with clear, focused commits
4. Ensure local tests pass (`npm test`)
5. Run linting (`npm run lint`)
6. Build the project (`npm run build`)
7. Submit a pull request using our PR template
8. Address any CI failures or review feedback

GitHub provides additional documentation on [forking a repository](https://help.github.com/articles/fork-a-repo/) and
[creating a pull request](https://help.github.com/articles/creating-a-pull-request/).

## Commit Guidelines

### Format

```
<type>(<scope>): <subject>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Example

```
feat(auth): add social login support
fix(booking): resolve timezone issue
```

## Testing Guidelines

- Write unit tests for new features
- Ensure existing tests pass
- Aim for good test coverage
- Test edge cases and error handling

## Finding contributions to work on

Looking at the existing issues is a great way to find something to contribute on. As our projects, by default, use the default GitHub issue labels (enhancement/bug/duplicate/help wanted/invalid/question/wontfix), looking at any 'help wanted' issues is a great place to start.

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](https://aws.github.io/code-of-conduct).
For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq) or contact
opensource-codeofconduct@amazon.com with any additional questions or comments.

## Security issue notifications

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public github issue.

## Licensing

See the [LICENSE](LICENSE) file for our project's licensing. We will ask you to confirm the licensing of your contribution.
