# IR-KPA-A-ASSET-COPY-REAL-USAGE-VALIDATION-V1

> 목적: KPA-a Pilot로 구현된 O4O Asset Copy Engine이 실제 사용 시 구조적·운영상 안정적인지 전면 검증
>
> 범위: KPA-a (커뮤니티 Core + 매장 허브 연계)
> 제외: 주문/결제, Commerce Core
>
> 유형: 읽기 전용 조사 (코드 수정 없음)
> 기준: WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1
>
> 일시: 2026-02-16

---

## Executive Summary

Asset Copy Engine은 **Pilot 수준에서는 동작하나, 프로덕션/Core 승격에는 부적합**하다.

핵심 문제 3건:
1. **권한 검증 누락** — POST /copy에 requireAuth만 있고 operator role 체크 없음
2. **DB UNIQUE 제약 없음** — 중복 방지가 application-level 전용 (race condition 취약)
3. **Pagination 미구현** — 전량 반환, 1000건 이상 시 OOM 위험

구조적 설계(독립 스냅샷, FK 없음, 플랫폼 공통 테이블)는 우수하나,
보안·안정성·확장성 보강 없이는 Core로 승격할 수 없다.

---

## 결과 요약

| Case | 항목 | 결과 | 위험도 |
|------|------|------|--------|
| 구조 | Snapshot 테이블 스키마 | **PASS** | Low |
| 구조 | DB UNIQUE 제약 | **FAIL** | High |
| 구조 | updated_at 컬럼 | **MISSING** | Medium |
| A | CMS 자산 복사 | **PASS** | Low |
| B | Signage 자산 복사 | **PASS** | Low |
| C | 중복 복사 정책 | **CONDITIONAL** | Medium |
| D | Snapshot 독립성 | **PASS** | Low |
| E | 매장 편집 안정성 | **FAIL** | Medium |
| F | 권한 경계 | **FAIL** | **High** |
| G | 성능 / 확장성 | **FAIL** | **High** |

### Core 승격 판정

| 항목 | 상태 |
|------|------|
| 구조 독립성 | PASS — o4o_ prefix, 서비스 비종속 |
| FK 안정성 | PASS — 의도적 FK 부재, 독립 스냅샷 |
| 확장성 | FAIL — pagination 없음, transaction 없음 |
| 멀티서비스 재사용 | PARTIAL — 스키마 OK, API/Auth는 KPA 전용 |
| 위험도 | HIGH — 권한·중복·성능 3중 미비 |

**최종 판정: C) 수정 후 재검증 필요**

---

## 구조 검증: o4o_asset_snapshots 테이블

**Migration**: `apps/api-server/src/database/migrations/20260216000001-CreateO4oAssetSnapshots.ts`
**Entity**: `apps/api-server/src/modules/asset-snapshot/entities/asset-snapshot.entity.ts`

| 항목 | 결과 | 비고 |
|------|------|------|
| PK/UUID (gen_random_uuid) | PASS | |
| organization_id (UUID NOT NULL) | PASS | |
| source_service (VARCHAR 50) | PASS | |
| source_asset_id (UUID NOT NULL) | PASS | |
| asset_type (VARCHAR 20) | PASS | |
| title (TEXT NOT NULL) | PASS | |
| content_json (JSONB NOT NULL DEFAULT '{}') | PASS | |
| created_by (UUID NOT NULL) | PASS | |
| created_at (TIMESTAMP DEFAULT now()) | PASS | |
| updated_at | **MISSING** | 플랫폼 표준 불일치 |
| IDX_asset_snap_org_id | PASS | organization_id 인덱스 |
| IDX_asset_snap_asset_type | PASS | asset_type 인덱스 |
| IDX_asset_snap_source | PASS | (source_service, source_asset_id) 복합 |
| UNIQUE (org_id, source_asset_id, asset_type) | **FAIL** | DB 제약 없음, 앱 레벨만 |
| FK to source tables | PASS | 의도적 부재 (설계 원칙) |
| Entity 등록 (connection.ts) | PASS | Line 570 |
| Idempotent migration | PASS | IF NOT EXISTS 체크 |
| ESM 규칙 준수 | PASS | 관계 데코레이터 없음 |

---

## Case A — CMS 자산 복사: PASS

**파일**: `asset-snapshot.service.ts:109-124`

### 필드 복사 현황

| CMS 원본 필드 | content_json 보존 | nullable 처리 |
|---------------|-------------------|--------------|
| title | O | NOT NULL |
| type | O | NOT NULL |
| summary | O | null 허용 |
| body | O | null 허용 |
| imageUrl | O | null 허용 |
| linkUrl | O | null 허용 |
| linkText | O | null 허용 |
| metadata | O | default {} |

- 전체 필드 보존 확인
- URL 경로(imageUrl, linkUrl) 완전 보존
- nullable 필드 직접 할당 → null 손실 없음
- 원본 수정/삭제 시 snapshot 영향: **없음** (독립 JSONB)

---

## Case B — Signage 자산 복사: PASS

**파일**: `asset-snapshot.service.ts:126-154`

### Raw SQL 쿼리

```sql
SELECT "id", "name", "description", "mediaType", "sourceType", "sourceUrl",
       "thumbnailUrl", "duration", "resolution", "content", "tags", "category", "metadata"
FROM "signage_media"
WHERE "id" = $1 AND "deletedAt" IS NULL
```

| Signage 필드 | content_json 보존 | 비고 |
|-------------|-------------------|------|
| name → title | O | 필드명 변환 |
| mediaType | O | |
| sourceType | O | |
| sourceUrl | O | URL 완전 보존 |
| thumbnailUrl | O | nullable |
| duration | O | nullable |
| resolution | O | nullable |
| content | O | nullable |
| tags | O | array |
| category | O | nullable |
| description | O | nullable |
| metadata | O | jsonb |

- CMS와 동일한 수준의 필드 보존
- Raw SQL로 인한 필드 누락: 없음
- CMS 대비 구조 차이: 정상 (타입별 필드가 다른 것은 의도)

---

## Case C — 중복 복사 정책: CONDITIONAL

### 현재 구현

**탐지**: Application-level `findOne()` (service.ts:51-60)
**응답**: HTTP 409 + `DUPLICATE_SNAPSHOT` 코드

### 문제: Race Condition 취약

```
Request A: findOne() → null (없음)
                                    ← RACE WINDOW
Request B: findOne() → null (없음)
Request A: save() → 성공
Request B: save() → 성공 (중복 생성!)
```

- DB UNIQUE 제약이 없으므로 동시 요청 시 중복 생성 가능
- Pilot 단계에서는 단일 사용자이므로 실질적 위험 낮음
- 프로덕션에서는 반드시 DB 제약 필요

### 재복사(Overwrite) 기능: 없음

- 원본 수정 후 재복사 불가 (409 반환)
- DELETE endpoint 없음
- PUT/PATCH endpoint 없음
- **사용자 기대와 불일치 가능** — "매장으로 복사" 재클릭 시 에러

---

## Case D — Snapshot 독립성: PASS

| 시나리오 | 예상 결과 | 코드 근거 | 판정 |
|----------|----------|----------|------|
| 원본 수정 | Snapshot 불변 | content_json은 복사 시점 고정 | PASS |
| 원본 삭제 | Snapshot 유지 | FK 없음, source_asset_id는 메타데이터 | PASS |
| 원본 비공개 | Snapshot 유지 | 상태 체크 없이 독립 존재 | PASS |
| 커뮤니티 DB 변경 | Snapshot 영향 없음 | 별도 테이블, JOIN 없음 | PASS |

### 전수 검색 결과

- snapshot → source 테이블 JOIN: **0건**
- source_asset_id를 이용한 원본 조회: **0건**
- 역방향 참조(source → snapshot): **0건**

Snapshot 독립성 원칙이 완벽하게 지켜지고 있다.

---

## Case E — 매장 편집 안정성: FAIL

### 현재 상태

- PUT/PATCH endpoint: **없음** (스냅샷은 immutable)
- content_json 수정 기능: **없음**

### 잠재적 위험

| 항목 | 상태 | 위험도 |
|------|------|--------|
| JSON schema 검증 | **없음** | Medium |
| title 길이 제한 | **없음** | Low |
| content_json 크기 제한 | **없음** | Medium |
| XSS 방어 (title) | React 자동 이스케이프 | Low |
| XSS 방어 (content_json) | **현재 UI에서 미표시** | Low (미래 위험) |
| HTML 새니타이징 | **없음** | Medium |

### 평가

현재는 스냅샷이 immutable이므로 편집 위험은 없다.
다만 content_json에 원본의 HTML(body 필드)이 그대로 저장되므로,
향후 `dangerouslySetInnerHTML`로 렌더링 시 XSS 위험 발생.

---

## Case F — 권한 경계: FAIL (HIGH)

### API 권한 분석

**POST /assets/copy** (`asset-snapshot.controller.ts:46`)

| 검증 항목 | 상태 | 코드 |
|-----------|------|------|
| requireAuth | **적용됨** | kpa.routes.ts:181 |
| requireKpaScope('kpa:operator') | **미적용** | 누락 |
| organization_id 자동 결정 | **정상** | user → KpaMember → org |
| Cross-org 복사 차단 | **정상** | 요청 body 무시, 사용자 org 사용 |

### 문제

```
현재: requireAuth만 적용
기대: requireAuth + requireKpaScope('kpa:operator')
```

**영향**: KPA 회원이면 누구나(pharmacist, student, officer) 자산 복사 가능.
약국 경영자(pharmacy_owner)나 operator 역할 없이도 호출 가능.

### Frontend vs Backend 불일치

| 레이어 | 권한 체크 |
|--------|----------|
| Frontend (ContentManagementPage) | kpa:operator 이상만 접근 가능 |
| Backend (POST /copy) | **로그인만 확인** |

Frontend가 더 엄격하므로 실질적 위험은 낮지만,
API 직접 호출 시 권한 우회 가능.

### 원본 접근 검증 부재

| 항목 | 상태 |
|------|------|
| CMS serviceKey 검증 | **없음** — 다른 서비스 CMS도 복사 가능 |
| CMS status 검증 | **없음** — draft/archived도 복사 가능 |
| Signage deletedAt 검증 | **있음** — WHERE deletedAt IS NULL |

---

## Case G — 성능 / 확장성: FAIL (HIGH)

### Pagination

| 항목 | 상태 |
|------|------|
| GET /assets pagination | **미구현** — 전량 반환 |
| limit/offset 파라미터 | **없음** |
| 1000 snapshot 시 | OOM/타임아웃 위험 |

### Transaction Safety

| 항목 | 상태 |
|------|------|
| copyAsset() 트랜잭션 | **없음** |
| findOne + save 원자성 | **보장 안 됨** |
| 동시 복사 시 | 중복 생성 가능 |

### 인덱스 현황

| 인덱스 | 용도 | 상태 |
|--------|------|------|
| IDX_asset_snap_org_id | org별 목록 조회 | PASS |
| IDX_asset_snap_asset_type | 타입 필터 | PASS |
| IDX_asset_snap_source | 중복 탐지 | PASS |
| GIN on content_json | JSONB 검색 | 없음 (Pilot에서 불필요) |

### N+1 Query

- 목록 조회: 단일 쿼리 → **정상**
- 복사 작업: 3-4개 쿼리 (원본 조회 + 중복 체크 + 저장) → Pilot 허용

---

## 구조적 위험 요약

| # | 위험 | 위험도 | 영향 |
|---|------|--------|------|
| 1 | POST /copy operator role 미검증 | **HIGH** | 권한 우회 가능 |
| 2 | DB UNIQUE 제약 없음 | **HIGH** | 동시 요청 시 중복 |
| 3 | Pagination 미구현 | **HIGH** | 대량 데이터 시 OOM |
| 4 | CMS serviceKey/status 미검증 | **MEDIUM** | 타 서비스 콘텐츠 복사 가능 |
| 5 | HTML 새니타이징 없음 | **MEDIUM** | 향후 XSS 위험 |
| 6 | updated_at 컬럼 없음 | **MEDIUM** | 플랫폼 표준 불일치 |
| 7 | 재복사(Overwrite) 불가 | **LOW** | UX 제한 |
| 8 | content_json 크기 제한 없음 | **LOW** | 대형 blob 저장 가능 |

---

## 데이터 왜곡 가능성

- source_asset_id 추적 손실: 원본 삭제 시 참조만 남음 (FK 없으므로 정상)
- 복사 이력: 감사 로그 없음 → 누가 언제 복사했는지 created_by + created_at으로만 추적
- 통계 왜곡: 스냅샷을 원본 콘텐츠로 오인할 가능성 (UI에서 "복사본" 표시 필요)

---

## 권장 조치

### P0 (즉시 수정 필수)

1. **POST /copy에 operator role 체크 추가**
   - `requireKpaScope('kpa:operator')` 미들웨어 적용
   - 예상 작업량: 1줄 추가

2. **DB UNIQUE 제약 추가**
   - `UNIQUE (organization_id, source_asset_id, asset_type)`
   - 마이그레이션 1건 추가

3. **Pagination 구현**
   - GET /assets에 limit/offset 파라미터
   - 기본 limit = 50

### P1 (안정화)

4. **CMS 원본 검증 강화**
   - serviceKey = 'kpa' 확인
   - status = 'published' 확인

5. **Transaction wrapper**
   - copyAsset() 전체를 queryRunner.startTransaction() 감싸기

6. **updated_at 컬럼 추가**
   - 플랫폼 표준 일관성

### P2 (Core 승격 전 필수)

7. **API 탈개인화** — `/kpa/assets` → `/platform/asset-snapshots`
8. **Org context resolver 플러그인화** — KPA 외 서비스 지원
9. **Soft delete (deletedAt)** 추가
10. **감사 로그** — 복사 이벤트 기록

### P3 (향후)

11. content_json 크기 제한 (1MB)
12. HTML 새니타이징
13. 재복사/Overwrite 옵션
14. Rate limiting

---

## Core 승격 평가

| 기준 | 현재 상태 | Core 요구 |
|------|----------|----------|
| 스키마 독립성 | PASS (o4o_ prefix) | PASS |
| FK 안정성 | PASS (의도적 부재) | PASS |
| 멀티서비스 스키마 | PASS (source_service 컬럼) | PASS |
| API 추상화 | FAIL (KPA 전용 경로) | 플랫폼 공통 필요 |
| Auth 분리 | FAIL (KPA membership 종속) | 플러그인 필요 |
| Pagination | FAIL | 필수 |
| Transaction 안정성 | FAIL | 필수 |
| UNIQUE 제약 | FAIL | 필수 |
| Soft delete | FAIL | 필요 |
| 테스트 커버리지 | 0% | 80%+ |

### 최종 판정: C) 수정 후 재검증 필요

**스키마 설계는 우수** (플랫폼 공통, FK 독립, source_service 컬럼)
**구현은 Pilot 수준** (권한·중복·성능 보강 필요)

P0 + P1 조치 후: KPA-a 프로덕션 사용 가능
P2 조치 후: Core 승격 재검증 대상

---

*Generated: 2026-02-16*
*Status: Investigation Complete*
