#!/bin/bash

# Update all frontend deployment workflows with improved SSH handling

set -e

echo "🔄 Updating deployment workflows with improved SSH handling..."

WORKFLOWS=(
  "deploy-admin-dashboard.yml"
  "deploy-ecommerce.yml"
  "deploy-crowdfunding.yml"
  "deploy-forum.yml"
  "deploy-signage.yml"
)

for WORKFLOW in "${WORKFLOWS[@]}"; do
  WORKFLOW_PATH=".github/workflows/$WORKFLOW"
  
  if [ -f "$WORKFLOW_PATH" ]; then
    echo "📝 Processing $WORKFLOW..."
    
    # Create backup
    cp "$WORKFLOW_PATH" "$WORKFLOW_PATH.backup"
    
    # Extract app name from workflow
    APP_NAME=$(echo $WORKFLOW | sed 's/deploy-//' | sed 's/.yml//')
    
    # Update the rsync command with better error handling
    sed -i 's/rsync -avz --delete --no-owner --no-group --no-perms \\/rsync -avz --delete --timeout=30 --contimeout=10 --no-owner --no-group --no-perms \\/' "$WORKFLOW_PATH"
    
    # Add retry logic around rsync if not present
    if ! grep -q "MAX_ATTEMPTS=3" "$WORKFLOW_PATH"; then
      echo "Adding retry logic to $WORKFLOW..."
      # This would require more complex sed/awk operations
      # For now, just note it needs manual update
      echo "⚠️  $WORKFLOW needs manual update for retry logic"
    fi
    
    echo "✅ Updated $WORKFLOW"
  else
    echo "⚠️  $WORKFLOW not found"
  fi
done

echo "
📋 Summary:
- Added timeout options to rsync commands
- Created backups of all workflows
- Some workflows may need manual updates for full retry logic

Next steps:
1. Review the changes
2. Test with debug-ssh.yml workflow
3. Update GitHub secrets if needed:
   - WEB_HOST
   - WEB_USER  
   - WEB_SSH_KEY
   - WEB_HOST_IP (optional)
   - WEB_SSH_PORT (optional, if not 22)
"