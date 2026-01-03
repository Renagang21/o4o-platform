# H6-0: o4o-core-api 서비스별 설정·구조 정합성 전수 조사 보고서

## 개요

| 항목 | 내용 |
|------|------|
| Work Order | H6-0 |
| 목적 | o4o-core-api 서비스별 설정·구조 정합성 전수 조사 |
| 상태 | **완료** |
| 조사일 | 2026-01-03 |

---

## 1. 서비스별 상태 요약표

| 서비스 | 라우트 등록 | Admin 메뉴 | Entity 존재 | Service Registry | 상태 |
|--------|-------------|------------|-------------|------------------|------|
| **neture** | `/api/v1/neture` ✅ | `/neture/*` ✅ | ❓ 불명 | ❌ 미등록 | **Active** |
| **kpa-society** | `/api/v1/kpa` ✅ | ❌ 없음 | ❓ 불명 | ❌ 미등록 | **Active** |
| **glycopharm** | `/api/v1/glycopharm` ✅ | `/glycopharm/*` ✅ | ✅ Application 패턴 | ✅ 등록됨 | **Active** |
| **glucoseview** | `/api/v1/glucoseview` ✅ | `/glucoseview/*` ✅ | ✅ Application 패턴 | ✅ 등록됨 | **Active** |
| **k-cosmetics** | ❌ 없음 (공용 API) | ❌ 없음 | ❌ 없음 | ✅ 등록됨 | **Development** |
| **k-shopping** | `/api/v1/k-shopping` ✅ | ❌ 없음 | ✅ FROZEN 엔티티 | ❌ 미등록 | **독립 서비스** |
| **cosmetics** | `/api/v1/cosmetics` ✅ | `/cosmetics-*` ✅ | ✅ Product/Brand 등 | ❌ 미등록 | **Active** |

---

## 2. 라우트 등록 상세

### main.ts 라우트 등록 현황

```typescript
// 등록된 라우트 (apps/api-server/src/main.ts)
app.use('/api/v1/glycopharm', glycopharmRoutes);
app.use('/api/v1/glucoseview', glucoseviewRoutes);
app.use('/api/v1/neture', netureRoutes);
app.use('/api/v1/kpa', kpaRoutes);
app.use('/api/v1/k-shopping', kshoppingRoutes);
app.use('/api/v1/cosmetics', cosmeticsRoutes);
app.use('/api/v1/orders', ecommerceOrdersRoutes);  // 공용 주문 API
```

### 문제점 발견

1. **Service Registry 불일치**:
   - `neture`, `kpa-society`, `k-shopping`, `cosmetics`가 Service Registry에 미등록
   - `service-registry.ts`에는 glycopharm, glucoseview, k-cosmetics만 등록됨

2. **k-cosmetics vs k-shopping 혼란**:
   - `k-cosmetics`: 웹 서비스만 (k-cosmetics.site), API 없음, Service Registry 등록됨
   - `k-shopping`: 전용 API 있음 (`/api/v1/k-shopping`), Entity 있음, Service Registry 미등록
   - **두 서비스는 완전히 별개**

---

## 3. Admin Dashboard 연계

### 메뉴 등록 현황 (wordpressMenuFinal.tsx)

| 메뉴 ID | 경로 | 서비스 |
|---------|------|--------|
| `glycopharm` | `/glycopharm/*` | glycopharm |
| `glucoseview` | `/glucoseview/*` | glucoseview |
| `neture` | `/neture/*` | neture |
| `service-applications` | `/admin/service-applications/glycopharm`, `/admin/service-applications/glucoseview` | 공용 |
| `cosmetics-partner` | `/cosmetics-partner/*` | cosmetics |
| `cosmetics-products` | 주석 처리됨 | cosmetics |

### 문제점

1. **k-shopping Admin UI 없음**:
   - 라우트는 있으나 Admin에서 관리 UI 없음
   - Application/Participant 승인 UI 필요

2. **kpa-society Admin UI 없음**:
   - API 라우트 등록됨
   - Admin 메뉴에 없음

---

## 4. Entity/DB 구조

### Entity 패턴 분석

| 서비스 | Application Entity | Participant Entity | 기타 |
|--------|--------------------|--------------------|------|
| glycopharm | `GlycopharmApplication` | `GlycopharmParticipant` | 표준 패턴 |
| glucoseview | `GlucoseViewApplication` | - | Vendor, ViewProfile 등 |
| k-shopping | `KShoppingApplication` ✅ | `KShoppingParticipant` ✅ | **FROZEN** |
| cosmetics | - | - | Product, Brand, Line 등 |

### K-Shopping Entity 특이사항

```typescript
// FROZEN 마커 (H1-0)
// - 신규 컬럼 추가 ❌
// - participantType 값 추가 ❌ (store/guide/partner 고정)
// - serviceTypes 값 추가 ❌ (tax_refund/guide_sales/travel_package 고정)
// - Cosmetics 엔티티와 FK 관계 설정 ❌
```

**테이블명**:
- `kshopping_applications` (public 스키마)
- `kshopping_participants` (public 스키마)

---

## 5. 인증/권한 경계

### Scope 정의 현황 (service-scopes.ts)

| 서비스 | Public Scope | Member Scope | Admin Scope |
|--------|--------------|--------------|-------------|
| glycopharm | ✅ 정의됨 | ✅ 정의됨 | ✅ 정의됨 |
| glucoseview | ✅ 정의됨 | ✅ 정의됨 | ✅ 정의됨 |
| k-cosmetics | ❌ 빈 배열 | ❌ 빈 배열 | ❌ 빈 배열 |

### 문제점

1. **K-Shopping Scope 미등록**:
   - `k-shopping:admin`, `k-shopping:apply` 등이 `service-scopes.ts`에 없음
   - 라우트에서 자체 scope 검증 (`requireKShoppingScope`)

2. **neture, kpa, cosmetics Scope 미등록**:
   - 라우트는 있으나 Scope 정의 없음

---

## 6. K-Shopping 독립성 판단

### K-Shopping은 K-Cosmetics와 별개 서비스인가? → **YES**

| 비교 항목 | K-Shopping | K-Cosmetics |
|-----------|------------|-------------|
| API 라우트 | `/api/v1/k-shopping` | 없음 (공용 API) |
| 전용 Entity | ✅ Application, Participant | ❌ |
| DB 테이블 | `kshopping_*` | 없음 |
| 도메인 | 없음 (API만) | k-cosmetics.site |
| Service Registry | ❌ 미등록 | ✅ 등록됨 |
| 목적 | 여행자 참여 신청 관리 | 화장품 쇼핑 웹서비스 |

**결론**:
- **K-Shopping**은 "여행자 서비스 참여 신청/승인" 전용 백엔드
- **K-Cosmetics**는 "화장품 쇼핑몰 웹 채널" (API 없음, 공용 API 사용)
- 두 서비스는 **독립적**이며 통합하지 않음
- K-Shopping Entity는 **FROZEN** 상태로 현 구조 유지

---

## 7. Cross-Service 공통 이슈

### Issue 1: Service Registry 불완전
- **현황**: glycopharm, glucoseview, k-cosmetics만 등록
- **누락**: neture, kpa-society, k-shopping, cosmetics
- **영향**: 서비스 컨텍스트 분리, 로깅, 모니터링 누락

### Issue 2: Service Scopes 불완전
- **현황**: glycopharm, glucoseview, k-cosmetics만 정의
- **누락**: neture, kpa-society, k-shopping, cosmetics
- **영향**: 토큰 기반 권한 제어 불가

### Issue 3: Admin Dashboard 연계 불완전
- **k-shopping**: 라우트 있으나 Admin UI 없음
- **kpa-society**: 라우트 있으나 Admin 메뉴 없음
- **영향**: 운영자가 관리할 수 없음

---

## 8. 질문에 대한 답변

### Q: "현 API 서버에 5-10개 신규 서비스 추가 가능한가?"

**답변: 가능, 단 구조적 개선 필요**

| 현황 | 권장 조치 |
|------|-----------|
| 라우트 등록은 일관적 | 유지 |
| Service Registry 불완전 | **모든 서비스 등록 필수** |
| Service Scopes 불완전 | **모든 서비스 Scope 정의 필수** |
| Entity 패턴 일관적 | Application/Participant 패턴 유지 |
| Admin 연계 불완전 | **신규 서비스 시 Admin 메뉴 필수** |

### Q: "K-Shopping을 K-Cosmetics에 통합해야 하나?"

**답변: NO**

- K-Shopping Entity는 **FROZEN** (H1-0)
- 두 서비스는 목적이 다름
- K-Shopping은 "참여자 신청/승인" 전용
- K-Cosmetics는 "쇼핑몰 웹 채널"
- 향후 통합 시에도 별도 논의 필요

---

## 9. 즉시 수정 필요 여부

### 긴급 수정 불필요

현재 서비스들은 정상 동작 중. 다만 아래 항목은 **권장 개선**:

| 우선순위 | 개선 항목 | 영향 |
|----------|-----------|------|
| **중** | Service Registry에 누락 서비스 추가 | 모니터링/로깅 일관성 |
| **중** | Service Scopes에 누락 서비스 추가 | 권한 제어 일관성 |
| **낮** | K-Shopping Admin UI 추가 | 운영자 편의 |
| **낮** | KPA-Society Admin 메뉴 추가 | 운영자 편의 |

---

## 10. 권장 후속 작업

### H6-1: Service Registry 보완 (선택)
```typescript
// service-registry.ts에 추가
'neture': { ... },
'kpa-society': { ... },
'k-shopping': { ... },
'cosmetics': { ... },
```

### H6-2: Service Scopes 보완 (선택)
```typescript
// service-scopes.ts에 추가
'k-shopping': {
  public: [],
  member: ['k-shopping:apply'],
  admin: ['k-shopping:admin', 'k-shopping:approve'],
},
```

### H6-3: K-Shopping Admin UI (선택)
- Admin Dashboard에 K-Shopping 신청 목록/상세 페이지 추가
- `/admin/k-shopping/applications` 등

---

## 참고

- [H5-0 K-Cosmetics Service Context](./H5-0-k-cosmetics-service-context.md)
- [service-registry.ts](../../../apps/api-server/src/config/service-registry.ts)
- [service-scopes.ts](../../../apps/api-server/src/config/service-scopes.ts)
- [main.ts](../../../apps/api-server/src/main.ts)
