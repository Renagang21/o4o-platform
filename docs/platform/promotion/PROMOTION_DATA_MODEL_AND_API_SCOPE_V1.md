# PROMOTION_DATA_MODEL_AND_API_SCOPE_V1

> Core 엔진 데이터 모델과 API 범위 정의

---

## 1. 문서 목적

프로모션/안내 Core 엔진에서 사용할 **데이터 모델 재사용 범위**와
**API 엔드포인트 범위**를 정의한다. 백엔드 구현 WO의 기준 문서.

---

## 2. 데이터 모델

### 2.1 CmsContent 재사용 범위

**위치:** `packages/cms-core/src/entities/CmsContent.entity.ts`

프로모션 콘텐츠는 **기존 CmsContent 엔티티를 그대로 사용**한다.

| 필드 | 용도 | 프로모션 활용 |
|------|------|-------------|
| `id` | PK | 그대로 사용 |
| `organizationId` | 조직 격리 | KPA 인트라넷 조직별 콘텐츠 |
| `serviceKey` | 서비스 격리 | `neture`, `glycopharm`, `kpa`, `k-cosmetics` |
| `type` | 콘텐츠 유형 | `hero`, `promo`, `event`, `notice`, `featured` |
| `title` | 제목 | 그대로 사용 |
| `summary` | 부제/설명 | 그대로 사용 |
| `body` | 본문 | 대부분 미사용 (프로모션은 짧은 콘텐츠) |
| `imageUrl` | 대표 이미지 | Hero 배경, 광고 썸네일, 로고 |
| `linkUrl` | 클릭 대상 | CTA 링크, 외부 링크 |
| `linkText` | 버튼 텍스트 | "자세히 보기", "참여하기" 등 |
| `status` | 상태 | `draft` → `published` → `archived` |
| `publishedAt` | 게시일 | 그대로 사용 |
| `expiresAt` | 만료일 | 자동 비공개 |
| `sortOrder` | 정렬 | 같은 슬롯 내 순서 |
| `isPinned` | 고정 | 우선 표시 |
| `metadata` | 확장 데이터 | **핵심 — 서비스별 추가 필드 저장** |
| `authorRole` | 작성자 역할 | `admin`, `service_admin` |
| `visibilityScope` | 노출 범위 | `platform`, `service`, `organization` |

### 2.2 metadata 활용 규칙

`metadata` (JSONB)에 프로모션 유형별 추가 데이터를 저장한다.

```typescript
// Hero 슬라이드
metadata: {
  backgroundColor?: string;  // 그라데이션 색상
  gradient?: string;          // CSS gradient 문자열
}

// 파트너/로고
metadata: {
  logoUrl?: string;           // imageUrl과 별도 로고 (Neture 패턴)
}

// PromoCard (KPA)
metadata: {
  promoType?: 'ad' | 'course' | 'survey' | 'announcement';
}

// Now Running (K-Cos)
metadata: {
  runningType?: 'trial' | 'event' | 'campaign' | 'product';
  supplier?: string;
  deadline?: string;
  participants?: number;
}
```

### 2.3 CmsContentSlot 재사용 범위

**위치:** `packages/cms-core/src/entities/CmsContentSlot.entity.ts`

프로모션 배치는 **기존 CmsContentSlot 엔티티를 그대로 사용**한다.

| 필드 | 용도 | 프로모션 활용 |
|------|------|-------------|
| `id` | PK | 그대로 사용 |
| `slotKey` | 배치 위치 | 슬롯 카탈로그(문서 2) 기준 |
| `serviceKey` | 서비스 격리 | 필수 |
| `organizationId` | 조직 격리 | KPA 인트라넷 전용 |
| `contentId` | CmsContent FK | 1:1 |
| `sortOrder` | 슬롯 내 순서 | Hero 슬라이드 순서 등 |
| `isActive` | 활성 여부 | 즉시 ON/OFF |
| `startsAt` | 노출 시작 | 기간 프로모션 |
| `endsAt` | 노출 종료 | 기간 프로모션 |
| `isLocked` | 잠금 | 계약/정책 보호 |
| `lockedBy` | 잠금 주체 | `platform`, `contract` |
| `lockedReason` | 잠금 사유 | UI 표시용 |
| `lockedUntil` | 잠금 만료 | 계약 종료일 |

### 2.4 필요한 확장 필드 후보

**Phase 1에서는 기존 필드만으로 충분.** 아래는 Phase 2 검토 대상.

| 후보 필드 | 대상 엔티티 | 용도 | Phase |
|----------|-----------|------|:-----:|
| `viewCount` | CmsContentSlot | 슬롯별 노출 횟수 | 2 |
| `clickCount` | CmsContentSlot | 슬롯별 클릭 횟수 | 2 |
| `targetAudience` | CmsContentSlot | 노출 대상 (역할/권한 기반) | 2+ |

### 2.5 community_ads / community_sponsors 관계

**Phase 1: 병행 유지**

| 테이블 | 위치 | 관계 |
|--------|------|------|
| `community_ads` | 마이그레이션 `1771200000015` | Community Hub 전용. CmsContentSlot과 독립 |
| `community_sponsors` | 마이그레이션 `1771200000015` | Community Hub 전용. CmsContentSlot과 독립 |

- Community Hub의 기존 API는 그대로 유지
- 새로 추가하는 슬롯(`home-hero`, `dashboard-banner` 등)만 CmsContentSlot 사용
- Phase 2에서 community_ads → CmsContentSlot 마이그레이션 검토

---

## 3. API 범위

### 3.1 공개 조회 API (인증 불필요)

**기존 API:** `GET /cms/slots/:slotKey`

이미 구현되어 있으며, 프로모션 공개 조회에 그대로 사용.

```
GET /cms/slots/:slotKey?serviceKey={sk}&organizationId={orgId}&activeOnly=true

Response:
{
  success: true,
  data: [
    {
      id, slotKey, sortOrder, isActive, startsAt, endsAt,
      content: { id, type, title, summary, imageUrl, linkUrl, linkText, metadata }
    }
  ],
  meta: { slotKey, serviceKey, total }
}
```

**프론트엔드 사용 패턴:**
```typescript
// useSlotContent('home-hero', { serviceKey: 'k-cosmetics' })
// → GET /cms/slots/home-hero?serviceKey=k-cosmetics&activeOnly=true
```

### 3.2 운영 CRUD API (인증 필요)

**기존 API:** `POST/PUT/DELETE /cms/slots` + `PUT /cms/slots/:slotKey/contents`

현재 `requireAdmin` 미들웨어 사용. Phase 1에서 **operator 권한 추가 필요**.

| 엔드포인트 | 메서드 | 권한 | 용도 |
|-----------|--------|------|------|
| `/cms/slots` | GET | admin/operator | 슬롯 목록 조회 |
| `/cms/slots` | POST | admin/operator | 슬롯 생성 |
| `/cms/slots/:id` | PUT | admin/operator | 슬롯 수정 (lock 체크) |
| `/cms/slots/:id` | DELETE | admin/operator | 슬롯 삭제 (lock 체크) |
| `/cms/slots/:slotKey/contents` | PUT | admin/operator | 슬롯 콘텐츠 일괄 교체 |

**Phase 1 변경 사항:**
- `requireAdmin` → `requireAuth` + serviceKey 기반 operator 권한 체크
- Neture 기존 Admin API (`/neture/admin/homepage-contents`)는 유지하되,
  공통 `/cms/slots` API 사용 권장

### 3.3 콘텐츠 CRUD API

**기존 API:** `routes/cms-content/cms-content-mutation.handler.ts`

CmsContent의 생성/수정/삭제는 기존 CMS Content API를 사용.

| 엔드포인트 | 메서드 | 용도 |
|-----------|--------|------|
| `/cms/contents` | POST | 콘텐츠 생성 |
| `/cms/contents/:id` | PUT | 콘텐츠 수정 |
| `/cms/contents/:id` | DELETE | 콘텐츠 삭제 |
| `/cms/contents/:id/status` | PATCH | 상태 변경 (draft→published) |

### 3.4 서비스별 확장 API (확장앱)

각 서비스가 필요에 따라 추가하는 래퍼 API.

| 서비스 | 엔드포인트 | 용도 | 상태 |
|--------|-----------|------|------|
| Neture | `/neture/home/hero` | Home Hero 조회 | 운영 중 |
| Neture | `/neture/home/ads` | Home Ads 조회 | 운영 중 |
| Neture | `/neture/home/logos` | Home Logos 조회 | 운영 중 |
| Neture | `/neture/admin/homepage-contents` | Admin CRUD | 운영 중 |
| GlycoPharm | `/glycopharm/community/ads` | Community Ads | 운영 중 (별도 테이블) |
| KPA | `/kpa/community/ads` | Community Ads | 운영 중 (별도 테이블) |
| K-Cos | `/k-cosmetics/community/ads` | Community Ads | 운영 중 (별도 테이블) |

---

## 4. 핵심 결정

### Q1: community 전용 테이블을 유지할 것인가, 통합할 것인가?

**Phase 1: 유지.** 이유:
- 4개 서비스 안정 운영 중
- 마이그레이션 시 service_code → serviceKey 매핑 + 데이터 이관 필요
- 우선순위가 Home/Dashboard 슬롯보다 낮음

### Q2: Phase 1에서 API를 어디까지 공통화할 것인가?

**기존 `/cms/slots/:slotKey` 공개 조회 API 그대로 사용.**
- 운영 CRUD에 operator 권한만 추가
- 서비스별 확장 API는 기존 유지

### Q3: slot 기반 조회 API를 프론트에서 어떻게 소비할 것인가?

**`useSlotContent` 커스텀 훅으로 표준화** (문서 5 참조)
```typescript
const { contents, loading } = useSlotContent('home-hero', {
  serviceKey: 'k-cosmetics',
});
```

---

## 5. 데이터 흐름 요약

```
[운영자] → Operator UI → POST /cms/contents (콘텐츠 생성)
                        → POST /cms/slots (슬롯 배치)
                        → PUT /cms/slots/:slotKey/contents (순서 조정)

[사용자] → 프론트엔드 → useSlotContent('home-hero')
                      → GET /cms/slots/home-hero?serviceKey=k-cosmetics
                      → CmsContentSlot JOIN CmsContent
                      → 시간/활성 필터
                      → SlotHeroSlider 렌더
```

---

*Version: 1.0*
*Created: 2026-04-04*
*Status: Draft*
