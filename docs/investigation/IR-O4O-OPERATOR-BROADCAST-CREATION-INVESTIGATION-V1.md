# IR-O4O-OPERATOR-BROADCAST-CREATION-INVESTIGATION-V1

> **운영자 Broadcast 콘텐츠 생성 경로 조사 보고서**
> WO-O4O-OPERATOR-BROADCAST-CREATION-INVESTIGATION-V1
> 2026-02-24

---

## 조사 목적

서비스 운영자(operator/admin)가 직접 콘텐츠를 생성할 수 있는지,
생성 시 기존 CMS/Signage 편집기를 사용하는지,
그리고 그 콘텐츠가 실제로 HUB에 진열되는지 구조적으로 검증한다.

**본 조사는 코드 수정 없이 분석 및 보고만 수행한다.**

---

## 종합 판정

```
Broadcast Production Model:  혼합 모델 (Admin + Operator + Supplier)

Q1 (운영자 CMS 생성):      YES — POST /api/v1/cms/contents (admin/service_admin)
Q2 (운영자 Signage 생성):   YES — POST /api/signage/:serviceKey/hq/* (operator)
Q3 (HUB 진열 여부):         YES — 두 도메인 모두 HUB 노출 조건 충족
Q4 (Admin vs Operator):     3단계 역할 분리 (admin / service_admin+operator / store)
```

---

## 1. Q1: 운영자가 CMS 콘텐츠를 생성할 수 있는가?

### 판정: YES

### API 엔드포인트

| 엔드포인트 | 용도 | 역할 |
|-----------|------|------|
| `POST /api/v1/cms/contents` | 운영자/관리자 콘텐츠 생성 | Platform Admin 또는 Service Admin |
| `POST /api/v1/cms/supplier/contents` | 공급자 콘텐츠 생성 (별도) | Supplier |

**파일**: `apps/api-server/src/routes/cms-content/cms-content.routes.ts` (lines 351-491)

### 역할별 동작

| 역할 | Role 예시 | authorRole | visibilityScope | serviceKey |
|------|----------|:----------:|:---------------:|:----------:|
| **Platform Admin** | `platform:admin`, `platform:super_admin` | `'admin'` | 사용자 선택 (기본: `'platform'`) | 선택 (생략 가능) |
| **Service Admin** | `glycopharm:admin`, `kpa:admin` | `'service_admin'` | `'service'` (강제) | 필수 |
| **Supplier** | `supplier`, `*:supplier` | `'supplier'` | `'service'` (강제) | 필수 |

### authorRole 결정 로직

```typescript
// cms-content.routes.ts:439-443
const authorRole = isPlatformAdmin ? 'admin' : 'service_admin';
const visibilityScope = isPlatformAdmin
  ? (reqVisibilityScope || 'platform')  // 사용자 선택 가능
  : 'service';                          // 서비스 관리자는 'service' 강제
```

### 초기 status

**항상 `'draft'`** (line 466). 생성 즉시 HUB 노출 불가.

발행은 별도 엔드포인트:
```
PATCH /api/v1/cms/contents/:id/status  { status: 'published' }
```
- `requireAdmin` 가드 — 관리자만 발행 가능

### P0 제한: 허용 콘텐츠 타입

현재 생성 가능한 타입: `'hero'`, `'notice'` (P0 단계)
향후 추가 예정: `'news'`, `'featured'`, `'promo'`, `'event'`

---

## 2. Q2: 운영자가 Signage 콘텐츠를 생성할 수 있는가?

### 판정: YES — 두 가지 경로 존재

### 경로 A: HQ/Global 콘텐츠 (HUB 진열 대상)

| 엔드포인트 | 용도 | 가드 |
|-----------|------|------|
| `POST /api/signage/:serviceKey/hq/playlists` | 글로벌 플레이리스트 생성 | `requireSignageOperator` |
| `POST /api/signage/:serviceKey/hq/media` | 글로벌 미디어 생성 | `requireSignageOperator` |

**서버 강제 설정**:

```typescript
// signage.controller.ts:1030-1031
source: 'hq',       // 강제
scope: 'global',    // 강제
organizationId: null // 강제 (글로벌)
```

**역할 요구사항**: `signage:{serviceKey}:operator` 또는 `platform:admin` (cascade)

**초기 status**:
- Playlist: 사용자 지정 가능 (`'active'`, `'inactive'`, `'draft'`)
- Media: **항상 `'active'`** (service layer 강제)

### 경로 B: Store-Scoped 콘텐츠 (HUB 진열 불가)

| 엔드포인트 | 용도 | 가드 |
|-----------|------|------|
| `POST /api/signage/:serviceKey/playlists` | 매장 플레이리스트 생성 | `requireSignageStore` |
| `POST /api/signage/:serviceKey/media` | 매장 미디어 생성 | `requireSignageStore` |

**암묵적 설정**:

```
source: 'store' (DTO에 미포함 → 기본값)
scope: 'store' (DTO에 미포함 → 기본값)
organizationId: 필수 (헤더/쿼리/바디에서 추출)
```

**역할 요구사항**: `signage:store:{organizationId}`

---

## 3. Q3: 운영자 생성 콘텐츠가 HUB에 진열되는가?

### CMS 콘텐츠 HUB 노출 검증

HUB 쿼리 조건:
```sql
WHERE serviceKey = $1
  AND status = 'published'
  AND visibilityScope IN ('platform', 'service')
  AND authorRole IN ('admin', 'service_admin')  -- producer='operator' 필터 시
```

| 조건 | Platform Admin 콘텐츠 | Service Admin 콘텐츠 |
|------|:--------------------:|:-------------------:|
| serviceKey 일치 | YES (지정 시) | YES (필수 지정) |
| status = 'published' | 승인 후 YES | 승인 후 YES |
| visibilityScope IN (...) | YES (`'platform'` 또는 `'service'`) | YES (`'service'`) |
| authorRole 매핑 | `'admin'` → `operator` | `'service_admin'` → `operator` |

**판정: YES** — 관리자가 `status='published'`로 전환하면 HUB에 노출된다.

### Signage 콘텐츠 HUB 노출 검증

HUB 쿼리 조건:
```sql
WHERE serviceKey = $1
  AND status = 'active'
  AND scope = 'global'
  AND source IN ('hq', 'supplier', 'community')  -- 'hq' = operator
  AND "deletedAt" IS NULL
```

| 조건 | HQ 콘텐츠 (경로 A) | Store 콘텐츠 (경로 B) |
|------|:-----------------:|:-------------------:|
| serviceKey 일치 | YES (URL param) | YES (URL param) |
| status = 'active' | Media: 즉시 / Playlist: 설정 가능 | Media: 즉시 |
| scope = 'global' | YES (강제) | **NO** (`'store'`) |
| source IN (...) | YES (`'hq'`) | **NO** (`'store'`) |
| deletedAt IS NULL | YES | YES |

**판정**:
- **HQ 콘텐츠 (경로 A): YES** — 생성 즉시 또는 status='active' 설정 후 HUB 노출
- **Store 콘텐츠 (경로 B): NO** — `scope='store'` + `source='store'` → HUB 조건 미충족

---

## 4. Q4: Admin vs Operator 역할 분리

### 3단계 역할 계층

```
┌─────────────────────────────────────────────────────┐
│  Level 1: Platform Admin                             │
│  Roles: platform:admin, platform:super_admin         │
│  CMS: authorRole='admin', visibility 자유 선택        │
│  Signage: cascade → operator 가능                    │
│  권한: 모든 서비스, 모든 기능                           │
├─────────────────────────────────────────────────────┤
│  Level 2: Service Admin / Operator                   │
│  CMS Roles: glycopharm:admin, kpa:admin 등           │
│  Signage Roles: signage:{serviceKey}:operator        │
│  CMS: authorRole='service_admin', visibility='service'│
│  Signage: source='hq', scope='global'                │
│  권한: 해당 serviceKey 범위 내                         │
├─────────────────────────────────────────────────────┤
│  Level 3: Store User                                 │
│  Roles: signage:store:{organizationId}               │
│  CMS: 생성 불가 (권한 없음)                            │
│  Signage: source='store', scope='store' (HUB 불가)    │
│  권한: 해당 매장 범위 내                                │
└─────────────────────────────────────────────────────┘
```

### 역할 매트릭스 (최종 답변)

| 역할 | CMS 생성 | CMS 발행 | Signage Global 생성 | Signage Store 생성 | HUB 노출 |
|------|:--------:|:--------:|:-------------------:|:-----------------:|:--------:|
| **Platform Admin** | YES | YES | YES | YES | YES |
| **Service Admin** | YES | YES (동일 역할) | YES | YES | YES |
| **Store Operator** | NO | NO | NO | YES | NO |
| **Supplier** | YES (전용 API) | NO (승인 필요) | YES (ext API) | NO | 승인 후 YES |
| **Community** | NO (현재) | NO | NO (현재) | NO | — |

---

## 5. 승인 워크플로우

### CMS 콘텐츠

```
생성 (draft) ──→ 발행 (published) ──→ 보관 (archived)
     │                                       │
     └──────────→ 보관 (archived) ←───────────┘
```

| 전환 | 누가 | 엔드포인트 |
|------|------|----------|
| draft → published | Admin / Service Admin | `PATCH /cms/contents/:id/status` |
| published → archived | Admin / Service Admin | `PATCH /cms/contents/:id/status` |
| draft → archived | Admin / Service Admin | `PATCH /cms/contents/:id/status` |

**관리자 생성 콘텐츠도 `draft`에서 시작** → 자기 자신이 발행 가능 (별도 승인자 불필요)

### Signage 콘텐츠

| 콘텐츠 유형 | 초기 status | 승인 필요 |
|------------|:----------:|:---------:|
| HQ Media | `'active'` (강제) | NO — 즉시 노출 |
| HQ Playlist | 사용자 지정 | NO — `'active'` 설정 시 즉시 노출 |
| Store Media | `'active'` (강제) | NO |
| Store Playlist | 사용자 지정 | NO |

**Signage는 승인 워크플로우 없음** — Operator가 생성하면 즉시 활성화 가능

---

## 6. Frontend 편집기 현황

### CMS 편집기

| 위치 | 용도 | 역할 |
|------|------|------|
| `apps/admin-dashboard/src/pages/cms/contents/ContentFormModal.tsx` | 플랫폼 관리자 CMS 편집 | Platform Admin |
| `services/web-kpa-society/src/pages/operator/ContentManagementPage.tsx` | KPA 운영자 공지/뉴스 | kpa:operator / kpa:admin |
| `services/web-glycopharm/src/pages/partner/ContentPage.tsx` | GlycoPharm 파트너 콘텐츠 | glycopharm:partner |
| `services/web-k-cosmetics/src/pages/partner/ContentPage.tsx` | K-Cosmetics 파트너 콘텐츠 | Partner role |

### Signage 편집기

| 위치 | 용도 | 역할 |
|------|------|------|
| `apps/admin-dashboard/src/pages/digital-signage/v2/hq/HQContentManager.tsx` | **HQ 글로벌 콘텐츠 생성** | Platform Admin / Operator |
| `apps/admin-dashboard/src/pages/digital-signage/v2/store/StoreSignageDashboard.tsx` | 매장 로컬 사이니지 관리 | Store User |
| `services/web-kpa-society/src/pages/signage/ContentHubPage.tsx` | 글로벌 콘텐츠 **소비** (복사) | Store User |
| `services/web-glycopharm/src/pages/pharmacy/signage/MySignagePage.tsx` | 약국 로컬 사이니지 관리 | Pharmacy Operator |

---

## 7. Broadcast Production Model 판정

### 혼합 모델 (Mixed Production Model)

```
┌──────────────────────────────────────────────────────────┐
│              BROADCAST PRODUCTION MODEL                    │
│                                                          │
│   ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│   │  Platform     │   │  Service     │   │  Supplier  │  │
│   │  Admin        │   │  Admin/Op    │   │            │  │
│   │              │   │              │   │            │  │
│   │  CMS: admin  │   │  CMS:        │   │  CMS:      │  │
│   │  Signage: hq │   │  service_    │   │  supplier  │  │
│   │              │   │  admin       │   │  Signage:  │  │
│   │  visibility: │   │  Signage: hq │   │  supplier  │  │
│   │  자유 선택    │   │              │   │            │  │
│   │              │   │  visibility: │   │  visibility│  │
│   │  승인: 자가   │   │  service     │   │  service   │  │
│   │  발행 가능    │   │  (강제)       │   │  (강제)     │  │
│   │              │   │              │   │            │  │
│   │              │   │  승인: 자가   │   │  승인:      │  │
│   │              │   │  발행 가능    │   │  관리자     │  │
│   │              │   │              │   │  필요       │  │
│   └──────┬───────┘   └──────┬───────┘   └─────┬──────┘  │
│          │                  │                  │          │
│          ▼                  ▼                  ▼          │
│   ┌──────────────────────────────────────────────────┐   │
│   │                    HUB                            │   │
│   │  CMS:     authorRole IN ('admin','service_admin') │   │
│   │           → producer = 'operator'                 │   │
│   │  Signage: source = 'hq'                          │   │
│   │           → producer = 'operator'                 │   │
│   │                                                  │   │
│   │  CMS:     authorRole = 'supplier'                │   │
│   │           → producer = 'supplier'                │   │
│   │  Signage: source = 'supplier'                    │   │
│   │           → producer = 'supplier'                │   │
│   └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 모델 판정 근거

| 모델 | 해당 여부 | 근거 |
|------|:---------:|------|
| 모델 1 — Admin Only | **부분 해당** | CMS 발행은 Admin만 가능 |
| 모델 2 — Service Operator Broadcast | **해당** | Service Admin/Operator가 CMS + Signage 둘 다 생성 가능 |
| 모델 3 — Store-Level Only | **Store 경로만 해당** | Store 콘텐츠는 HUB 불가 |

**최종 판정: 모델 2 — Service Operator Broadcast**

운영자(Service Admin + Operator)가 CMS와 Signage 모두 생성 가능하며,
HUB 노출 조건을 충족한다. 공급자 전용 모델이 아니다.

---

## 8. CMS vs Signage 비교표

| 항목 | CMS | Signage |
|------|-----|---------|
| 운영자 생성 API | `POST /cms/contents` | `POST /signage/:key/hq/*` |
| 운영자 역할 | `*:admin` (Service Admin) | `signage:*:operator` |
| authorRole / source | `'admin'` / `'service_admin'` | `'hq'` |
| 초기 status | `'draft'` (항상) | Media: `'active'` / Playlist: 선택 |
| 발행 필요 | YES (`PATCH .../status`) | NO (즉시 가능) |
| HUB 노출 | 발행 후 YES | 생성 즉시 가능 (status='active') |
| 승인 워크플로우 | 자가 발행 (동일 역할) | 없음 |
| Frontend 편집기 | Admin Dashboard + 서비스별 | Admin Dashboard HQ Manager |

### 핵심 차이

- **CMS**: 생성 → draft → 발행(자가) → HUB 노출 (2단계)
- **Signage**: 생성 → active → HUB 즉시 노출 (1단계)

---

## 9. HUB 진열 전체 경로 요약

### 운영자 콘텐츠가 HUB에 노출되는 전체 흐름

```
[CMS 경로]
Service Admin → POST /cms/contents
  → authorRole='service_admin', visibilityScope='service', status='draft'
  → PATCH /cms/contents/:id/status { status: 'published' }
  → HUB: serviceKey=$1 AND status='published' AND visibilityScope IN ('platform','service')
  → producer='operator' (authorRole IN ['admin','service_admin'] 매핑)
  → ✅ HUB 노출

[Signage 경로]
HQ Operator → POST /signage/:serviceKey/hq/media
  → source='hq', scope='global', status='active', organizationId=null
  → HUB: serviceKey=$1 AND status='active' AND scope='global' AND source='hq'
  → producer='operator' (source='hq' 매핑)
  → ✅ HUB 즉시 노출

[Store 경로 — HUB 불가]
Store User → POST /signage/:serviceKey/media
  → source='store', scope='store', organizationId=X
  → HUB: scope='global' 미충족
  → ❌ HUB 노출 불가
```

---

## 결론

### Broadcast Domain은 공급자 전용이 아니다

O4O의 Broadcast Domain은 **3개 생산 주체**가 공존하는 혼합 모델이다:

| 생산 주체 | CMS 생성 | Signage 생성 | HUB 노출 | 승인 |
|----------|:--------:|:-----------:|:--------:|:----:|
| **Platform Admin** | YES | YES | YES | 자가 발행 |
| **Service Admin/Operator** | YES | YES | YES | CMS: 자가 발행 / Signage: 즉시 |
| **Supplier** | YES (전용 API) | YES (ext API) | 승인 후 YES | 관리자 승인 필요 |
| **Store User** | NO | YES (store만) | NO | — |

### 구조적 평가

**장점**:
- 3단계 역할 분리가 명확
- 공급자 콘텐츠는 관리자 승인 필수 (품질 보장)
- Store 콘텐츠는 HUB 진입 불가 (경계 보호)
- Signage HQ 경로에서 source/scope 서버 강제 (스푸핑 불가)

**확인 사항**:
- CMS `draft → published` 자가 발행 → 별도 승인자 불필요 (의도된 설계)
- Signage Media 즉시 `'active'` → 운영자 실수 시 즉시 노출 가능 (의도된 설계)
- CMS P0 단계에서 `hero`, `notice`만 생성 가능 (향후 확장 예정)

---

*Generated: 2026-02-24*
*WO: WO-O4O-OPERATOR-BROADCAST-CREATION-INVESTIGATION-V1*
*Status: Investigation Complete — Read Only*
*Classification: Investigation Report*
