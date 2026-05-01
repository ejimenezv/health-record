# Branch Protection Rules

## Main Branch
- Require pull request reviews (1 approver)
- Require status checks to pass:
  - Frontend Tests
  - Backend Tests
  - AI Service Tests
  - RAGAS Quality Check
  - Security Scanning
- Require branches to be up to date
- Require signed commits (recommended)
- Include administrators

## Develop Branch
- Require pull request reviews (1 approver)
- Require status checks to pass:
  - Frontend Tests
  - Backend Tests
  - AI Service Tests
- Allow force pushes for hotfixes (with caution)

## Setup

1. Go to Settings -> Branches -> Branch protection rules
2. Add rule for `main` branch
3. Configure settings as above
4. Add rule for `develop` branch
5. Test with a sample PR
