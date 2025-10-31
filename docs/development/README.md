# O4O Platform 개발자 문서

> 💻 O4O 플랫폼 개발을 위한 기술 문서

---

## 🚀 시작하기

개발 환경 설정부터 시작하세요:

- **[개발 명령어](./getting-started/development-commands.md)** - 자주 사용하는 명령어 모음
- **[NPM 스크립트](./getting-started/npm-scripts.md)** - package.json 스크립트 가이드

---

## 🏗️ 아키텍처

시스템 설계 및 구조:

- **[API 서버 요구사항](./architecture/api-server-requirements.md)** - API 서버 스펙 및 설계
- **[페이지 관리](./architecture/page-management.md)** - 페이지 시스템 구현 가이드
- **[에디터 데이터 저장](./architecture/editor-data-storage.md)** - 블록 데이터 저장 구조
- **[WordPress 테마 분석](./architecture/wordpress-theme-analysis.md)** - WP 테마 시스템 조사

---

## 🧩 블록 시스템

블록 에디터 개발:

### 핵심 문서
- **[블록 개발 가이드](./blocks/blocks-development.md)** ⭐ - 블록 개발 시작하기
- **[블록 아키텍처](./blocks/block-architecture.md)** - 블록 플러그인 구조
- **[블록 구현 현황](./blocks/block-implementation-status.md)** - 구현된 블록 목록

### 최적화 및 마이그레이션
- **[블록 최적화](./blocks/block-optimization.md)** - 번들 최적화 전략
- **[블록 마이그레이션](./blocks/block-migration-roadmap.md)** - 마이그레이션 로드맵
- **[블록 감사 보고서](./blocks/block-audit-report.md)** - 시스템 감사 결과

### 특수 블록
- **[동적 블록 아키텍처](./blocks/dynamic-blocks-architecture.md)** - 동적 콘텐츠 블록
- **[폼 솔루션 분석](./blocks/form-solution-analysis.md)** - 폼 블록 설계
- **[템플릿 에디터 검증](./blocks/template-editor-verification.md)** - 템플릿 에디터 분석
- **[갤러리 블록 API](./blocks/gallery-block-api.md)** - 갤러리 블록 요구사항

---

## 🔐 인증 시스템

사용자 인증 및 세션 관리:

- **[인증 시스템 개요](./authentication/README.md)** ⭐ - 전체 인증 시스템 설명
- **[인증 통합](./authentication/authentication-integration.md)** - 인증 시스템 통합 가이드
- **[OAuth 통합](./authentication/oauth-integration.md)** - 소셜 로그인 구현
- **[리프레시 토큰](./authentication/refresh-token.md)** - 토큰 갱신 메커니즘
- **[세션 관리](./authentication/session-management.md)** - 세션 구현 및 관리
- **[로그인 보안](./authentication/login-security.md)** - 보안 강화 방안
- **[비밀번호 재설정](./authentication/password-reset.md)** - 비밀번호 재설정 플로우
- **[크로스 앱 세션 동기화](./authentication/cross-app-session-sync.md)** - 다중 앱 세션 관리

---

## 🔌 API 문서

API 설계 및 구현:

- **[API 문서](./api/api-documentation.md)** - API 엔드포인트 레퍼런스
- **[API 에러 분석](./api/api-error-analysis.md)** - 에러 처리 분석
- **[API 서버 수정](./api/api-server-fix.md)** - 서버 수정 가이드
- **[API 안전 가이드](./api/api-safety-guide.md)** - API 보안 Best Practices

---

## 📋 개발 가이드라인

코딩 규칙 및 프로세스:

- **[개발 가이드라인](./guidelines/development-guidelines.md)** - 코딩 스타일 및 규칙
- **[아키텍처 결정](./guidelines/architecture-decisions.md)** - ADR (Architecture Decision Records)
- **[개발 프로세스](./guidelines/development-process.md)** - 개발 워크플로우
- **[구현 과제](./guidelines/implementation-challenges.md)** - 기술적 도전 과제
- **[라우팅 가이드](./guidelines/routing-guide.md)** - React Router 가이드

---

## 💾 데이터베이스

DB 설계 및 최적화:

- **[JSONB 최적화](./database/jsonb-optimization.md)** - PostgreSQL JSONB 활용
- **[멱등성 제약](./database/idempotency-constraint.md)** - 중복 방지 전략

---

## 💳 결제 시스템

결제 게이트웨이 통합:

- **[결제 게이트웨이 설계](./payment/payment-gateway-design.md)** - 결제 시스템 아키텍처
- **[결제 설정](./payment/payment-setup.md)** - 결제 모듈 구성

---

## 🎯 특수 기능

고급 기능 구현:

- **[대화형 에디터](./specialized/conversational-editor.md)** - AI 대화형 에디터
- **[역할 기반 네비게이션](./specialized/role-based-navigation.md)** - 동적 메뉴 시스템
- **[역할 개인화](./specialized/role-personalization.md)** - UI 개인화 시스템

---

## 🔗 관련 문서

- **사용자 가이드**: [../guides/README.md](../guides/README.md)
- **배포 문서**: [../deployment/README.md](../deployment/README.md)
- **문제 해결**: [../troubleshooting/README.md](../troubleshooting/README.md)
- **테스트**: [../testing/README.md](../testing/README.md)

---

**마지막 업데이트**: 2025-10-31
