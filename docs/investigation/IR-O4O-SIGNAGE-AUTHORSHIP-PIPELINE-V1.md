# IR-O4O-SIGNAGE-AUTHORSHIP-PIPELINE-V1

> **Investigation Report: Signage Authorship Pipeline**
> WO-O4O-SIGNAGE-AUTHORSHIP-PIPELINE-INVESTIGATION-V1
> Date: 2026-02-23
> Status: Complete (Read-Only Investigation)

---

## 0. 목적

Signage 콘텐츠의 생성 → 저장 → HUB 노출 → 매장 복제까지의 전체 파이프라인을
코드 레벨에서 조사하고, source/scope 구조, 권한 체계, 서비스 격리 상태를 문서화한다.

---

## 1. 등록 경로 정리

### 1.1 라우트 등록 (main.ts)

| 경로 | 인증 | 용도 |
|------|------|------|
| `/api/signage/:serviceKey/public` | None | 공개 읽기 API |
| `/api/signage/:serviceKey` | Required | 인증된 CRUD API |

### 1.2 생성(POST) 엔드포인트

| 엔드포인트 | 미들웨어 | source 설정 | scope 설정 | serviceKey | organizationId |
|-----------|----------|------------|-----------|------------|----------------|
| `POST /playlists` | `requireSignageStore` | 미설정 (default: 'store') | 미설정 (default: 'store') | URL param | Header/Query |
| `POST /media` | `requireSignageStore` | 미설정 (default: 'store') | 미설정 (default: 'store') | URL param | Header/Query |
| `POST /schedules` | `requireSignageStore` | 미설정 (default: 'store') | 미설정 (default: 'store') | URL param | Header/Query |
| `POST /templates` | `requireSignageOperator` | 미설정 | 미설정 | URL param | NULL (global) |
| `POST /content-blocks` | `requireSignageOperator` | 미설정 | 미설정 | URL param | NULL (global) |
| `POST /layout-presets` | `requireSignageOperator` | 미설정 | 미설정 | URL param | NULL (global) |
| `POST /hq/playlists` | `requireSignageOperator` | **HARDCODED: 'hq'** | **HARDCODED: 'global'** | URL param | NULL |
| `POST /hq/media` | `requireSignageOperator` | **HARDCODED: 'hq'** | **HARDCODED: 'global'** | URL param | NULL |

### 1.3 Source 설정 방식

| 경로 | 방식 | 값 |
|------|------|-----|
| Store content | Response transformer default | `'store'` |
| HQ content (`/hq/*`) | Controller hardcode | `'hq'` |
| Supplier content | **경로 없음** | - |
| Community content | **경로 없음** | - |

**발견사항**: `supplier`, `community` source로 생성하는 API 경로가 없다.
Entity에 enum으로 정의되어 있지만, 실제 생성 경로는 `hq`와 `store`만 존재.

---

## 2. Entity source/scope 구조

### 2.1 source 필드 현황

| Entity | source 필드 | 유효값 | 기본값 | nullable |
|--------|-----------|--------|--------|----------|
| SignageMedia | `source` varchar(20) | `'hq' \| 'supplier' \| 'community' \| 'store'` | `'store'` | No |
| SignagePlaylist | `source` varchar(20) | `'hq' \| 'supplier' \| 'community' \| 'store'` | `'store'` | No |
| SignagePlaylistItem | `sourceType` varchar(30) | `'platform' \| 'hq' \| 'supplier' \| 'store' \| 'operator_ad'` | `'store'` | No |
| SignageSchedule | 없음 | - | - | - |
| SignageTemplate | 없음 | - | - | - |
| SignageContentBlock | 없음 | - | - | - |
| SignageLayoutPreset | 없음 | - | - | - |

### 2.2 scope 필드 현황

| Entity | scope 필드 | 유효값 | 기본값 | nullable |
|--------|-----------|--------|--------|----------|
| SignageMedia | `scope` varchar(20) | `'global' \| 'store'` | `'store'` | No |
| SignagePlaylist | `scope` varchar(20) | `'global' \| 'store'` | `'store'` | No |
| 나머지 Entity | 없음 | - | - | - |

### 2.3 serviceKey / organizationId 현황

| Entity | serviceKey | organizationId |
|--------|-----------|----------------|
| SignageMedia | varchar(50), Required, Indexed | uuid, nullable, Indexed |
| SignagePlaylist | varchar(50), Required, Indexed | uuid, nullable, Indexed |
| SignageSchedule | varchar(50), Required, Indexed | uuid, nullable, Indexed |
| SignageTemplate | varchar(50), Required, Indexed | uuid, nullable, Indexed |
| SignageContentBlock | varchar(50), Required, Indexed | uuid, nullable, Indexed |
| SignageLayoutPreset | varchar(50), **nullable** | 없음 |
| SignagePlaylistItem | 없음 (FK로 상속) | 없음 (FK로 상속) |

### 2.4 authorRole 필드

**존재하지 않는다.** 모든 Entity에 `authorRole` 필드 없음.
인가(Authorization)는 서비스 레이어(미들웨어)에서 처리.

### 2.5 CMS 비교

| 속성 | CMS (cms_contents) | Signage (signage_media/playlists) |
|------|-------------------|-----------------------------------|
| source | `author_role` (hq, supplier, community) | `source` (hq, supplier, community, store) |
| scope | `visibility_scope` (global, service, store) | `scope` (global, store) |
| serviceKey | `service_key` | `serviceKey` |
| 중간값 | - | **'service' scope 없음** |
| 격리 방식 | WHERE service_key = ? | WHERE serviceKey = ? |

---

## 3. 권한 Guard 구조

### 3.1 미들웨어 계층

| 미들웨어 | 역할 | 검증 | 설정값 |
|----------|------|------|--------|
| `validateServiceKey` | serviceKey 유효성 | 허용 목록 검사 | - |
| `requireSignageStore` | 매장 CRUD | organizationId 필수, 사용자 접근 검사 | `signageContext.role = 'store'` |
| `requireSignageOperator` | HQ/운영자 관리 | `signage:{serviceKey}:operator` 권한 | `signageContext.role = 'operator'` |
| `requireSignageOperatorOrStore` | 공유 읽기/쓰기 | operator 우선 → store fallback | 역할별 context |
| `allowSignageStoreRead` | 읽기 전용 | 인증 + org context (관대한 검증) | - |

### 3.2 허용된 serviceKey 목록

```
pharmacy, cosmetics, tourism, common, kpa-society, neture, glycopharm
```

### 3.3 역할별 접근 매트릭스

| 작업 | Store (매장) | Operator (운영자) | Supplier | Community |
|------|-------------|------------------|----------|-----------|
| 매장 Playlist/Media CRUD | O | X (별도 경로) | X | X |
| HQ Playlist/Media 생성 | X | O | **X (경로 없음)** | **X (경로 없음)** |
| Template/Block/Preset 관리 | X | O | X | X |
| 공개 읽기 | O | O | O | O |

**발견사항**: Supplier와 Community의 생성 경로가 존재하지 않는다.
Entity에서는 `supplier`, `community` source를 지원하지만, 실제 API에서 이 값을 설정하는 경로가 없다.

---

## 4. HUB 조회 쿼리 분석

### 4.1 HUB 페이지 구조

HUB 페이지(GlycoPharm, KPA, K-Cosmetics)는 `HubExplorationLayout` 사용.
**Signage 전용 섹션 없음** — Core Services 배너에서 별도 페이지로 링크.

| 서비스 | Signage 배너 | 링크 대상 |
|--------|-------------|----------|
| GlycoPharm | "디지털 사이니지" | `/pharmacy/signage` |
| KPA Society | "플랫폼 사이니지" | `/hub/signage` |
| K-Cosmetics | "디지털 사이니지" | 배지: "준비중" (링크 없음) |

### 4.2 Signage Library 페이지 (HubSignageLibraryPage)

**경로**: `/hub/signage` (KPA Society)

**API 호출**:

```
GET /api/signage/kpa-society/public/media?page=1&limit=20
GET /api/signage/kpa-society/public/playlists?page=1&limit=20
```

**필터 적용 현황**:

| 필터 | 적용 | 방식 | 위치 |
|------|------|------|------|
| serviceKey | O | URL path 파라미터 (hardcoded) | Backend |
| source | O | 클라이언트 사이드 필터 (hq/supplier/community) | Frontend |
| scope | **X** | 미적용 | - |
| authorRole | **X** | 미적용 (필드 없음) | - |
| status | O | `status = 'active'` | Backend |

**Backend Public API 쿼리** (signage-public.routes.ts):

```sql
WHERE m."serviceKey" = $1
AND source IN ('hq', 'supplier', 'community')
AND m.status = 'active'
ORDER BY m."createdAt" DESC
```

**발견사항**: Public API는 source IN ('hq', 'supplier', 'community')로 고정.
`'store'` source는 공개 API에서 제외됨 (의도적 설계).

### 4.3 SignageQueryService (미사용)

```typescript
// signage-query.service.ts
export interface SignageQueryConfig {
  serviceKey: string;
  sources?: string[];  // default: ['hq', 'store']
}
```

`listForHome()` 메서드가 존재하지만, **어떤 HUB/Home 페이지에서도 호출되지 않음**.
이 서비스는 현재 사실상 dead code.

---

## 5. 서비스 격리 판정

### 5.1 기대 격리 모델 vs 실제

| 제작자 | 기대 source | 기대 scope | 기대 노출 | **실제 상태** |
|--------|-----------|-----------|----------|-------------|
| Operator(admin) | hq | global | 해당 서비스 HUB | **O** — `/hq/*` 경로로 생성, serviceKey 격리 |
| Supplier | supplier | global | 모든 서비스 HUB | **X** — 생성 경로 없음 |
| Community | community | global | 모든 서비스 HUB | **X** — 생성 경로 없음 |
| Store | store | store | 해당 매장 | **O** — 일반 CRUD, orgId 격리 |

### 5.2 serviceKey 격리

- **Backend**: 모든 쿼리에 `serviceKey` 필터 적용 → **격리 정상**
- **Frontend**: serviceKey가 하드코딩 → **격리 정상**
- **교차 서비스 노출**: 불가능 (serviceKey 필터가 항상 적용)

### 5.3 organizationId 격리

- **Store 콘텐츠**: organizationId 필수 → **격리 정상**
- **HQ 콘텐츠**: organizationId = NULL → 서비스 내 전역 → **의도적 설계**
- **교차 조직 접근**: 미들웨어에서 차단 → **격리 정상**

### 5.4 격리 판정 결론

```
serviceKey 격리: ✅ 정상 (모든 쿼리에 적용)
organizationId 격리: ✅ 정상 (Store 레벨)
source 격리: ⚠️ 부분적 (supplier/community 생성 불가)
scope 격리: ⚠️ 미활용 ('service' 레벨 없음)
```

---

## 6. CMS Visibility 모델과의 정렬 분석

### 6.1 CMS 모델 (IR-HUB-CONTENT-AUTHORSHIP-STRUCTURE-V1 기준)

```
author_role: 'hq' | 'supplier' | 'community'
visibility_scope: 'global' | 'service' | 'store'
service_key: string
```

### 6.2 Signage 모델 (현재)

```
source: 'hq' | 'supplier' | 'community' | 'store'
scope: 'global' | 'store'
serviceKey: string
```

### 6.3 차이점

| 항목 | CMS | Signage | 정렬 가능성 |
|------|-----|---------|-----------|
| 제작자 구분 필드명 | `author_role` | `source` | 의미 동일, 이름 상이 |
| 제작자 값 | hq/supplier/community | hq/supplier/community/**store** | Signage에 `store` 추가 (합리적) |
| 가시성 필드명 | `visibility_scope` | `scope` | 의미 동일, 이름 상이 |
| 가시성 값 | global/service/store | global/store | **Signage에 'service' 없음** |
| serviceKey | `service_key` | `serviceKey` | 컬럼명 컨벤션 차이 (snake vs camel) |

### 6.4 정렬 전략 (조사 결론)

통합이 필요한 경우:
1. **필드명 정규화**: `source` ↔ `author_role` → 하나로 통일 (breaking change)
2. **scope 확장**: Signage에 `'service'` scope 추가 (마이그레이션 필요)
3. **또는 현 구조 유지**: 각 도메인의 맥락이 다르므로 별도 유지도 합리적

---

## 7. 구조적 취약점 목록

### 7.1 Supplier/Community 생성 경로 부재 (Critical)

**현상**: Entity에 `supplier`, `community` source enum 정의됨.
Public API에서 이 값으로 필터링도 됨.
하지만 **이 값으로 데이터를 생성하는 API 경로가 없음**.

**영향**: HUB Signage Library에서 source 필터 UI가 있지만,
`supplier`/`community` 탭은 항상 빈 결과.

**판정**: 기능 미완성 (Phase 2 확장 대상)

### 7.2 scope 필드 미활용 (Medium)

**현상**: `scope` 필드가 Entity에 존재하고, `'global' | 'store'` 값을 가짐.
하지만 **Public API 쿼리에서 scope 필터를 사용하지 않음**.
source IN ('hq', 'supplier', 'community')로만 필터링.

**영향**: scope='store'인 콘텐츠도 source='hq'이면 공개 API에 노출 가능 (이론적).
실제로는 HQ 콘텐츠가 항상 scope='global'로 hardcode되므로 현재는 안전.

**판정**: 방어적 필터 추가 권장 (`AND scope = 'global'`)

### 7.3 SignageQueryService 미사용 (Low)

**현상**: `listForHome()` 메서드가 구현되어 있으나 어떤 페이지에서도 호출되지 않음.

**영향**: Dead code. Home 페이지에 Signage 프리뷰를 넣으려면 이 서비스 활용 가능.

**판정**: 향후 활용 또는 제거 결정 필요

### 7.4 Update 시 source/scope 변경 가능 (Medium)

**현상**: PATCH 엔드포인트에서 source/scope가 DTO passthrough.
즉, 업데이트 요청에 `source: 'hq'`를 넣으면 Store 콘텐츠도 HQ로 변경 가능.

**영향**: 권한이 있는 사용자가 의도적/실수로 source를 변경 가능.

**판정**: Update DTO에서 source/scope를 immutable로 처리하거나, 변경 시 권한 검증 추가 권장

### 7.5 PlaylistItem.sourceType과 Media/Playlist.source 불일치 (Low)

**현상**: PlaylistItem은 `sourceType` (5종: platform/hq/supplier/store/operator_ad)
Media/Playlist는 `source` (4종: hq/supplier/community/store)
`platform`과 `operator_ad`는 Media/Playlist에 없고, `community`는 PlaylistItem에 없음.

**영향**: 매핑 시 혼란 가능. 현재는 PlaylistItem.sourceType이 거의 사용되지 않으므로 실질적 문제 없음.

**판정**: 향후 통합 시 정리 필요

---

## 8. 전체 파이프라인 다이어그램

```
                          ┌──────────────────────────┐
                          │   Signage 생성           │
                          └──────────┬───────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              Store CRUD        HQ CRUD         Supplier/Community
              requireStore    requireOperator    (경로 없음 ⚠️)
              source='store'  source='hq'
              scope='store'   scope='global'
              orgId=필수      orgId=NULL
                    │                │
                    ▼                ▼
              ┌──────────────────────────────────┐
              │     signage_media / playlists     │
              │   serviceKey + source + scope    │
              └──────────┬───────────────────────┘
                         │
              ┌──────────┼──────────────┐
              ▼                         ▼
        Public API                Store API
        source IN (hq,            orgId 필터
        supplier, community)      source = 'store'
        serviceKey 필터
              │                         │
              ▼                         ▼
        HUB Signage Library       Store Signage Page
        /hub/signage              /store/signage
        (읽기 전용)              (매장 관리)
              │
              ▼
        "내 매장에 추가"
        assetSnapshotApi.copy()
              │
              ▼
        Store Asset Snapshots
        (복제된 콘텐츠)
```

---

## 9. 완료 기준 체크

| 기준 | 상태 |
|------|------|
| Signage 생성부터 HUB 노출까지 전체 흐름 문서화 | ✅ |
| source/scope 실제 값 명확화 | ✅ |
| 권한 guard 구조 명확화 | ✅ |
| 격리 가능 여부 판정 | ✅ |
| 수정 필요 포인트 목록화 | ✅ (7개 항목) |
| CMS Visibility 모델과의 정렬 분석 | ✅ |

---

## 10. 다음 단계 권장 사항

1. **격리 버그 수정**: Public API에 `scope = 'global'` 방어 필터 추가
2. **HUB 탭 분리**: 의미 없는 supplier/community 필터 UI 제거 또는 숨김
3. **CMS/Signage 정렬 설계**: source/scope 필드명 통일 여부 결정
4. **Update immutability**: source/scope 변경 방지 로직 추가
5. **Supplier 생성 경로**: 필요 시 supplier용 API 경로 설계

---

*Investigation completed: 2026-02-23*
*Author: Claude Code*
*Status: Read-Only Investigation Complete*
