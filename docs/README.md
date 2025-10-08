# O4O Platform Documentation

> Comprehensive documentation for the O4O (Optimize for Online) e-commerce platform

## 📚 Documentation Structure

### 🏗️ [Architecture](./architecture/)
System design, components, and technical architecture documentation.

- **Core Architecture**
  - [API Server Requirements](./architecture/API_SERVER_REQUIREMENTS.md)
  - [Page Management Implementation](./architecture/PAGE_MANAGEMENT_IMPLEMENTATION_GUIDE.md)
  - [Shortcode Reference](./architecture/SHORTCODE_REFERENCE.md)
  - [Shortcode Usage Guide](./architecture/SHORTCODE_USAGE_GUIDE.md)

- **Block System**
  - [Block Plugin Architecture](./architecture/BLOCK_PLUGIN_ARCHITECTURE.md)
  - [Block Implementation Guide](./architecture/BLOCK_PLUGIN_IMPLEMENTATION_GUIDE.md)
  - [Block System Audit Report](./architecture/BLOCK_SYSTEM_AUDIT_REPORT.md)
  - [Editor Data Storage Analysis](./architecture/EDITOR_DATA_STORAGE_ANALYSIS.md)
  - [Zone System Investigation](./architecture/ZONE_SYSTEM_INVESTIGATION_REPORT.md)

### 💻 [Development](./development/)
Development guidelines, setup instructions, and coding standards.

- [Development Guidelines](./development/DEVELOPMENT_GUIDELINES.md)
- [Local Development Commands](./development/LOCAL_DEV_COMMANDS.md)
- [Local Setup Guide](./development/LOCAL_SETUP_GUIDE.md)
- [TypeScript Guidelines](./development/TYPESCRIPT_GUIDELINES.md)
- [NPM Scripts Guide](./development/NPM_SCRIPTS_GUIDE.md)
- [Code Quality Analysis](./development/CODE_QUALITY_ANALYSIS.md)

### 🚀 [Deployment](./deployment/)
Production deployment, CI/CD, and infrastructure documentation.

- **Main Guide**
  - [📖 Deployment Master Guide](./deployment/README.md) ⭐ **Start Here**
  - [Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md)

- **CI/CD & Automation**
  - [GitHub Actions Setup](./deployment/GITHUB_ACTIONS_SETUP.md)
  - [Auto Deploy Setup](./deployment/SETUP_AUTO_DEPLOY.md)

- **Infrastructure**
  - [Server Setup Guide](./deployment/SERVER_SETUP_GUIDE.md)
  - [Database Setup](./deployment/DATABASE_SETUP_GUIDE.md)
  - [Database Password Handling](./deployment/database-password-handling.md)
  - [Nginx Configuration](./deployment/nginx-setup.md)
  - [DNS Configuration](./deployment/DNS_CONFIGURATION_GUIDE.md)
  - [SSH Infrastructure](./deployment/SSH_INFRASTRUCTURE.md)
  - [SSH Key Setup](./deployment/SSH_KEY_SETUP_GUIDE.md)
  - [Environment Setup](./deployment/ENV_SETUP.md)

- **Legacy (Reference Only)**
  - [Legacy deployment docs](./deployment/legacy/)

### 📱 [Applications](./apps/)
App-specific documentation for each platform component.

- [Admin Dashboard Guide](./apps/ADMIN_MENU_GUIDE.md)
- [Admin Dashboard Routing](./apps/ROUTING_GUIDE.md)
- [API Safety Guide](./apps/API_SAFETY_GUIDE.md)
- [User Manual (Korean)](./apps/USER_MANUAL_KO.md)
- [Screen Options Guide](./apps/SCREEN_OPTIONS_GUIDE.md)
- [Gallery Block API Requirements](./apps/GALLERY_BLOCK_API_REQUIREMENTS.md)

### 🔧 [Operations](./operations/)
Operational guides for running and maintaining the platform.

- [Claude Webserver Guide](./operations/CLAUDE_WEBSERVER.md)
- [Server Access Guide](./operations/SERVER_ACCESS.md)
- [Product Import Guide](./operations/PRODUCT_IMPORT_GUIDE.md)
- [Webserver No-Build Guide](./operations/WEBSERVER_NO_BUILD_GUIDE.md)

### 🛠️ [Setup](./setup/)
Environment configuration and initial setup documentation.

- [API Server Setup Guide](./setup/API_SERVER_SETUP_GUIDE.md)
- [API Server Environment](./setup/API_SERVER_ENV_REQUIREMENTS.md)
- [Webserver Environment](./setup/WEBSERVER_ENV_REQUIREMENTS.md)
- [GitHub Secrets Setup](./setup/SETUP_GITHUB_SECRETS.md)
- [PM2 Autostart Setup](./setup/PM2_AUTOSTART_SETUP-webserver.md)
- [Environment Variables Design](./setup/ENV_VARIABLES_DESIGN.md)

### 🔍 [Troubleshooting](./troubleshooting/)
Common issues, solutions, and recovery procedures.

- [Main Troubleshooting Guide](./troubleshooting/README.md)
- [502 Bad Gateway Solutions](./troubleshooting/502-BAD-GATEWAY-SOLUTIONS.md)
- [React 19 Fix Summary](./troubleshooting/REACT19_FIX_SUMMARY.md)
- [Admin Dashboard React 19 Fix](./troubleshooting/ADMIN_DASHBOARD_REACT19_FIX.md)
- [Server PM2 Fix Guide](./troubleshooting/SERVER_PM2_FIX_GUIDE.md)
- [Server Git Merge Guide](./troubleshooting/SERVER_GIT_MERGE_GUIDE.md)
- [Disaster Recovery Runbook](./troubleshooting/DISASTER_RECOVERY_RUNBOOK.md)
- [Recovery Procedures](./troubleshooting/RECOVERY_PROCEDURES.md)
- [Backup Recovery](./troubleshooting/BACKUP_RECOVERY.md)

### 🧪 [Testing](./testing/)
Testing guidelines and test documentation.

- [Test Guide](./testing/TEST_GUIDE.md)
- [Dropshipping Test Checklist](./testing/DROPSHIPPING_TEST_CHECKLIST.md)

### 🔒 [Security](./security/)
Security guidelines and audit reports.

- [Security Audit Report](./security/SECURITY_AUDIT_REPORT.md)

### 🔐 [Authentication](./authentication/)
Authentication system documentation and implementation guides.

- [📖 Authentication System Overview](./authentication/README.md) ⭐ **Start Here**
- [Authentication Integration](./authentication/authentication-integration.md)
- [OAuth Integration Guide](./authentication/oauth-integration-guide.md)
- [Refresh Token Implementation](./authentication/refresh-token-implementation.md)
- [Session Management](./authentication/session-management-implementation.md)
- [Login Security](./authentication/login-security-implementation.md)
- [Password Reset](./authentication/password-reset-implementation.md)
- [Cross-App Session Sync](./authentication/cross-app-session-sync.md)

### 📚 [Guides](./guide/)
Additional platform guides and tutorials.

- [Add New Shortcode Guide](./guide/ADD_NEW_SHORTCODE.md)

### 📂 [API Analysis](./api-analysis/)
API-related analysis and fixes.

- [API Error Analysis Report](./api-analysis/API_ERROR_ANALYSIS_REPORT.md)
- [API Server Fix Instructions](./api-analysis/API_SERVER_FIX_INSTRUCTIONS.md)

### 📊 [Project Status](./status/)
Development progress tracking and status reports.

- [API Server Status](./status/API_SERVER_STATUS.md)
- [Admin Dashboard TypeScript Migration](./status/admin-dashboard-ts-status.md)

### 📖 [User Manual](./manual/)
사용자 가이드 (한국어)

- [관리자 매뉴얼](./manual/admin-manual.md)
- [숏코드 레퍼런스](./manual/shortcode-reference.md)

### 📦 [Archive](./archive/)
Historical documentation and investigation reports.

- [Post Editor Investigation](./archive/POST_EDITOR_INVESTIGATION_REPORT.md)
- [React Router Navigation Investigation](./archive/REACT_ROUTER_NAVIGATION_INVESTIGATION.md)
- [Deploy Now (Legacy)](./archive/DEPLOY_NOW.md)

## 🚀 Quick Links

- **Getting Started**: [Quick Start Guide](./QUICK_START.md)
- **Local Development**: [Local Setup Guide](./development/LOCAL_SETUP_GUIDE.md)
- **Deploy to Production**: [Deployment Master Guide](./deployment/README.md) ⭐
- **Authentication**: [Authentication System Overview](./authentication/README.md) ⭐
- **Troubleshooting**: [Troubleshooting README](./troubleshooting/README.md)

## 📖 Document Status

| Category | Status | Last Updated |
|----------|--------|--------------|
| Architecture | ✅ Complete | 2025-01-30 |
| Development | ✅ Complete | 2025-01-30 |
| Deployment | ✅ Complete | 2025-10-08 |
| Authentication | ✅ Complete | 2025-10-08 |
| Operations | ✅ Complete | 2025-01-30 |
| Testing | 🔄 In Progress | 2025-01-30 |
| Security | 📝 Needs Update | 2024-08-05 |
| Troubleshooting | ✅ Complete | 2025-01-30 |
| User Manual | ✅ Complete | 2025-10-05 |

## 🔄 Documentation Maintenance

### Adding New Documentation
1. Place documents in the appropriate category folder
2. Update this README with the new document link
3. Follow the naming convention: `TOPIC_NAME.md` or `topic-name.md`
4. Use clear section headers with emoji indicators

### Document Templates
- Use clear headings with emoji indicators
- Include a table of contents for long documents
- Add code examples where applicable
- Include troubleshooting sections
- Add "Last Updated" timestamp

### Documentation Standards
- **Language**: Technical docs in English, user guides can be in Korean
- **Format**: Markdown with GitHub Flavored Markdown extensions
- **Code Blocks**: Include language hints for syntax highlighting
- **Links**: Use relative links for internal docs, absolute for external

## 📞 Support

For questions or issues with the documentation:
- Check the [Troubleshooting Guide](./troubleshooting/README.md)
- Review the [FAQ](./guides/QUICK_START.md#faq)
- Open an issue on GitHub
- Contact the development team

## 🗂️ Project Structure Overview

```
docs/
├── architecture/       # System design and architecture
├── development/       # Development guides and standards
├── deployment/        # Deployment and CI/CD (⭐ README.md)
├── authentication/    # Authentication system (⭐ README.md)
├── apps/             # App-specific documentation
├── operations/       # Operational guides
├── setup/           # Environment setup
├── troubleshooting/  # Problem solving guides
├── testing/         # Test documentation
├── security/        # Security guidelines
├── guide/           # Additional guides
├── manual/          # User manual (Korean)
├── api-analysis/    # API analysis and fixes
├── status/          # Project status tracking (NEW)
└── archive/         # Historical documentation
```

---

*Last Updated: 2025-10-08*
*Version: 2.1.0 - Cleaned and Reorganized*