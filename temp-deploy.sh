#!/bin/bash

# Temporary deployment script
cd /home/dev/o4o-platform

echo "=== Git Status ==="
git status

echo ""
echo "=== Creating empty commit ==="
git commit --allow-empty -m "chore: trigger CI/CD deployment

Empty commit to trigger GitHub Actions workflows

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "=== Pushing to main ==="
git push origin main

echo ""
echo "=== Latest commit ==="
git log -1 --oneline

echo ""
echo "=== Done ==="
