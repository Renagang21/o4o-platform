# GitHub Actions Setup Guide

## Repository Settings for GitHub Actions

To ensure GitHub Actions work properly, the repository owner needs to update the following settings:

### 1. Workflow Permissions

Navigate to: `https://github.com/[owner]/o4o-platform/settings/actions`

Under **Workflow permissions**, select:
- ✅ **Read and write permissions**
- ✅ **Allow GitHub Actions to create and approve pull requests**

### 2. Organization Settings (if applicable)

If this repository is part of an organization:

Navigate to: `https://github.com/organizations/[org-name]/settings/actions`

Under **Workflow permissions**, set default to:
- ✅ **Read and write permissions**

### 3. Protected Branch Settings

If the main branch is protected, ensure:
- GitHub Actions can bypass branch protection rules
- Or add exceptions for the automation

## Troubleshooting Permission Errors

### Error: "Resource not accessible by integration"

This error occurs when the GITHUB_TOKEN lacks necessary permissions. Solutions:

1. **Add explicit permissions to workflow**:
   ```yaml
   permissions:
     contents: read
     pull-requests: write
     issues: write
   ```

2. **For debugging, temporarily use**:
   ```yaml
   permissions: write-all
   ```

### Error: "You do not have permission to create labels"

The labeler action tries to create non-existent labels. Solutions:

1. Run the `setup-labels.yml` workflow to pre-create all labels
2. Or manually create the labels defined in `.github/labeler.yml`

### Common Permission Requirements

| Action | Required Permissions |
|--------|---------------------|
| Create PR comments | `issues: write` |
| Apply labels | `pull-requests: write` |
| Create labels | `issues: write` |
| Push to repository | `contents: write` |
| Create releases | `contents: write` |

## Verification

After applying fixes, test by:

1. Creating a new pull request
2. Checking if labels are applied automatically
3. Verifying PR comments are created
4. Ensuring no 403 errors in Actions tab