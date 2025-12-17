# Admin System Investigation Report

> 리펙토링 후 Admin 시스템 전체 조사 결과
>
> 조사일: 2025-12-15
> 조사자: Claude Code

---

## 조사 개요

### 목적
리펙토링 후 관리자 시스템의 전반적인 상태를 Gate 기반으로 조사하여 문제점을 파악하고 수정 우선순위를 도출한다.

### 조사 범위
- Gate 0: 서버 생존성 (Boot & Init)
- Gate 1: Core Module 로딩
- Gate 2: 라우팅 테이블
- Gate 3: AppStore 설치 플로우
- Gate 4: DB/기능 의존성

---

## 최종 판정 요약

| Gate | 항목 | 판정 |
|------|------|------|
| Gate 0 | 서버 생존성 (Boot & Init) | **CONDITIONAL PASS** |
| Gate 1 | Core Module 로딩 | **CONDITIONAL PASS** |
| Gate 2 | 라우팅 테이블 | **CONDITIONAL PASS** |
| Gate 3 | AppStore 설치 플로우 | **FAIL** |
| Gate 4 | DB/기능 의존성 | **FAIL** |

---

## Gate 0: 서버 생존성 조사

### 0-1. 프로세스 실행 상태

| 항목 | 값 |
|------|-----|
| 상태 | online |
| Uptime | ~30분 |
| 재시작 횟수 | 108회 (안정성 우려) |

### 0-2. 설정 로딩

| 항목 | 상태 |
|------|------|
| YAML 파싱 | ⚠️ notifications.routes.ts에서 YAMLSemanticError |
| ENV 경고 | ⚠️ 존재하나 non-critical |

### 0-3. DB 연결

| 항목 | 상태 |
|------|------|
| 연결 | ✅ 성공 |
| 스키마 | ⚠️ App.provider 컬럼 없음 |
| Migration | ⚠️ "relation already exists" 오류 (non-critical 처리됨) |

### 0-4. Migration 상태

| 항목 | 값 |
|------|-----|
| typeorm_migrations 테이블 | 존재 |
| 레코드 수 | **0** (CRITICAL) |

### 0-5. Fatal 에러

- Fatal/unhandled/exception 에러 **없음**

### 0-6. Registry/Loader 초기화

| 항목 | 상태 |
|------|------|
| App Registry Service | ✅ initialized |
| ModuleLoader 시도 | 36 modules |
| Missing ID 스킵 | **22 modules** |
| 로드 성공 | 14 modules |
| 활성화 성공 | **12/14 modules** |
| 실패 원인 | cosmetics-supplier-extension requires dropshipping-core |

### Gate 0 주요 발견 사항

1. **typeorm_migrations 테이블 비어있음** - 마이그레이션 히스토리 유실
2. **22개 manifest에 `id` 필드 누락** - ModuleLoader에서 스킵됨
3. **cosmetics-supplier-extension 의존성 문제** - dropshipping-core 필요
4. **108회 재시작** - 안정성 문제 가능성

### Gate 0 판정: **CONDITIONAL PASS**

서버 기동 및 핵심 기능 동작 확인됨. 문제들이 있으나 서버가 요청 처리 중.

---

## Gate 1: Core Module 로딩 조사

### 1-1. ModuleLoader discovery 로직

- manifest.ts에서 `id` 필드 필수 (`!manifest.id` 체크)
- `appId`만 있고 `id` 없으면 스킵됨

### 1-2. packages/ 하위 앱 목록 vs 로드 결과

| 항목 | 수 |
|------|-----|
| 전체 packages/ 디렉토리 | 56개 |
| ModuleLoader 시도 | 36개 |
| 성공 로드 | 14개 |
| 활성화 성공 | 12개 |

### 1-3. `id` 필드 누락 패키지 (21개)

```
cms-core, diabetes-core, diabetes-pharmacy, dropshipping-core,
ecommerce-core, forum-app, forum-cosmetics, forum-yaksa, lms-core,
market-trial, organization-core, organization-forum, organization-lms,
partner-ai-builder, partner-core, partnerops, pharmaceutical-core,
pharmacyops, reporting-yaksa, sellerops, supplierops
```

### 1-4. 성공 로드된 모듈 (14개)

| 모듈 | lifecycle | backend |
|------|-----------|---------|
| annualfee-yaksa | ✅ | ✅ |
| auth-core | ✅ | ⚠️ (MISSING) |
| cosmetics-partner-extension | ✅ | ✅ |
| cosmetics-seller-extension | ✅ | - |
| cosmetics-supplier-extension | ⚠️ | - |
| dropshipping-cosmetics | ✅ | ✅ |
| health-extension | ✅ | ✅ |
| lms-marketing | ✅ | ✅ |
| lms-yaksa | ✅ | ✅ |
| membership-yaksa | ✅ | ✅ |
| platform-core | ✅ | ⚠️ (MISSING) |
| signage | ✅ | - |
| yaksa-scheduler | ✅ | ✅ |

### 1-5. 활성화 실패 원인 (2개)

| 모듈 | 원인 |
|------|------|
| cosmetics-supplier-extension | dist/lifecycle/index.js 없음, dropshipping-core 의존성 미충족 |

### Gate 1 주요 발견 사항

1. **21개 패키지 `id` 필드 누락** - ModuleLoader에서 스킵됨
2. **cosmetics-supplier-extension** - dist 빌드 안됨 + dropshipping-core 의존성
3. **auth-core, platform-core** - backend/index.js 없음 (로드는 됐으나 기능 제한)
4. **dropshipping-core** - ModuleLoader에서 스킵되어 다른 모듈 의존성 실패

### Gate 1 판정: **CONDITIONAL PASS**

- 핵심 모듈 12개 활성화됨
- 21개 모듈 미로드 (id 필드 누락)
- 의존성 체인 문제 있음 (dropshipping-core)

---

## Gate 2: 라우팅 테이블 조사

### 2-1. 등록된 라우트

| 라우트 | 상태 |
|--------|------|
| `/api/v1/admin/apps` | ✅ 등록됨, 401 반환 |
| `/api/v1/appstore` | ✅ 등록됨 |
| `/api/v1/navigation` | ✅ 등록됨, 실제 호출 시 404 |
| `/api/v1/routes` | ✅ 등록됨, 실제 호출 시 404 |
| `/api/v1/public` | ✅ 등록됨, 실제 호출 시 404 |
| `/api/v1/forum` | ✅ 등록됨, 500 반환 (DB 에러) |
| `/api/v1/auth` | ✅ 등록됨, 400 반환 (정상) |
| `/api/v1/cms` | ✅ 등록됨, 401 반환 |
| `/api/v1/service` | ✅ 등록됨 |
| `/api/v1/userRole` | ✅ 등록됨 |

### 2-2. 라우트 상태 요약

| 응답 코드 | 의미 | 수 |
|-----------|------|-----|
| 401 | 인증 필요 (정상) | 4+ |
| 400 | 검증 실패 (정상) | 1 |
| 404 | 라우트 없음 | 3+ |
| 500 | 서버 에러 (DB) | 1+ |

### 2-3. 500 에러 원인

| 엔드포인트 | 에러 |
|------------|------|
| `/api/v1/forum/posts` | `column post.organizationId does not exist` |
| App install | `No manifest found for app` |

### Gate 2 주요 발견 사항

1. **라우트 등록 vs 실제 동작 불일치**
   - 로그에는 등록되었다고 나오지만 일부 라우트가 404 반환
   - `/api/v1/navigation/menus`, `/api/v1/routes`, `/api/v1/public/apps` 등

2. **DB 스키마 누락**
   - `role_assignments` 테이블 없음
   - `post.organizationId` 컬럼 없음
   - `App.provider` 컬럼 없음

3. **notifications.routes.ts 에러**
   - YAML 파싱 에러로 정상 동작 불가

### Gate 2 판정: **CONDITIONAL PASS**

- 핵심 라우트(auth, admin/apps, cms) 등록됨
- 일부 라우트 404 (세부 조사 필요)
- DB 스키마 문제로 500 에러 발생

---

## Gate 3: AppStore 설치 플로우 조사

### 3-1. manifestRegistry vs 서버 상태

| 항목 | 로컬 src | 서버 src | 서버 dist |
|------|----------|----------|-----------|
| yaksa-scheduler | ✅ 있음 | ❌ 없음 | ❌ 없음 |
| annualfee-yaksa | ✅ 있음 | ❌ 없음 | ❌ 없음 |
| cosmetics-*-extension | ✅ 있음 | ❌ 없음 | ❌ 없음 |
| lms-yaksa, lms-marketing | ✅ 있음 | ❌ 없음 | ❌ 없음 |

### 3-2. apps 테이블 상태

| 항목 | 값 |
|------|-----|
| 레코드 수 | **0** (설치된 앱 없음) |
| provider 컬럼 | **없음** (Entity에서 요구) |

### 3-3. 앱 설치 실패 원인

1. **서버 코드 미배포**
   - 로컬 index.ts에 추가된 manifest imports가 서버에 없음
   - `hasManifest('yaksa-scheduler')` → false (manifestRegistry에 없음)

2. **DB 스키마 불일치**
   - App Entity에 `provider` 컬럼 있음
   - 실제 apps 테이블에 `provider` 컬럼 없음

3. **Migration 미실행**
   - typeorm_migrations 테이블이 비어있음
   - Migration 히스토리 없어 스키마 동기화 실패

### Gate 3 주요 발견 사항

1. **배포 동기화 실패** - 로컬 코드 ≠ 서버 코드
2. **앱 0개 설치** - apps 테이블 완전히 비어있음
3. **스키마 드리프트** - Entity vs DB 불일치

### Gate 3 판정: **FAIL**

- 앱 설치 완전 불가 상태
- 코드 배포 필요
- DB 스키마 동기화 필요

---

## Gate 4: DB/기능 의존성 조사

### 4-1. 테이블 현황

| 항목 | 수 |
|------|-----|
| 전체 테이블 | 71개 |
| typeorm_migrations 레코드 | **0** (마이그레이션 히스토리 없음) |

### 4-2. 데이터 현황

| 테이블 | 레코드 수 |
|--------|----------|
| users | 3 |
| organizations | 0 |
| forum_post | 0 |
| apps | **0** |
| role_assignments | 0 |
| typeorm_migrations | **0** |

### 4-3. Entity vs DB 스키마 불일치

**apps 테이블: 6개 이상 컬럼 누락**
- provider, category, icon, isSystem, author, repositoryUrl

**forum_post 테이블:**
- Entity: `organizationId` (camelCase)
- DB: `organization_id` (snake_case)
- TypeORM naming strategy 불일치

### Gate 4 주요 발견 사항

1. **typeorm_migrations 비어있음** - 마이그레이션 히스토리 완전 유실
2. **apps 테이블 스키마 구버전** - 새로운 컬럼 미적용
3. **데이터 거의 없음** - users 3명 외 대부분 빈 테이블
4. **Naming strategy 불일치** - camelCase Entity vs snake_case DB

### Gate 4 판정: **FAIL**

- 스키마 동기화 완전 실패
- 마이그레이션 시스템 복구 필요
- Entity-DB 불일치로 기능 작동 불가

---

## 핵심 문제점 요약

### P0 (Critical) - 즉시 수정 필요

1. **서버 코드 미배포**
   - 로컬의 `app-manifests/index.ts` 변경사항이 서버에 없음
   - yaksa-scheduler, annualfee-yaksa 등 앱 설치 불가

2. **typeorm_migrations 테이블 비어있음**
   - 마이그레이션 히스토리 유실
   - 매 시작 시 "relation already exists" 오류 발생

3. **apps 테이블 스키마 불일치**
   - Entity: provider, category, icon 등 컬럼 있음
   - DB: 해당 컬럼 없음
   - Google AI 초기화 실패

### P1 (High) - 기능 장애

4. **21개 패키지 manifest `id` 필드 누락**
   - ModuleLoader에서 스킵됨
   - dropshipping-core, ecommerce-core, forum-app 등

5. **cosmetics-supplier-extension 빌드 안됨**
   - dist/lifecycle/index.js 없음
   - 의존성 체인 실패

6. **notifications.routes.ts YAML 파싱 에러**
   - 서버 시작 시 에러 출력

### P2 (Medium) - 개선 필요

7. **TypeORM naming strategy 불일치**
   - Entity: camelCase (organizationId)
   - DB: snake_case (organization_id)

8. **서버 재시작 108회**
   - 안정성 문제 가능성

---

## 수정 우선순위 권장

### 1단계: 코드 배포
- 로컬 코드를 서버에 배포
- api-server 빌드 및 재시작

### 2단계: DB 스키마 동기화
- typeorm_migrations 테이블에 기존 마이그레이션 기록 추가
- apps 테이블에 누락 컬럼 추가 (provider, category 등)

### 3단계: Manifest id 필드 추가
- 21개 패키지의 manifest.ts에 id 필드 추가
- 재빌드 및 배포

### 4단계: cosmetics-supplier-extension 빌드
- lifecycle exports 확인
- 의존성 해결

### 5단계: notifications.routes.ts 수정
- YAML 파싱 에러 해결

---

## 참고 자료

### 조사에 사용된 주요 명령어

```bash
# 서버 상태 확인
ssh o4o-api "npx pm2 list"
ssh o4o-api "npx pm2 logs o4o-api --lines 500 --nostream"

# DB 상태 확인
ssh o4o-api "PGPASSWORD=postgres psql -h localhost -U postgres -d o4o_platform -c \"...\""

# 파일 확인
ssh o4o-api "cat /home/ubuntu/o4o-platform/apps/api-server/src/app-manifests/index.ts"
```

### 관련 파일 경로

- 서버: `/home/ubuntu/o4o-platform/`
- ManifestRegistry: `apps/api-server/src/app-manifests/index.ts`
- ModuleLoader: `apps/api-server/src/modules/module-loader.ts`
- AppDependencyResolver: `apps/api-server/src/services/AppDependencyResolver.ts`
- App Entity: `apps/api-server/src/entities/App.ts`

---

*조사 완료: 2025-12-15*
