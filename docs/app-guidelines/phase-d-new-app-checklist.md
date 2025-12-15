# Phase D: 신규 App 개발 체크리스트

> O4O Platform에서 신규 App 개발 시 Claude Code가 반드시 확인해야 하는 항목

---

## 1. 개발 시작 전 필수 확인

### 1.1 Work Order 검증

- [ ] Work Order에 표준 헤더가 포함되어 있는가? (`docs/app-guidelines/work-order-standard-header.md`)
- [ ] Target Service가 명시되어 있는가?
- [ ] App Type (core/feature/extension/standalone)이 정의되어 있는가?
- [ ] 브랜치 규칙이 확인되었는가? (feature/* 필수)

### 1.2 의존성 확인

- [ ] 의존하는 Core App이 모두 Active 상태인가?
- [ ] 의존하는 Extension App이 모두 등록되어 있는가?
- [ ] 순환 의존성이 없는가?

### 1.3 아키텍처 준수 확인

- [ ] CLAUDE.md v2.0 Constitution 규칙을 숙지했는가?
- [ ] App 계층 의존성 규칙을 준수하는가? (Core ← Extension ← Service)
- [ ] api-server 직접 import 금지 규칙을 이해했는가?

---

## 2. 구조 생성 체크리스트

### 2.1 필수 파일

- [ ] `manifest.ts` 생성 (meta, dependencies, cms, backend, navigation)
- [ ] `TODO.md` 생성 (템플릿: `docs/templates/APP_TODO_TEMPLATE.md`)
- [ ] `backend/index.ts` 생성 (createRoutes, entities, services export)
- [ ] `package.json` 생성 (name, version, dependencies)

### 2.2 Backend 구조

- [ ] `backend/entities/` 디렉토리 생성
- [ ] `backend/services/` 디렉토리 생성
- [ ] `backend/routes/` 디렉토리 생성
- [ ] `backend/lifecycle/` 디렉토리 생성 (필요 시)

### 2.3 Frontend 구조

- [ ] `frontend/components/` 디렉토리 생성
- [ ] `frontend/pages/` 디렉토리 생성
- [ ] View Component 기반 구성 (ListView, DetailView, FormView)

---

## 3. AppStore 등록 체크리스트

### 3.1 등록 필수 여부 확인

| App Type | AppStore 등록 |
|----------|---------------|
| core | ✅ 필수 |
| feature | ✅ 필수 |
| standalone | ✅ 필수 |
| extension | ⚠️ Service Active 시 필수 |
| infra-core | ❌ 등록 금지 |

### 3.2 등록 전 확인

- [ ] manifest.ts가 완전한가?
- [ ] 모든 의존성이 충족되었는가?
- [ ] Backend exports가 올바른가?

---

## 4. Schema 작업 체크리스트

### 4.1 Migration-First 원칙

- [ ] Entity 변경 전 migration 파일 먼저 생성했는가?
- [ ] Core Entity 수정이 아닌가? (Core Entity 수정 금지)
- [ ] Schema drift 방지 규칙을 준수했는가?

### 4.2 Entity 정의

- [ ] TypeORM decorator 사용
- [ ] Primary key 정의
- [ ] Relation 정의 (필요 시)
- [ ] Index 정의 (필요 시)

---

## 5. 테스트 및 검증

### 5.1 로컬 테스트

- [ ] `pnpm install` 성공
- [ ] `pnpm build` 성공 (타입 오류 없음)
- [ ] 브라우저 테스트 수행 (프론트엔드 변경 시)

### 5.2 통합 검증

- [ ] API 엔드포인트 동작 확인
- [ ] 의존 App과의 연동 확인

---

## 6. 배포 준비

### 6.1 Git 작업

- [ ] feature/* 브랜치에서 작업 완료
- [ ] develop 브랜치로 PR 생성
- [ ] 코드 리뷰 완료

### 6.2 배포 확인

- [ ] develop 환경 배포 및 테스트
- [ ] main 브랜치 머지 (프로덕션 배포 시)

---

## 참조 문서

| 문서 | 용도 |
|------|------|
| `CLAUDE.md` | Platform Constitution (최우선) |
| `docs/app-guidelines/work-order-standard-header.md` | Work Order 표준 헤더 |
| `docs/app-guidelines/manifest-specification.md` | Manifest 규격 |
| `docs/app-guidelines/core-app-development.md` | Core App 개발 |
| `docs/app-guidelines/extension-app-guideline.md` | Extension App 개발 |
| `docs/app-guidelines/service-app-guideline.md` | Service App 개발 |
| `docs/app-guidelines/schema-drift-prevention.md` | Schema 드리프트 방지 |

---

*Phase D Checklist v1.0 - 2025-12-15*
