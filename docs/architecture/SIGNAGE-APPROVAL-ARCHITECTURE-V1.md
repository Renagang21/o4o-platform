# SIGNAGE-APPROVAL-ARCHITECTURE-V1

> **Signage 승인형 모델 전환 아키텍처 설계**
> WO-O4O-SIGNAGE-APPROVAL-ARCHITECTURE-DESIGN-V1
> 2026-02-24

---

## 1. 설계 목표

### 현재 (즉시 배포 모델)

```
HQ Media:     create → active → HUB 즉시 노출
HQ Playlist:  create → draft/active → active 시 HUB 노출
Store Media:  create → active (HUB 무관)
```

### 목표 (승인형 모델)

```
HQ Media:     create → draft → pending → active → HUB 노출
HQ Playlist:  create → draft → pending → active → HUB 노출
Store:        현행 유지 (변경 없음)
```

### 설계 제약

- HUB 쿼리 변경 없음 (`status = 'active'`만 소비 — 변경 없음)
- Boundary Policy 위반 없음
- 기존 Store 경로 영향 없음
- CMS 승인 모델과 정렬

---

## 2. 현재 상태 분석

### Status 컬럼 타입

| 테이블 | 컬럼 타입 | ENUM 아님 |
|--------|----------|:---------:|
| `signage_media` | `VARCHAR(20)` | 확인 |
| `signage_playlists` | `VARCHAR(20)` | 확인 |

**VARCHAR이므로 ALTER TYPE 마이그레이션 불필요.** DTO 검증 + 서비스 레이어에서 제어.

### 현재 Status 값

| 엔티티 | 허용 값 | 기본값 | HUB 노출 |
|--------|--------|--------|:--------:|
| Media | `active`, `inactive`, `processing` | `active` | `active`만 |
| Playlist | `active`, `inactive`, `draft` | `draft` | `active`만 |

### 현재 생성 시 Status 설정

| 경로 | 엔티티 | 초기 status | 코드 위치 |
|------|--------|:----------:|----------|
| HQ Media | Media | `'active'` (강제) | `signage.service.ts:1206` |
| HQ Playlist | Playlist | DTO 선택 (미지정 시 DB 기본값 `'draft'`) | `signage.service.ts:1172` |
| Store Media | Media | `'active'` (강제) | `signage.service.ts:344` |
| Store Playlist | Playlist | DTO 선택 (미지정 시 DB 기본값 `'draft'`) | `signage.service.ts:122` |

### 현재 Operator Summary 쿼리

| 지표 | 조건 |
|------|------|
| Active Media | `status = 'active'` |
| Active Playlists | `status = 'active'` |
| Pending Media | `status IN ('processing', 'inactive')` |
| Pending Playlists | `status = 'draft'` |

### 현재 Status 전환

**명시적 상태 머신 없음.** `updateMedia()` / `updatePlaylist()`에서 DTO 필드로 자유 전환.
전환 검증 로직 없음 (어떤 상태에서든 어떤 상태로든 전환 가능).

---

## 3. 목표 Status 체계

### 통합 4단계 모델

```
draft ──→ pending ──→ active ──→ archived
  │          │                      ▲
  │          └──→ draft (거절 시)     │
  └──────────────────────────────────┘
```

| 상태 | 의미 | HUB 노출 | Media 해당 | Playlist 해당 |
|------|------|:--------:|:---------:|:------------:|
| `draft` | 생성 직후 / 거절 후 수정 중 | NO | YES (신규) | YES (기존) |
| `pending` | 승인 대기 | NO | YES (신규) | YES (신규) |
| `active` | 승인 완료, 운영 중 | **YES** | YES (기존) | YES (기존) |
| `archived` | 종료, 비활성 | NO | YES (신규, `inactive` 대체) | YES (신규, `inactive` 대체) |

### 기존 값 매핑

| 기존 status | 신규 status | 근거 |
|------------|:----------:|------|
| `active` | `active` | 유지 |
| `draft` (playlist) | `draft` | 유지 |
| `inactive` | `archived` | 비활성 → 종료로 통합 |
| `processing` | `draft` | 처리 중 → 생성 단계로 통합 |

### CMS 모델과의 정렬

| 단계 | CMS | Signage (신규) |
|------|-----|:-------------:|
| 생성 | `draft` | `draft` |
| 승인 대기 | — (자가 발행) | `pending` |
| 활성 | `published` | `active` |
| 종료 | `archived` | `archived` |

**차이점**: CMS는 자가 발행(draft → published 직접 전환). Signage는 승인 단계(`pending`) 추가.

---

## 4. 역할별 Status 전환 권한

### 전환 권한 매트릭스

| 전환 | Platform Admin | Service Operator | Store User | Supplier |
|------|:--------------:|:----------------:|:----------:|:--------:|
| `→ draft` (생성) | YES | YES | YES (store만) | YES (ext) |
| `draft → pending` | YES | YES | — | YES |
| `pending → active` (승인) | YES | YES | — | NO |
| `pending → draft` (거절) | YES | YES | — | NO |
| `active → archived` | YES | YES | — | NO |
| `draft → active` (즉시 승인) | **YES** | NO | — | NO |

### Platform Admin 특권

Platform Admin(`platform:admin`, `platform:super_admin`)은 `draft → active` 직접 전환 가능.
이는 긴급 배포 시나리오를 위한 것이며, 일반 운영에서는 `draft → pending → active` 경로 권장.

---

## 5. 생성 경로별 변경

### A. HQ Media 생성 (변경 필요)

**현재**: `status = 'active'` (서비스 레이어 강제)
**변경 후**: `status = 'draft'` (서비스 레이어 강제)

```typescript
// signage.service.ts — createGlobalMedia
// BEFORE:
status: 'active',
// AFTER:
status: 'draft',
```

**영향**: HQ Media 생성 즉시 HUB 노출 → 승인 후 HUB 노출

### B. HQ Playlist 생성 (변경 필요)

**현재**: DTO에서 status 선택 가능 (기본값 `'draft'`)
**변경 후**: `status = 'draft'` (서비스 레이어 강제, DTO 값 무시)

```typescript
// signage.service.ts — createGlobalPlaylist
// BEFORE:
...dto,
// AFTER:
...dto,
status: 'draft',  // DTO 값 override
```

### C. Store Media 생성 (변경 없음)

**현재 유지**: `status = 'active'`
Store 콘텐츠는 HUB에 노출되지 않으므로 승인 불필요.

### D. Store Playlist 생성 (변경 없음)

**현재 유지**: DTO에서 status 선택
Store 콘텐츠는 HUB에 노출되지 않으므로 승인 불필요.

### E. Supplier 생성 (변경 필요 확인)

Seller extension 경로 확인 필요. 현재 승인 워크플로우가 존재하면 `pending` 단계 통합.

---

## 6. 승인 API 설계

### 신규 엔드포인트

| 엔드포인트 | 메서드 | 용도 | 가드 |
|-----------|--------|------|------|
| `/api/signage/:serviceKey/hq/media/:id/status` | PATCH | 미디어 상태 전환 | `requireSignageOperator` |
| `/api/signage/:serviceKey/hq/playlists/:id/status` | PATCH | 플레이리스트 상태 전환 | `requireSignageOperator` |

### Request Body

```typescript
interface UpdateSignageStatusDto {
  status: 'pending' | 'active' | 'draft' | 'archived';
  reason?: string;  // 거절 사유 (optional)
}
```

### 전환 검증 로직

```typescript
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'draft':    ['pending', 'archived'],           // 승인 요청 또는 폐기
  'pending':  ['active', 'draft'],               // 승인 또는 거절(draft 복귀)
  'active':   ['archived'],                      // 종료
  'archived': [],                                // 최종 상태
};

// Platform Admin 추가 권한
const ADMIN_OVERRIDE_TRANSITIONS: Record<string, string[]> = {
  'draft':    ['pending', 'active', 'archived'], // 즉시 승인 포함
};
```

---

## 7. HUB 영향 분석

### HUB 쿼리 변경: 없음

```sql
-- 현재 HUB 쿼리 (변경 없음)
WHERE serviceKey = $1
  AND status = 'active'        ← 변경 없음
  AND scope = 'global'
  AND source IN ('hq', 'supplier', 'community')
  AND "deletedAt" IS NULL
```

`status = 'active'`만 소비하므로, `draft` / `pending` / `archived`는 자동 제외.
**HUB 쿼리 코드 변경 불필요.**

---

## 8. Operator Summary 영향

### 현재 → 변경 후

| 지표 | 현재 조건 | 변경 후 조건 |
|------|----------|------------|
| Active Media | `status = 'active'` | `status = 'active'` (동일) |
| Active Playlists | `status = 'active'` | `status = 'active'` (동일) |
| Pending Media | `status IN ('processing', 'inactive')` | `status = 'pending'` |
| Pending Playlists | `status = 'draft'` | `status = 'pending'` |

**변경 필요**: `operator-summary.controller.ts`의 Pending 쿼리 조건 변경.

### 추가 KPI (선택)

| 지표 | 조건 | 용도 |
|------|------|------|
| Draft count | `status = 'draft'` | 작성 중 콘텐츠 수 |
| Pending count | `status = 'pending'` | 승인 대기 수 (승인 알림) |
| Archived count | `status = 'archived'` | 종료된 콘텐츠 수 |

---

## 9. DB 마이그레이션 설계

### VARCHAR이므로 ENUM 변경 불필요

Status 컬럼이 `VARCHAR(20)`이므로 PostgreSQL ENUM ALTER 작업 없음.
기존 데이터의 status 값만 매핑 전환.

### 마이그레이션 내용

```sql
-- 1. 기존 'inactive' → 'archived' 전환
UPDATE signage_media SET status = 'archived' WHERE status = 'inactive';
UPDATE signage_playlists SET status = 'archived' WHERE status = 'inactive';

-- 2. 기존 'processing' → 'draft' 전환
UPDATE signage_media SET status = 'draft' WHERE status = 'processing';

-- 3. CHECK 제약 추가 (선택적 — 런타임 검증과 이중 보호)
ALTER TABLE signage_media
  ADD CONSTRAINT chk_signage_media_status
  CHECK (status IN ('draft', 'pending', 'active', 'archived'));

ALTER TABLE signage_playlists
  ADD CONSTRAINT chk_signage_playlists_status
  CHECK (status IN ('draft', 'pending', 'active', 'archived'));
```

### Down 마이그레이션

```sql
-- CHECK 제약 제거
ALTER TABLE signage_media DROP CONSTRAINT IF EXISTS chk_signage_media_status;
ALTER TABLE signage_playlists DROP CONSTRAINT IF EXISTS chk_signage_playlists_status;

-- 값 복원
UPDATE signage_media SET status = 'inactive' WHERE status = 'archived';
UPDATE signage_playlists SET status = 'inactive' WHERE status = 'archived';
```

---

## 10. 변경 파일 목록 (구현 시)

| 파일 | 변경 내용 | 영향 범위 |
|------|----------|----------|
| `signage.service.ts` | HQ 생성 시 `status='draft'` 강제 | HQ 생성 경로 |
| `signage.controller.ts` | 신규 status 전환 엔드포인트 추가 | 신규 API |
| `signage.routes.ts` | 신규 라우트 등록 | 신규 API |
| `dto/index.ts` | Status 허용 값 변경 (`'pending'`, `'archived'` 추가) | DTO 검증 |
| `operator-summary.controller.ts` | Pending 쿼리 조건 변경 | KPI |
| `SignageMedia.entity.ts` | Status 타입 주석 갱신 | 문서 |
| `SignagePlaylist.entity.ts` | Status 타입 주석 갱신 | 문서 |
| 마이그레이션 파일 (신규) | 기존 데이터 전환 + CHECK 제약 | DB |

### 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `hub-content.service.ts` | `status='active'`만 소비 — 변경 불필요 |
| `signage-query.service.ts` | `status='active'`만 소비 — 변경 불필요 |
| Store 생성 경로 | Store 콘텐츠는 HUB 무관 — 변경 불필요 |

---

## 11. UX 흐름

### 생성 화면 (HQ Operator)

```
[콘텐츠 생성] → status='draft'
  ↓
[편집 / 미리보기]
  ↓
[승인 요청 버튼] → status='pending'
  ↓
배지: "승인 대기 중"
```

### 승인 화면 (Service Admin / Platform Admin)

```
[Pending 목록] ← status='pending' 필터
  ↓
[미리보기]
  ↓
[승인] → status='active' → HUB 노출
[거절] → status='draft' + reason → 수정 요청
```

### Platform Admin 긴급 경로

```
[콘텐츠 생성] → status='draft'
  ↓
[즉시 배포 버튼] → status='active' (pending 스킵)
  ↓
HUB 즉시 노출
```

---

## 12. CMS 승인 모델과의 비교

| 항목 | CMS | Signage (신규) |
|------|-----|:-------------:|
| 생성 초기 상태 | `draft` | `draft` |
| 승인 단계 | 없음 (자가 발행) | `pending` (별도 승인) |
| 활성 상태 | `published` | `active` |
| 종료 상태 | `archived` | `archived` |
| Platform Admin 특권 | 자유 전환 | `draft → active` 직접 가능 |
| 승인자 | 자기 자신 | Service Operator 이상 |
| HUB 노출 조건 | `status='published'` | `status='active'` |

### 향후 CMS 승인 단계 추가 시

CMS도 `pending` 단계를 추가하면 두 도메인이 완전히 정렬됨:
```
CMS:     draft → pending → published → archived
Signage: draft → pending → active    → archived
```

---

## 13. 리스크 분석

| 항목 | 영향 | 완화 방안 |
|------|------|----------|
| 기존 `active` 즉시 배포 중단 | 의도된 통제 강화 | Platform Admin 즉시 배포 경로 유지 |
| 기존 `inactive`/`processing` 데이터 | 마이그레이션으로 전환 | `inactive→archived`, `processing→draft` |
| Operator Summary 지표 변동 | Pending 정의 변경 | `status='pending'`으로 명확화 |
| Store 경로 영향 | 없음 | Store 생성 로직 변경 없음 |
| HUB 노출 영향 | 없음 | `status='active'` 조건 유지 |
| Boundary Policy 영향 | 없음 | serviceKey/scope 변경 없음 |

---

## 14. 결론

### 핵심 설계 원칙

1. **HUB는 `active`만 소비** — HUB 쿼리 변경 없음
2. **승인은 HQ/Global 경로만 적용** — Store 경로 무영향
3. **VARCHAR 기반** — DB ENUM 마이그레이션 불필요
4. **Platform Admin 즉시 배포** — 긴급 경로 유지
5. **CMS 모델 정렬** — 두 도메인 동일한 상태 흐름

### 구현 우선순위

| 순서 | 작업 | 복잡도 |
|:----:|------|:------:|
| 1 | DB 마이그레이션 (값 전환 + CHECK 제약) | 낮음 |
| 2 | DTO status 값 변경 | 낮음 |
| 3 | HQ 생성 시 `status='draft'` 강제 | 낮음 |
| 4 | Status 전환 API + 전환 검증 로직 | 중간 |
| 5 | Operator Summary 쿼리 갱신 | 낮음 |
| 6 | Frontend 승인 UI | 중간 |

### 전략적 의미

이 전환은 단순 기능이 아니라 **Broadcast Governance Layer 도입**이다.
Signage가 "운영자 도구"에서 "콘텐츠 유통 플랫폼"으로 진입하는 구조적 전환점.

---

*Generated: 2026-02-24*
*WO: WO-O4O-SIGNAGE-APPROVAL-ARCHITECTURE-DESIGN-V1*
*Status: Architecture Design Complete — No Code Change*
*Classification: Architecture Document*
