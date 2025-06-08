# Claude Desktop MCP Configuration

This directory contains configuration templates for Claude Desktop MCP (Model Context Protocol) servers.

## Files

- `claude-config-template.json` - Template configuration with placeholder values
- `.gitignore` - Excludes sensitive configuration files from version control

## Setup Instructions

1. Copy `claude-config-template.json` to create your local configuration
2. Replace placeholder values:
   - `PATH_TO_YOUR_CODING_DIRECTORY` - Your actual coding directory path
   - `YOUR_GITHUB_TOKEN_HERE` - Your GitHub personal access token
   - `YOUR_SERVER_IP` - Your database server IP address
   - Update database credentials as needed

3. **Important**: Never commit files with real tokens or credentials to git

## Available MCP Servers

- **filesystem**: File system access
- **playwright**: Browser automation
- **everything**: Various utilities  
- **postgres**: PostgreSQL database access
- **github**: GitHub API integration
- **memory**: Knowledge graph and memory
- **sequential-thinking**: Advanced reasoning
- **puppeteer**: Browser control
- **desktop-commander**: System command execution
- **task-manager**: Development task management
- **windows-cli**: Windows CLI tools

## Security Notes

- Configuration files with real credentials are automatically ignored by git
- Always use environment variables or secure credential management in production
- Regular audit of access tokens and rotate them periodically
