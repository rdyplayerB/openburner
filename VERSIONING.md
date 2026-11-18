# Versioning Guidelines

OpenBurner follows [Semantic Versioning (SemVer)](https://semver.org/) for all releases.

## Version Format: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes that are not backward compatible
- **MINOR** (1.0.0 → 1.1.0): New features that are backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes that are backward compatible

## Pre-release Versions

- **Alpha** (1.0.0-alpha.1): Early development, unstable
- **Beta** (1.0.0-beta.1): Feature complete, testing phase
- **RC** (1.0.0-rc.1): Release candidate, stable but final testing

## Release Process

### 1. Development Workflow
- All new features go to `main` branch
- Use feature branches for development
- Never commit directly to `main` without review

### 2. Version Bumping
- **PATCH**: Bug fixes, documentation updates, minor improvements
- **MINOR**: New features, new components, enhanced functionality
- **MAJOR**: Breaking API changes, major architectural changes

### 3. Release Steps
1. Update version in `package.json`
2. Update `CHANGELOG.md` with new version section
3. Commit changes with message: `chore: bump version to X.Y.Z`
4. Create git tag: `git tag -a vX.Y.Z -m "Release version X.Y.Z"`
5. Push changes and tags: `git push && git push --tags`

### 4. Branch Strategy
- `main`: Stable, production-ready code
- `develop`: Integration branch for features (optional)
- `feature/*`: Individual feature development
- `hotfix/*`: Critical bug fixes for production

## Current Stable Version: v1.5.0

Design refresh (see `CHANGELOG.md`):
- Card PIN and tap in one signing sheet, with Activity, token details and readable dApp requests
- Works on any EVM network with your own RPC; every preset network has a tested backup RPC
- Redrawn logo, new dashboard, Send and Swap, and bottom sheets on phones
- Current versions of Next.js, React, Tailwind CSS and libhalo; needs Node.js 22.12 or later to run yourself

## Future Development

All future changes should be:
1. Developed in feature branches
2. Tested thoroughly
3. Documented in CHANGELOG.md
4. Versioned according to impact
5. Tagged and released following the process above

## Breaking Changes Policy

Breaking changes require:
1. Clear migration guide
2. Deprecation warnings in previous version
3. Major version bump
4. Detailed documentation of changes
5. Consideration for backward compatibility

## Examples

```bash
# Patch release (bug fix)
npm version patch
git push && git push --tags

# Minor release (new feature)
npm version minor
git push && git push --tags

# Major release (breaking change)
npm version major
git push && git push --tags
```
