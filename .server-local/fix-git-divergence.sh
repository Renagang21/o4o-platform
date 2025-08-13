#!/bin/bash

# Git Divergence Fix Script for Server
# This script safely resolves divergent branches

echo "==================================="
echo "Git Divergence Fix Script"
echo "==================================="

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Backup current changes if any
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Uncommitted changes detected. Stashing them..."
    git stash push -m "Auto-stash before divergence fix $(date +%Y%m%d_%H%M%S)"
    STASHED=true
else
    STASHED=false
fi

echo ""
echo "Fetching latest changes from origin..."
git fetch origin

echo ""
echo "Choose how to resolve the divergence:"
echo "1) Keep server changes and merge remote (recommended if server has important local changes)"
echo "2) Discard server changes and use remote version (recommended if server should match GitHub exactly)"
echo "3) Rebase server changes on top of remote"
echo ""
read -p "Enter your choice (1-3) [default: 2]: " choice

case ${choice:-2} in
    1)
        echo "Merging remote changes into local branch..."
        git pull --no-rebase origin $CURRENT_BRANCH
        ;;
    2)
        echo "Resetting to match remote branch exactly..."
        git reset --hard origin/$CURRENT_BRANCH
        ;;
    3)
        echo "Rebasing local changes on top of remote..."
        git pull --rebase origin $CURRENT_BRANCH
        ;;
    *)
        echo "Invalid choice. Using option 2 (reset to remote)..."
        git reset --hard origin/$CURRENT_BRANCH
        ;;
esac

# Check if operation was successful
if [ $? -eq 0 ]; then
    echo "✅ Git divergence resolved successfully!"
    
    # Restore stashed changes if any
    if [ "$STASHED" = true ]; then
        echo ""
        read -p "Do you want to restore your stashed changes? (y/n) [default: n]: " restore
        if [[ "$restore" == "y" ]]; then
            git stash pop
            echo "✅ Stashed changes restored"
        else
            echo "Stashed changes kept. You can restore them later with: git stash pop"
        fi
    fi
else
    echo "❌ Failed to resolve divergence. Please check the error messages above."
    exit 1
fi

echo ""
echo "==================================="
echo "Current status:"
git status --short
echo "==================================="
echo "Done! Your repository is now synchronized."