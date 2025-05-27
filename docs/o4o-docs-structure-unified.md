# 🗂️ O4O 서비스 문서 구조 개편안

O4O 플랫폼의 문서 구조를 `services/` 중심으로 통합적으로 정리하고, 주요 서비스별로 동일한 폴더 체계를 갖도록 개편하였습니다.

---

## 1. 📁 main-site (yaksa.site)

O4O 플랫폼의 메인 포털 역할을 하는 yaksa.site에 대한 문서 구조입니다.

```
docs/services/main-site/
├── overview/
│   ├── yaksa-site-dev-scope.md
│   ├── yaksa-site-infra-overview.md
│   ├── yaksa-site-portal-overview.md
│   ├── yaksa-site-structure.md
├── deployment/
│   ├── deployment-guide.md
│   ├── o4o-web-server-handoff.md
│   ├── yaksa-deploy-handoff.md
│   ├── yaksa-deploy-task-01-react-build-serve.md
│   └── yaksa-deploy-task-02-permanent-serve.md
├── auth/
│   ├── yaksa-portal-task-02-auth-ui.md
│   ├── yaksa-site-auth-structure.md
├── wireframes/
│   ├── 01-home-responsive-wireframe.md
│   ├── 02-auth-ui-wireframe.md
│   ├── 03-mobile-entry-flow.md
│   ├── 04-funding-ui-wireframe.md
│   ├── 05-b2b-forum-ui-wireframe.md
│   ├── 06-signage-ui-wireframe.md
│   ├── 07-common-ui-and-menu-structure.md
│   ├── 08-role-permissions.md
│   ├── 09-ui-theme-system.md
├── devdocs/
│   ├── 00-folder-structure.md
│   ├── 01-project-overview.md
│   ├── 02-folder-naming-guidelines.md
│   ├── 03-dev-flow-guide.md
│   ├── 04-cursor-integration.md
│   ├── 05-taskmanager-connection.md
│   ├── 06-service-map.md
│   ├── o4o-platform-analysis.md
│   ├── o4o-platform-foundation-pack.md
│   ├── o4o-platform-full.md
│   ├── toc.md
│   ├── task-cursor-setup.md
│   ├── yaksa-cursor-task-devops.md
│   ├── yaksa-cursor-task.md
```

---

## 2. 📁 ecommerce (전자상거래 서비스)

Yaksa 플랫폼의 전자상거래 기능을 담당하는 서비스입니다.

```
docs/services/ecommerce/
├── overview/
│   └── 01-service-overview.md
├── deployment/
│   ├── 10-deployment-checklist.md
│   └── o4o-web-server-handoff.md
├── auth/
│   ├── 07-authentication-flow.md
│   ├── task-06-auth-login-register.md
│   ├── task-11-auth-api-integration.md
│   ├── task-13-change-password.md
│   └── task-14-forgot-password.md
├── wireframes/
│   └── (해당 없음 또는 추후 추가)
├── devdocs/
│   ├── task-10-medusa-api-integration.md
│   ├── 06-api-task-guide.md
│   ├── 07-troubleshooting-log.md
│   ├── 08-medusa-cli-reference.md
│   └── 09-mcp-and-context-config.md
├── tests/
│   ├── test-01-initial-test-environment.md
│   └── test-02-user-flow-checklist.md
├── ui-tasks/
│   ├── 00-init-web-folders.md
│   ├── 01-shop-product-list.md
│   ├── 02-product-detail-page.md
│   ├── 03-cart-page.md
│   ├── 04-checkout-page.md
│   ├── 05-order-history-page.md
│   ├── 06-order-confirmation-page.md
│   ├── 08-user-profile-page.md
│   ├── 09-address-management-page.md
│   ├── 10-admin-panel-outline.md
│   ├── 11-admin-login-auth.md
│   ├── 12-admin-feature-pages.md
│   ├── 13-admin-logs-and-stats.md
│   ├── 14-admin-notification-system.md
│   ├── 15-admin-realtime-dashboard.md
│   ├── 16-admin-settings-page.md
│   ├── 17-admin-role-permission.md
│   ├── 18-admin-audit-log.md
│   ├── 19-admin-notification-history.md
│   ├── 20-admin-global-search.md
│   ├── 21-admin-multi-session.md
│   └── 22-admin-activity-report.md
```

---

## 3. 📁 o4o-api-server (백엔드 서버)

Medusa 기반의 백엔드 서버로, 인증, 관리자 계정, 환경 변수 설정 등 주요 서버 설정과 API 관리 문서입니다.

```
docs/o4o-api-server/
├── 01-project-overview.md
├── 02-server-setup.md
├── 03-admin-user-setup.md
├── 04-auth-module-config.md
├── 05-env-and-config-reference.md
├── 06-api-task-guide.md
├── 07-troubleshooting-log.md
├── 08-medusa-cli-reference.md
├── 09-mcp-and-context-config.md
├── 10-deployment-checklist.md
├── zz-misc-notes.md
└── ui-tasks/
    └── (UI 관련 작업 문서들)
```

각 문서의 주요 내용:

- `01-project-overview.md`: 프로젝트 전체 구조와 아키텍처 개요
- `02-server-setup.md`: 서버 초기 설정 및 구성 가이드
- `03-admin-user-setup.md`: 관리자 계정 설정 및 권한 관리
- `04-auth-module-config.md`: 인증 모듈 설정 및 구성
- `05-env-and-config-reference.md`: 환경 변수 및 설정 파일 레퍼런스
- `06-api-task-guide.md`: API 개발 작업 가이드
- `07-troubleshooting-log.md`: 문제 해결 및 디버깅 가이드
- `08-medusa-cli-reference.md`: Medusa CLI 도구 사용법
- `09-mcp-and-context-config.md`: MCP 및 컨텍스트 설정
- `10-deployment-checklist.md`: 배포 전 체크리스트
- `zz-misc-notes.md`: 기타 참고 사항
