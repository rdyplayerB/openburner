#!/bin/bash

# OpenBurner Release Script
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Working directory is not clean. Please commit or stash your changes first.${NC}"
    exit 1
fi

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo -e "${YELLOW}Warning: You're not on the main branch (currently on: $current_branch)${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get version type
VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}Error: Invalid version type. Use: patch, minor, or major${NC}"
    echo "Usage: $0 [patch|minor|major]"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Current version: $CURRENT_VERSION${NC}"

# Calculate new version
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version | sed 's/v//')
echo -e "${GREEN}New version: $NEW_VERSION${NC}"

# Update changelog
echo -e "${YELLOW}Updating CHANGELOG.md...${NC}"
# This is a placeholder - you might want to use a tool like standard-version or conventional-changelog
# For now, we'll just add a placeholder entry
sed -i.bak "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $(date +%Y-%m-%d) - Release\n\n### Added\n- Release $NEW_VERSION\n\n### Changed\n- Version bump to $NEW_VERSION\n\n### Fixed\n- Version $NEW_VERSION release\n\n## [$CURRENT_VERSION]/" CHANGELOG.md
rm CHANGELOG.md.bak

# Commit changes
echo -e "${YELLOW}Committing version bump...${NC}"
git add package.json CHANGELOG.md
git commit -m "chore: bump version to $NEW_VERSION"

# Create tag
echo -e "${YELLOW}Creating git tag...${NC}"
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"

# Push changes
echo -e "${YELLOW}Pushing changes and tags...${NC}"
git push origin main
git push origin "v$NEW_VERSION"

echo -e "${GREEN}✅ Successfully released version $NEW_VERSION!${NC}"
echo -e "${GREEN}📦 Tag: v$NEW_VERSION${NC}"
echo -e "${GREEN}🚀 Pushed to origin/main${NC}"

# Optional: Create GitHub release
if command -v gh &> /dev/null; then
    echo -e "${YELLOW}Creating GitHub release...${NC}"
    gh release create "v$NEW_VERSION" --title "Release $NEW_VERSION" --notes "Release version $NEW_VERSION"
    echo -e "${GREEN}✅ GitHub release created!${NC}"
else
    echo -e "${YELLOW}GitHub CLI not found. You can manually create a release at:${NC}"
    echo -e "${YELLOW}https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git/\1/')/releases/new${NC}"
fi
