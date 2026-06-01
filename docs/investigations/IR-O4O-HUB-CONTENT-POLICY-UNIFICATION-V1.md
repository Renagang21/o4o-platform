# IR-O4O-HUB-CONTENT-POLICY-UNIFICATION-V1

**Investigation Report: HUB Content Policy Unification**
**Date**: 2026-02-23
**Status**: Design Complete
**WO**: WO-O4O-HUB-CONTENT-POLICY-UNIFICATION-DESIGN-V1

---

## 1. Executive Summary

HUB에서 노출되는 콘텐츠(CMS, Signage)를 **제작 주체(Producer) + 가시성(Visibility) + 서비스 격리(ServiceKey)** 3축 기준으로 통합 정책화한다.

현재 CMS와 Signage는 동일한 개념을 다른 필드명으로 표현하고 있으며, HUB는 이를 각각 별도 기준으로 조회한다. 본 설계는 도메인 필드를 변경하지 않고, HUB 레벨에서 매핑하여 통합 노출 정책을 확정한다.

---

## 2. 현재 상태 분석

### 2.1 CMS 모델 (`cms_contents` 테이블)

| 필드 | 타입 | 값 | 의미 |
|------|------|-----|------|
| `authorRole` | varchar(20) | `admin`, `service_admin`, `supplier`, `community` | 제작 주체 |
| `visibilityScope` | varchar(20) | `platform`, `service`, `organization` | 가시성 범위 |
| `serviceKey` | varchar(50) | nullable | 서비스 격리 |
| `organizationId` | uuid | nullable | 조직 격리 |
| `status` | varchar(20) | `draft`, `published`, `archived` | 게시 상태 |
| `createdBy` | uuid | nullable | 작성자 |

**CMS 스코프 로직:**
- `platform`: `organizationId=null, serviceKey=null` → 전 서비스 노출
- `service`: `organizationId=null, serviceKey='glycopharm'` → 해당 서비스만
- `organization`: `organizationId='uuid'` → 해당 조직만

**CMS 기본값:**
- admin → `authorRole='admin'`, `visibilityScope='platform'`
- service_admin → `authorRole='service_admin'`, `visibilityScope='service'`
- supplier → `authorRole='supplier'`, `visibilityScope='service'`, `status='draft'`

### 2.2 Signage 모델 (`signage_media` / `signage_playlists` 테이블)

| 필드 | 타입 | 값 | 의미 |
|------|------|-----|------|
| `source` | varchar(20) | `hq`, `supplier`, `community`, `store` | 제작 주체 |
| `scope` | varchar(20) | `global`, `store` | 가시성 범위 |
| `serviceKey` | varchar(50) | not null | 서비스 격리 |
| `organizationId` | uuid | nullable | 조직 격리 |
| `status` | varchar(20) | `active`, `inactive`, `draft`/`processing` | 게시 상태 |
| `createdByUserId` | uuid | nullable | 작성자 |
| `isPublic` | boolean | (playlists only) | 공개 여부 |

**Signage 스코프 로직:**
- `global`: HUB/Public에 노출 (source: hq/supplier/community)
- `store`: 매장 전용 (source: store)

### 2.3 현재 HUB 프론트엔드 구현

| 페이지 | 위치 | 탭 구조 |
|--------|------|---------|
| `HubSignageLibraryPage` | `web-kpa-society` | 뷰(media/playlist) × 소스(all/hq/supplier/community) |
| `ContentHubPage` | `web-kpa-society` | 플레이리스트/미디어 각각 소스 탭 (community/hq/supplier) |

**현재 필터링 방식:**
- Public API로 전체 조회 후 **클라이언트 사이드** source 필터링
- Backend `findGlobalPlaylists/findGlobalMedia`에서 `scope='global'` 하드 필터

---

## 3. 필드 매핑 분석

### 3.1 제작 주체 (Producer) 매핑

| HUB Producer | CMS `authorRole` | Signage `source` | 설명 |
|:---:|:---:|:---:|------|
| `operator` | `admin`, `service_admin` | `hq` | 운영 주체 (본부) |
| `supplier` | `supplier` | `supplier` | 공급자/파트너 |
| `community` | `community` | `community` | 커뮤니티 기여 |
| `store` | *(organization scope)* | `store` | 개별 매장 |

**주의:** CMS의 `admin`과 `service_admin`은 Signage의 `hq`에 1:N 매핑된다.

### 3.2 가시성 (Visibility) 매핑

| HUB Visibility | CMS `visibilityScope` | Signage `scope` | 설명 |
|:---:|:---:|:---:|------|
| `global` | `platform` | `global` | 전 서비스/전 매장 |
| `service` | `service` | *(미지원)* | 서비스 내부만 |
| `store` | `organization` | `store` | 특정 매장만 |

**격차:** Signage에는 `service` scope가 없다. 현재는 `serviceKey` 필터가 이 역할을 대신한다.

### 3.3 상태 (Status) 매핑

| HUB 상태 | CMS `status` | Signage `status` |
|:---:|:---:|:---:|
| 활성 | `published` | `active` |
| 비활성 | `draft`, `archived` | `inactive`, `draft` |

---

## 4. 통합 정책 설계

### 4.1 HUB 추상 모델

HUB는 도메인 구현(CMS/Signage)에 무관하게 다음 3축으로 노출을 판단한다:

```
┌──────────────────────────────────────────┐
│          HUB Content Policy              │
│                                          │
│  Axis 1: Producer                        │
│    operator | supplier | community       │
│                                          │
│  Axis 2: Visibility                      │
│    global | service | store              │
│                                          │
│  Axis 3: Service Scope                   │
│    WHERE serviceKey = currentService     │
│                                          │
│  + Status: active/published only         │
└──────────────────────────────────────────┘
```

### 4.2 통합 응답 인터페이스

```typescript
interface HubContentItem {
  id: string;
  type: 'cms' | 'signage-media' | 'signage-playlist';
  producer: 'operator' | 'supplier' | 'community' | 'store';
  visibility: 'global' | 'service' | 'store';
  serviceKey: string;
  title: string;
  description?: string;
  thumbnail?: string;
  mediaType?: string;
  createdAt: string;
  creatorName?: string;
}
```

### 4.3 매핑 함수 (의사 코드)

```typescript
// CMS → HubContentItem
function mapCmsToHub(cms: CmsContent): HubContentItem {
  return {
    id: cms.id,
    type: 'cms',
    producer: cms.authorRole === 'admin' || cms.authorRole === 'service_admin'
      ? 'operator' : cms.authorRole,
    visibility: cms.visibilityScope === 'platform' ? 'global'
      : cms.visibilityScope === 'organization' ? 'store'
      : 'service',
    serviceKey: cms.serviceKey,
    title: cms.title,
    description: cms.summary,
    thumbnail: cms.imageUrl,
    createdAt: cms.createdAt,
  };
}

// Signage → HubContentItem
function mapSignageToHub(item: SignageMedia | SignagePlaylist): HubContentItem {
  return {
    id: item.id,
    type: item is media ? 'signage-media' : 'signage-playlist',
    producer: item.source === 'hq' ? 'operator' : item.source,
    visibility: item.scope,
    serviceKey: item.serviceKey,
    title: item.name,
    description: item.description,
    thumbnail: item.thumbnailUrl,
    createdAt: item.createdAt,
  };
}
```

---

## 5. HUB 탭 정책

### 5.1 탭 구성

```
┌────────┬────────┬────────┬──────────┐
│  전체   │ 운영자  │ 공급자  │ 커뮤니티  │
└────────┴────────┴────────┴──────────┘
```

### 5.2 탭별 쿼리 조건

| 탭 | Producer 필터 | Visibility 필터 | ServiceKey |
|:---:|:---:|:---:|:---:|
| **전체** | `operator, supplier, community` | `global` | `= current` |
| **운영자** | `operator` | `global, service` | `= current` |
| **공급자** | `supplier` | `global` | `= current` |
| **커뮤니티** | `community` | `global` | `= current` |

### 5.3 탭별 실제 쿼리 변환

#### 전체 탭

| 도메인 | WHERE 조건 |
|--------|-----------|
| CMS | `serviceKey = $1 AND visibilityScope IN ('platform','service') AND authorRole IN ('admin','service_admin','supplier','community') AND status = 'published'` |
| Signage | `"serviceKey" = $1 AND scope = 'global' AND source IN ('hq','supplier','community') AND status = 'active'` |

#### 운영자 탭

| 도메인 | WHERE 조건 |
|--------|-----------|
| CMS | `serviceKey = $1 AND visibilityScope IN ('platform','service') AND authorRole IN ('admin','service_admin') AND status = 'published'` |
| Signage | `"serviceKey" = $1 AND scope = 'global' AND source = 'hq' AND status = 'active'` |

#### 공급자 탭

| 도메인 | WHERE 조건 |
|--------|-----------|
| CMS | `serviceKey = $1 AND visibilityScope IN ('platform','service') AND authorRole = 'supplier' AND status = 'published'` |
| Signage | `"serviceKey" = $1 AND scope = 'global' AND source = 'supplier' AND status = 'active'` |

#### 커뮤니티 탭

| 도메인 | WHERE 조건 |
|--------|-----------|
| CMS | `serviceKey = $1 AND visibilityScope IN ('platform','service') AND authorRole = 'community' AND status = 'published'` |
| Signage | `"serviceKey" = $1 AND scope = 'global' AND source = 'community' AND status = 'active'` |

---

## 6. 정책 결정 사항

### A. Signage에 `service` scope 도입 여부

| 선택지 | 장점 | 단점 |
|--------|------|------|
| **1. 도입 안 함 (권장)** | 마이그레이션 불필요, 현재 `serviceKey` 필터가 동일 역할 | CMS와 완전 대칭 아님 |
| 2. `scope='service'` 추가 | 완전 대칭 | DB 마이그레이션, 기존 데이터 변환 필요 |

**결정: 1번 (도입 안 함)**. Signage의 `serviceKey` 필터가 이미 service scope 역할을 수행. HUB 매핑 레벨에서 흡수.

### B. 도메인 필드명 통일 여부

| 선택지 | 장점 | 단점 |
|--------|------|------|
| **1. HUB 매핑만 (권장)** | Breaking change 없음, 즉시 적용 | 내부 불일치 유지 |
| 2. 전체 통일 | 코드 일관성 | CMS Core 동결 위반, 대규모 마이그레이션 |

**결정: 1번 (HUB 매핑만)**. CMS Core는 CLAUDE.md §5에 의해 동결 상태.

### C. Store 탭 포함 여부

| 선택지 | 설명 |
|--------|------|
| **포함하지 않음 (권장)** | Store 콘텐츠는 매장 대시보드에서만 관리. HUB는 global 콘텐츠 허브. |
| 포함 | HUB에서 모든 콘텐츠 브라우징 가능 |

**결정: 포함하지 않음**. HUB는 `scope=global` 콘텐츠만 노출.

---

## 7. 데이터베이스 인덱스 현황

### CMS

```sql
CREATE INDEX IDX_cms_contents_service_visibility_author_status
  ON cms_contents ("serviceKey", "visibilityScope", "authorRole", "status");
```

### Signage

```sql
CREATE INDEX IDX_signage_media_source ON signage_media (source);
CREATE INDEX IDX_signage_media_scope ON signage_media (scope);
CREATE INDEX IDX_signage_media_serviceKey ON signage_media ("serviceKey");
CREATE INDEX IDX_signage_playlists_source ON signage_playlists (source);
CREATE INDEX IDX_signage_playlists_scope ON signage_playlists (scope);
CREATE INDEX IDX_signage_playlists_serviceKey ON signage_playlists ("serviceKey");
```

**평가:** 양쪽 모두 탭 쿼리에 필요한 인덱스가 이미 존재. 추가 인덱스 불필요.

---

## 8. 현재 HUB 프론트엔드 현황

### 기존 구현 (web-kpa-society)

| 컴포넌트 | 탭 구조 | 데이터 소스 | 필터링 방식 |
|----------|---------|-----------|------------|
| `HubSignageLibraryPage` | media/playlist × all/hq/supplier/community | Public API | **클라이언트 사이드** |
| `ContentHubPage` | playlist/media 각각 source 탭 | Public API | **클라이언트 사이드** |

**문제점:**
1. CMS 콘텐츠 미포함 (Signage만 표시)
2. 소스 필터링이 클라이언트 사이드 (비효율)
3. 통합 뷰 없음 (CMS + Signage 혼합 불가)
4. 탭 정책이 명시적으로 정의되지 않음

### 통합 후 목표

| 개선 항목 | 현재 | 목표 |
|----------|------|------|
| 콘텐츠 범위 | Signage만 | CMS + Signage |
| 필터링 | 클라이언트 사이드 | 서버 사이드 (source param) |
| 탭 정책 | 비정형 | 3축 기준 (Producer × Visibility × ServiceKey) |
| 매핑 | 없음 | `HubContentItem` 통합 인터페이스 |

---

## 9. 구현 경로 (향후 WO 범위)

### Phase 1: HUB 탭 구현

```
WO-O4O-HUB-CONTENT-TABS-IMPLEMENTATION-PHASE1-V1
```

범위:
1. Backend: HUB 통합 조회 API (`/api/v1/hub/:serviceKey/content`)
2. Backend: CMS + Signage 매핑 로직
3. Frontend: 통합 탭 UI (전체/운영자/공급자/커뮤니티)
4. Frontend: `HubContentItem` 카드 컴포넌트

### Phase 2: 고급 기능

- 정렬 (최신순, 인기순)
- 검색
- 카테고리 필터
- 미디어 타입 필터
- Asset Snapshot 통합 (내 매장에 추가)

---

## 10. 최종 정책 선언

> **HUB는 도메인 구현(CMS/Signage)과 무관하게,
> "Producer + Visibility + ServiceKey" 3축 기준으로만 콘텐츠를 노출한다.**

이 원칙은 플랫폼 정책으로 확정되며, 향후 신규 콘텐츠 도메인(LMS, Extension 등) 추가 시에도 동일하게 적용한다.

---

## 부록: 필드 매핑 Quick Reference

```
┌─────────────────────────────────────────────────────────┐
│                    HUB → Domain 매핑                     │
├──────────────┬──────────────────┬────────────────────────┤
│ HUB          │ CMS              │ Signage                │
├──────────────┼──────────────────┼────────────────────────┤
│ producer     │ authorRole       │ source                 │
│  operator    │  admin,          │  hq                    │
│              │  service_admin   │                        │
│  supplier    │  supplier        │  supplier              │
│  community   │  community       │  community             │
│  store       │  (org scope)     │  store                 │
├──────────────┼──────────────────┼────────────────────────┤
│ visibility   │ visibilityScope  │ scope                  │
│  global      │  platform        │  global                │
│  service     │  service         │  (serviceKey filter)   │
│  store       │  organization    │  store                 │
├──────────────┼──────────────────┼────────────────────────┤
│ serviceKey   │ serviceKey       │ serviceKey             │
├──────────────┼──────────────────┼────────────────────────┤
│ active       │ status=published │ status=active          │
└──────────────┴──────────────────┴────────────────────────┘
```

---

*Generated: 2026-02-23*
*Author: Claude Opus 4.6*
*WO: WO-O4O-HUB-CONTENT-POLICY-UNIFICATION-DESIGN-V1*
