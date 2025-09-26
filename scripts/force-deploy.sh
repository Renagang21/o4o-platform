#!/bin/bash

# Force deployment script for o4o-platform
# This script helps trigger manual deployments when automatic deployments aren't working

echo "🚀 O4O Platform Force Deployment Script"
echo "======================================="
echo ""

# Check if gh CLI is authenticated
if ! gh auth status &>/dev/null; then
    echo "❌ GitHub CLI is not authenticated."
    echo "Please run: gh auth login"
    exit 1
fi

# Menu for selecting what to deploy
echo "Select what to deploy:"
echo "1) API Server"
echo "2) Admin Dashboard"
echo "3) Main Site"
echo "4) All services"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🔄 Triggering API Server deployment..."
        gh workflow run deploy-api.yml --ref main -f force_deploy=true
        echo "✅ API Server deployment triggered"
        ;;
    2)
        echo "🔄 Triggering Admin Dashboard deployment..."
        gh workflow run deploy-admin.yml --ref main -f force_deploy=true
        echo "✅ Admin Dashboard deployment triggered"
        ;;
    3)
        echo "🔄 Triggering Main Site deployment..."
        gh workflow run deploy-main-site.yml --ref main -f force_deploy=true
        echo "✅ Main Site deployment triggered"
        ;;
    4)
        echo "🔄 Triggering all deployments..."
        gh workflow run deploy-api.yml --ref main -f force_deploy=true
        gh workflow run deploy-admin.yml --ref main -f force_deploy=true
        gh workflow run deploy-main-site.yml --ref main -f force_deploy=true
        echo "✅ All deployments triggered"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📊 Check deployment status at:"
echo "https://github.com/Renagang21/o4o-platform/actions"
echo ""
echo "Note: Deployments typically take 5-10 minutes to complete."