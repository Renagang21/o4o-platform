# IR-O4O-SUPPLIER-BROADCAST-DISTRIBUTION-INVESTIGATION-V1

> **공급자 Broadcast 콘텐츠 진열 구조 조사 보고서**
> WO-O4O-SUPPLIER-BROADCAST-DISTRIBUTION-INVESTIGATION-V1
> 2026-02-24

---

## 조사 목적

공급자가 제공하는 Content(CMS) / Signage가 매장 HUB에 어떤 기준으로 노출되는지,
그 기준이 "전체 / 서비스별 / 복수 서비스별" 중 무엇인지 구조적으로 규명한다.

**본 조사는 코드 수정 없이 분석 및 보고만 수행한다.**

---

## 종합 판정

```
Distribution Model:  Model A — Single ServiceKey Model

Q1 (공급자 구분):     CMS: authorRole='supplier' / Signage: source='supplier'
Q2 (HUB 필터):       serviceKey + status + visibility/scope + authorRole/source
Q3 (복수 서비스):     불가 — 1 row = 1 serviceKey (별도 row 생성 필요)
Q4 (전체 진열):       구조적 불가 — HUB는 serviceKey 일치 필수
Q5 (서비스별 설정):   단일 serviceKey 컬럼, 매핑 테이블 없음
```

---

## 1. Supplier Broadcast Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                  SUPPLIER CONTENT CREATION                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐     ┌─────────────────────┐        │
│  │   CMS Content       │     │   Signage Media      │        │
│  │                     │     │                      │        │
│  │  POST /cms/supplier │     │  POST /signage/ext/  │        │
│  │       /contents     │     │       seller/contents │        │
│  │                     │     │                      │        │
│  │  authorRole =       │     │  source =            │        │
│  │    'supplier'       │     │    'supplier'         │        │
│  │  (서버 강제)         │     │  (서버 강제)           │        │
│  │                     │     │                      │        │
│  │  visibilityScope =  │     │  scope =             │        │
│  │    'service'        │     │    'global'           │        │
│  │  (서버 강제)         │     │  (서버 강제)           │        │
│  │                     │     │                      │        │
│  │  serviceKey =       │     │  serviceKey =        │        │
│  │    'glycopharm'     │     │    'glycopharm'       │        │
│  │  (필수, 단일값)      │     │  (필수, 단일값)        │        │
│  │                     │     │                      │        │
│  │  status = 'draft'   │     │  승인 워크플로우        │        │
│  │  (관리자 승인 필요)   │     │  (approveContent)     │        │
│  └─────────┬───────────┘     └──────────┬───────────┘        │
│            │ 관리자 승인                   │ 관리자 승인         │
│            ▼                             ▼                    │
│  ┌─────────────────────┐     ┌─────────────────────┐        │
│  │  status='published' │     │  status='active'     │        │
│  │  (HUB 노출 가능)     │     │  (HUB 노출 가능)      │        │
│  └─────────┬───────────┘     └──────────┬───────────┘        │
│            │                             │                    │
└────────────┼─────────────────────────────┼────────────────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    HUB CONTENT QUERY                          │
│                                                              │
│  HubContentQueryService.getContents(serviceKey='glycopharm') │
│                                                              │
│  ┌─────────────────────┐     ┌─────────────────────┐        │
│  │   CMS Query         │     │   Signage Query      │        │
│  │                     │     │                      │        │
│  │  WHERE              │     │  WHERE               │        │
│  │   serviceKey=$1     │     │   serviceKey=$1      │        │
│  │   status='published'│     │   status='active'    │        │
│  │   visibilityScope   │     │   scope='global'     │        │
│  │     IN ('platform', │     │   source IN ('hq',   │        │
│  │         'service')  │     │     'supplier',      │        │
│  │   authorRole=       │     │     'community')     │        │
│  │     'supplier'      │     │                      │        │
│  │   (producer 필터)    │     │   (producer 필터)     │        │
│  └─────────┬───────────┘     └──────────┬───────────┘        │
│            │                             │                    │
│            ▼                             ▼                    │
│  ┌──────────────────────────────────────────────────┐        │
│  │            Merged HUB Response                    │        │
│  │  - sourceDomain: 'cms' | 'signage-media' | ...   │        │
│  │  - producer: 'supplier'                           │        │
│  │  - Sorted by createdAt DESC                       │        │
│  └──────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Q1: 공급자 콘텐츠 구분 컬럼

### CMS (cms_contents)

| 컬럼 | 타입 | 공급자 값 | 서버 강제 |
|------|------|----------|:---------:|
| `authorRole` | VARCHAR(20) | `'supplier'` | YES |
| `visibilityScope` | VARCHAR(20) | `'service'` | YES |
| `serviceKey` | VARCHAR(50) | 서비스별 단일값 | YES (필수) |
| `status` | VARCHAR(20) | `'draft'` (초기) | YES |

- `authorRole`은 서버에서 강제 설정 (클라이언트 입력 무시)
- 공급자는 `POST /api/v1/cms/supplier/contents` 전용 엔드포인트 사용
- 생성 시 `status='draft'` 고정 → 관리자 승인 후 `'published'`

### Signage (signage_media, signage_playlists)

| 컬럼 | 타입 | 공급자 값 | 서버 강제 |
|------|------|----------|:---------:|
| `source` | VARCHAR(20) | `'supplier'` | YES |
| `scope` | VARCHAR(20) | `'global'` | YES |
| `serviceKey` | VARCHAR(50) | 서비스별 단일값 | YES (필수) |
| `organizationId` | UUID | `NULL` | YES |

- `source`는 확장 라우트에서 서버 강제 설정
- 공급자 콘텐츠는 seller extension (`/ext/seller/`) 경로로 생성
- 승인 워크플로우(approveContent) 통과 후 HUB 노출

---

## 3. Q2: HUB 필터링 조건

### CMS HUB 쿼리 (HubContentQueryService.queryCms)

**파일**: `apps/api-server/src/modules/hub-content/hub-content.service.ts`

```sql
WHERE serviceKey = $1
  AND status = 'published'
  AND visibilityScope IN ('platform', 'service')
  AND authorRole = 'supplier'          -- producer='supplier' 필터 시
```

| 조건 | 의미 |
|------|------|
| `serviceKey = $1` | 해당 서비스 콘텐츠만 |
| `status = 'published'` | 승인된 콘텐츠만 |
| `visibilityScope IN (...)` | organization 스코프 제외 |
| `authorRole = 'supplier'` | 공급자 콘텐츠만 (producer 필터) |

### Signage HUB 쿼리 (HubContentQueryService.querySignageMedia/Playlists)

```sql
WHERE m.serviceKey = $1
  AND m.status = 'active'
  AND m.scope = 'global'
  AND m.source = 'supplier'            -- producer='supplier' 필터 시
  AND m."deletedAt" IS NULL
```

| 조건 | 의미 |
|------|------|
| `serviceKey = $1` | 해당 서비스 콘텐츠만 |
| `status = 'active'` | 활성 콘텐츠만 |
| `scope = 'global'` | 전역 배포 콘텐츠만 |
| `source = 'supplier'` | 공급자 콘텐츠만 (producer 필터) |
| `deletedAt IS NULL` | 소프트 삭제 제외 |

### Producer ↔ Source/AuthorRole 매핑

| HUB Producer | CMS authorRole | Signage source |
|:------------:|:--------------:|:--------------:|
| `operator` | `['admin', 'service_admin']` | `'hq'` |
| `supplier` | `['supplier']` | `'supplier'` |
| `community` | `['community']` | `'community'` |

---

## 4. Q3: 복수 서비스 진열 가능 여부

### 판정: 불가 (1 row = 1 serviceKey)

**CMS**:
- `serviceKey`는 `VARCHAR(50)` 단일 컬럼
- 배열 아님, Junction 테이블 없음
- 하나의 CMS 콘텐츠는 하나의 serviceKey에만 속함

**Signage**:
- `serviceKey`는 `VARCHAR(50)` 단일 컬럼
- 배열 아님, Junction 테이블 없음
- 하나의 Signage 미디어/플레이리스트는 하나의 serviceKey에만 속함

### 복수 서비스 진열이 필요한 경우

현재 구조에서는 **별도 row를 생성**해야 한다:

| 방법 | 설명 | 현재 지원 |
|------|------|:---------:|
| 수동 복제 | 관리자가 각 serviceKey별로 별도 콘텐츠 생성 | YES |
| Asset Snapshot | `@o4o/asset-copy-core`를 통한 콘텐츠 복제 | YES (Signage) |
| Junction 테이블 | `cms_content_service_keys` 같은 매핑 테이블 | NO (미존재) |
| serviceKey 배열 | `serviceKey TEXT[]` 로 다중 서비스 지원 | NO (미존재) |

---

## 5. Q4: "전체 진열" 개념 존재 여부

### 판정: 구조적 불가

**CMS**:
- `visibilityScope = 'platform'`이 "전체 공개"에 해당하지만...
- HUB 쿼리는 `WHERE serviceKey = $1`로 필터 → `serviceKey`가 일치해야 함
- `serviceKey = NULL`인 콘텐츠는 `serviceKey = 'glycopharm'` 조건에 매치되지 않음
  (SQL: `NULL = 'glycopharm'` → `FALSE`)
- **따라서**: `visibilityScope='platform'`이라도 특정 serviceKey가 있어야 해당 서비스 HUB에 노출

**Signage**:
- `scope = 'global'`이 "전체 배포"에 해당하지만...
- HUB 쿼리는 `WHERE serviceKey = $1`로 필터
- **따라서**: 같은 제약 — serviceKey 일치 필수

### "전체 진열"을 달성하려면

| 시나리오 | 현재 가능 여부 | 방법 |
|---------|:------------:|------|
| serviceKey='glycopharm' 콘텐츠를 glycopharm HUB에 노출 | YES | 기본 동작 |
| 동일 콘텐츠를 kpa HUB에도 노출 | NO (직접) | serviceKey='kpa'로 별도 row 생성 |
| 모든 서비스 HUB에 일괄 노출 | NO | 각 serviceKey별 row 생성 필요 |

---

## 6. Q5: 서비스별 진열 설정 구조

### 판정: 단일 serviceKey, 매핑 테이블 없음

| 검색 대상 | 결과 |
|----------|------|
| `allowed_service_keys` 컬럼 | 없음 |
| `cms_content_services` junction 테이블 | 없음 |
| `signage_media_services` junction 테이블 | 없음 |
| `serviceKey TEXT[]` 배열 타입 | 없음 |
| `targetServices` JSONB 필드 | 없음 |

**현재 구조**: 콘텐츠 생성 시 `serviceKey`를 하나 지정. 변경하려면 PATCH로 serviceKey 수정(관리자만).

---

## 7. Distribution Model 분류

### Model A — Single ServiceKey Model (현재 구조)

```
┌─────────────────────────────────────────────────────────┐
│                Single ServiceKey Model                   │
│                                                         │
│  Content Row ──── serviceKey: 'glycopharm' ──── 1:1     │
│                                                         │
│  1 row = 1 serviceKey                                   │
│  복수 서비스 = 복수 row                                   │
│  전체 진열 = 불가 (각 서비스별 row 필요)                    │
│                                                         │
│  장점: 단순, 경계 명확, serviceKey 격리 보장               │
│  한계: 복수 서비스 진열 시 수동 복제 필요                    │
│  한계: "모든 서비스" 진열 메커니즘 없음                      │
└─────────────────────────────────────────────────────────┘
```

### 비교: 미사용 모델

| 모델 | 설명 | 현재 사용 |
|------|------|:---------:|
| **A. Single ServiceKey** | 1 row = 1 serviceKey | **YES** |
| B. Global Broadcast | serviceKey 무관, scope='global'이면 전체 | NO |
| C. Multi-Service Mapping | Junction 테이블로 복수 serviceKey | NO |

---

## 8. 실제 진열 조건 SQL 비교표

| 조건 | CMS (HUB) | Signage Media (HUB) | Signage Playlist (HUB) |
|------|-----------|--------------------|-----------------------|
| **serviceKey** | `= $1` (필수) | `= $1` (필수) | `= $1` (필수) |
| **status** | `= 'published'` | `= 'active'` | `= 'active'` |
| **visibility/scope** | `IN ('platform','service')` | `= 'global'` | `= 'global'` |
| **supplier 필터** | `authorRole = 'supplier'` | `source = 'supplier'` | `source = 'supplier'` |
| **deletedAt** | (TypeORM 자동) | `IS NULL` | `IS NULL` |
| **organizationId** | (implicit: NULL for platform) | (implicit: NULL for global) | (implicit: NULL for global) |

---

## 9. 구조적 한계 및 잠재 리스크

### L-1: 복수 서비스 진열 불가 (구조적 한계)

공급자가 동일 콘텐츠를 glycopharm과 cosmetics 두 서비스에 동시에 진열하려면
두 개의 독립적인 콘텐츠 row를 생성해야 한다.

| 영향 | 수준 |
|------|------|
| 현재 운영 | 낮음 (단일 서비스 중심) |
| 멀티서비스 확장 시 | 중간 (콘텐츠 중복 관리 부담) |

### L-2: "전체 공급자 콘텐츠" 조회 불가 (HUB 한계)

HUB는 serviceKey 기준으로만 쿼리하므로,
"모든 서비스에 걸친 공급자 콘텐츠 목록"을 한 번에 조회할 수 없다.
관리자 대시보드에서 전체 조회가 필요하면 별도 쿼리 필요.

| 영향 | 수준 |
|------|------|
| 현재 운영 | 없음 (서비스별 조회로 충분) |
| 통합 관리 도구 필요 시 | 낮음 (별도 admin 쿼리로 해결 가능) |

### L-3: visibilityScope='platform' 효과 제한

`visibilityScope='platform'`은 "플랫폼 전체 공개"를 의미하지만,
HUB 쿼리의 `serviceKey = $1` 조건 때문에 실질적으로 해당 serviceKey의 HUB에서만 노출된다.

| 영향 | 수준 |
|------|------|
| 현재 동작 | 의도된 동작 (serviceKey 격리 우선) |
| 오해 가능성 | 낮음 (문서화로 해결) |

### R-1: 공급자 콘텐츠 승인 없이 노출 불가 (의도된 설계)

공급자는 `status='draft'`로만 생성 가능. 관리자 승인 필수.
이는 보안 강점이지만, 운영 병목이 될 수 있다.

---

## 10. ContentQueryService vs HubContentQueryService 차이

| 항목 | ContentQueryService | HubContentQueryService |
|------|:-------------------:|:---------------------:|
| 용도 | 서비스 내부 콘텐츠 목록 | HUB 집계 표시 |
| serviceKey | `IN (serviceKeys[])` 배열 | `= serviceKey` 단일 |
| 다중 서비스 | YES (배열 전달) | NO (단일 키) |
| visibility 필터 | 선택적 | `IN ('platform','service')` 강제 |
| producer 필터 | 선택적 (`authorRole` param) | 선택적 (`producer` param) |

**주목**: `ContentQueryService`는 `serviceKeys: string[]` 배열을 받아 `IN()` 쿼리를 수행한다.
이는 내부 API에서 복수 서비스 콘텐츠를 조회할 수 있는 경로이지만,
HUB API에서는 단일 serviceKey만 사용한다.

---

## 11. 결론

### Distribution Model: **Single ServiceKey Model (Model A)**

O4O의 Broadcast Domain(CMS + Signage)은 **1 row = 1 serviceKey** 구조이다.

| 특성 | 현재 상태 |
|------|----------|
| 공급자 구분 | CMS: `authorRole`, Signage: `source` — 서버 강제 |
| HUB 필터 | `serviceKey` + `status` + `visibility/scope` + `producer` 4축 |
| 복수 서비스 진열 | 불가 (별도 row 생성 필요) |
| 전체 진열 | 불가 (serviceKey 일치 필수) |
| 서비스별 설정 | 단일 serviceKey 컬럼, 매핑 테이블 없음 |
| 승인 워크플로우 | 공급자 → draft → 관리자 승인 → published/active |

### 구조적 평가

**장점**:
- serviceKey 기반 경계가 명확 — Cross-service 콘텐츠 유출 불가
- Boundary Policy v1의 Guard Rule과 완전 일치
- 단순하고 예측 가능한 진열 동작

**한계**:
- 복수 서비스 진열에 콘텐츠 복제 필요 (Asset Snapshot 활용 가능)
- "전체 서비스" 일괄 진열 메커니즘 없음
- `visibilityScope='platform'`의 실질적 효과가 serviceKey 격리와 중첩

### 향후 확장 시 고려사항

멀티서비스 진열이 필요하면 다음 중 택 1:

| 옵션 | 복잡도 | 장점 | 단점 |
|------|:------:|------|------|
| **A. 현행 유지 + Snapshot** | 낮음 | 기존 구조 보존, 변경 없음 | 콘텐츠 중복 |
| **B. Junction 테이블 추가** | 중간 | 1 콘텐츠 = N 서비스 | CMS/Signage 모두 변경 필요 |
| **C. serviceKey 배열화** | 높음 | 유연함 | 모든 쿼리 변경, 인덱스 재설계 |

**현재 권고**: **옵션 A 유지**. 멀티서비스 요구가 실제로 발생할 때 옵션 B 검토.

---

*Generated: 2026-02-24*
*WO: WO-O4O-SUPPLIER-BROADCAST-DISTRIBUTION-INVESTIGATION-V1*
*Status: Investigation Complete — Read Only*
*Classification: Investigation Report*
