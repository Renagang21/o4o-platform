# GitHub Token Authentication Issues

## Error Description
This document outlines common issues related to GitHub token authentication failures that can occur during API integration or CI/CD processes.

## Symptoms
- Failed GitHub API requests with 401 Unauthorized responses
- CI/CD pipeline failures during repository operations
- Error messages containing "Bad credentials" or "Token expired"
- Intermittent authentication failures that occur at specific times

## Common Causes
1. **Expired Token**: GitHub personal access tokens have expired
2. **Token Revocation**: Token was manually revoked in GitHub settings
3. **Insufficient Permissions**: Token lacks required scopes for the operation
4. **Rate Limiting**: Exceeded GitHub API rate limits
5. **IP Restrictions**: Access attempts from unauthorized IP addresses
6. **Organization Restrictions**: Token doesn't have access to specific organization resources

## Diagnostic Steps
1. Check the token expiration date in GitHub settings
2. Verify the token has the correct scopes:
   ```
   # Required scopes for common operations
   repo            # Full control of private repositories
   read:org        # Read org and team membership
   workflow        # Access to GitHub Actions
   ```
3. Review GitHub API response headers for rate limiting information:
   ```
   X-RateLimit-Limit: 5000
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1620919932
   ```
4. Check if the repository or organization has IP allow lists configured
5. Look for recent security alerts or notifications from GitHub

## Resolution
1. **Generate a New Token**:
   - Navigate to GitHub Settings > Developer Settings > Personal Access Tokens
   - Generate a new token with appropriate scopes
   - Update the token in all necessary configurations

2. **Update CI/CD Secrets**:
   ```yaml
   # GitHub Actions example
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
           with:
             token: ${{ secrets.NEW_GITHUB_TOKEN }}
   ```

3. **Implement Token Rotation**:
   - Set up automated token rotation using GitHub Apps
   - Use installation tokens that refresh automatically

4. **Handle Rate Limiting**:
   ```javascript
   // Implement exponential backoff
   async function fetchWithRetry(url, options, retries = 3) {
     try {
       const response = await fetch(url, options);
       if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
         const resetTime = response.headers.get('X-RateLimit-Reset') * 1000;
         const waitTime = resetTime - Date.now();
         await new Promise(resolve => setTimeout(resolve, waitTime));
         return fetchWithRetry(url, options);
       }
       return response;
     } catch (error) {
       if (retries > 0) {
         await new Promise(resolve => setTimeout(resolve, 2000));
         return fetchWithRetry(url, options, retries - 1);
       }
       throw error;
     }
   }
   ```

## Prevention
1. Set up token expiration notifications
2. Use GitHub Apps instead of personal access tokens where possible
3. Implement proper error handling and logging for authentication issues
4. Store tokens securely using environment variables or secret management systems
5. Document required token scopes in project README

## Related Documentation
- [GitHub Authentication Documentation](https://docs.github.com/en/authentication)
- [Personal Access Token Guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting) 