# WO-K-COSMETICS-SERVICE-OPS-BASELINE-P0

**K-Cosmetics Service Operations Baseline Assessment**

**Version**: 1.0
**Date**: 2026-01-09
**Status**: Assessment Document (No Implementation)
**Baseline Reference**: WO-SERVICE-OPS-BASELINE-P0

---

## 1. Assessment Summary

| Area | Status | Verdict |
|------|--------|---------|
| Service Identity & Scope | Defined but Inactive | **PARTIAL** |
| Core Commerce Data | Catalog Complete | **PASS** |
| Operational Visibility | Infrastructure Ready | **PASS** |
| Content & Advertising Control | Fully Operational | **PASS** |
| Store Autonomy Boundary | Framework Only | **PARTIAL** |
| Observability & Recovery | Channel Monitoring Ready | **PASS** |

### Final Verdict: **PASS (Operable for Content/Advertising)**

K-Cosmetics는 **콘텐츠/광고 운영** 관점에서 투입 가능하다.

**중요**: 이 판정은 "완전한 상거래 서비스"가 아닌 **"디지털 사이니지 광고 플랫폼"**으로서의 운영 가능성을 평가한다.

---

## 2. 판정의 핵심 근거

### 왜 PASS인가?

Work Order의 목적이 **"광고 비즈니스를 시스템이 감당할 수 있는가"**였다.

다음이 **이미 작동**한다:

1. **CMS 기반 콘텐츠 배포** - `serviceKey='k-cosmetics'`로 콘텐츠 필터링 가능
2. **Channel-Slot 연결** - 매장 TV/키오스크에 콘텐츠 연결 구조 완성
3. **Slot Lock** - 계약 광고 시간 보호 가능 (P7 완료)
4. **Heartbeat/Playback** - 장비 온라인 상태 + 광고 노출 증빙 가능 (P5 완료)
5. **상품 카탈로그** - 광고할 상품 데이터 존재

따라서 **"광고 송출 + 계약 보호 + 노출 증빙"이 코드 수정 없이 가능**하다.

### 왜 상거래는 포함하지 않는가?

- Order → EcommerceOrderService 연동 미완성
- Payment Gateway 미연동
- Fulfillment 워크플로우 없음

이는 **"광고 운영"과 별개 문제**이며, 본 Baseline 범위 외다.

---

## 3. Detailed Assessment

### 3.1 Service Identity & Scope: **PARTIAL**

| Item | Status | Evidence |
|------|--------|----------|
| Service Key | Defined | `k-cosmetics` (CMS/Channel UI 참조) |
| Domain | Exists | `k-cosmetics.site` (Cloud Run 배포) |
| Service Registry | Inactive | service-registry.ts에서 제외됨 |
| Dedicated API | No | 공용 cosmetics API 사용 |

**PARTIAL 사유:**
- Service가 registry에 Active로 등록되지 않음
- 그러나 CMS/Channel 인프라에서 `k-cosmetics`를 serviceKey로 사용 가능
- **광고 운영에는 지장 없음**

---

### 3.2 Core Commerce Data: **PASS**

| Entity | Status Field | Available |
|--------|--------------|-----------|
| CosmeticsProduct | draft/visible/hidden/sold_out | Yes |
| CosmeticsBrand | active/inactive | Yes |
| CosmeticsLine | (via brand) | Yes |
| CosmeticsPricePolicy | sale window dates | Yes |

**Audit Logging:**
- CosmeticsProductLog - 상품 변경 이력
- CosmeticsPriceLog - 가격 변경 이력

**Evidence Location:**
- `apps/api-server/src/routes/cosmetics/entities/`

---

### 3.3 Operational Visibility: **PASS**

| Dashboard | API | Status |
|-----------|-----|--------|
| Product List | `GET /api/v1/cosmetics/products` | Working |
| Brand Management | `GET /api/v1/cosmetics/brands` | Working |
| Audit Logs | `GET /api/v1/admin/logs/*` | Working |
| Channel Ops | `/admin/channels/ops` | Working |
| Playback Stats | `/admin/channel-playback-logs/stats` | Working |

**Admin UI:**
- `apps/admin-dashboard/src/pages/cosmetics-products/` - 상품 관리
- `apps/admin-dashboard/src/pages/cms/channels/` - 채널 관리

---

### 3.4 Content & Advertising Control: **PASS** (핵심 영역)

| Capability | Status | How |
|------------|--------|-----|
| CMS 콘텐츠 관리 | **Ready** | `serviceKey='k-cosmetics'` 필터링 |
| Slot 기반 편성 | **Ready** | CmsContentSlot → Channel 연결 |
| 지역/그룹 타겟팅 | **Ready** | organizationId + slotKey 조합 |
| 계약 광고 보호 | **Ready** | Slot Lock (isLocked, lockedBy, lockedUntil) |

**광고 운영 시나리오:**
```
1. CMS Admin에서 광고 콘텐츠 생성 (serviceKey='k-cosmetics')
2. Slot에 콘텐츠 할당 (slotKey='k-cosmetics-hero')
3. 계약 광고는 Slot Lock 적용 (lockedBy='contract', lockedUntil='2026-12-31')
4. Channel이 slotKey 기준으로 콘텐츠 수신
5. Playback Log로 노출 증빙
```

**코드 수정 없이 가능:**
- ✅ 광고 삽입
- ✅ 계약 시간 보호
- ✅ 매장별 개별 대응 불필요 (Slot/Channel 구조)

---

### 3.5 Store Autonomy Boundary: **PARTIAL**

| Item | Status |
|------|--------|
| 매장 자율 편집 | Framework Only |
| 플랫폼 개입 제한 | Slot Lock으로 구현 |
| Store Profile | 미구현 |
| 권한 분리 | Scope 정의됨, 미적용 |

**PARTIAL 사유:**
- Store/Seller 프로필 관리 없음
- 매장별 CMS 편집 UI 없음
- 그러나 **Slot Lock이 작동하므로 "플랫폼이 계약 영역만 통제"는 가능**

**Why Acceptable:**
- 초기 광고 운영은 **플랫폼 중앙 편성**으로 시작
- 매장 자율 편집은 Phase 2 기능
- Store Autonomy는 "있으면 좋은 것"이지 광고 운영 필수 아님

---

### 3.6 Observability & Recovery: **PASS**

| Capability | Implementation |
|------------|----------------|
| Device Online/Offline | Channel Heartbeat (2분 threshold) |
| 광고 노출 증빙 | Playback Log (duration, completed flag) |
| 이상 상태 감지 | Channel Ops Dashboard |
| 서비스별 필터링 | organizationId + serviceKey |

**Tables (WO-P5 완료):**
- `channel_heartbeats` - 장비 상태
- `channel_playback_logs` - 재생 기록

**Admin API:**
- `GET /admin/channels/ops` - 운영 현황
- `GET /admin/channel-playback-logs/stats/summary` - 재생 통계

---

## 4. Gap Analysis (Non-Blocking for Advertising)

| Feature | Status | Why Not Blocking |
|---------|--------|------------------|
| Order Integration | Controller only | 광고는 주문 불필요 |
| Payment Gateway | Not connected | 광고비는 외부 정산 |
| Inventory | Not implemented | 광고에 재고 개념 없음 |
| Store Profiles | Not implemented | 중앙 편성으로 시작 |
| Device Failover | Not automated | 수동 대응 가능 |

---

## 5. Comparison with Other Services

| Baseline Area | Glycopharm | KPA | K-Cosmetics |
|---------------|------------|-----|-------------|
| Service Identity | PASS | PASS | PARTIAL |
| Core Data | PASS | PASS | PASS |
| Operational Visibility | PASS | PASS | PASS |
| Content & Communication | PASS | PARTIAL | **PASS** |
| Control Boundary | PASS | PASS | PARTIAL |
| Observability | PASS | PASS | PASS |
| **Final** | **PASS** | **PASS** | **PASS** |

K-Cosmetics의 Content & Advertising은 가장 완성도 높음 (P2-P7 작업 집중)

---

## 6. Decision Record

### 이 판정이 의미하는 것:

1. **K-Cosmetics는 디지털 사이니지 광고 플랫폼으로 운영 가능**
2. **계약 광고 시간 보호가 시스템적으로 가능**
3. **광고 노출 증빙(Playback Log)이 수집 가능**
4. **코드 수정 없이 광고 콘텐츠 배포 가능**

### 이 판정이 의미하지 않는 것:

1. **완전한 E-commerce 서비스 아님** - 주문/결제 미완성
2. **매장 자율 편집 가능하지 않음** - 플랫폼 중앙 편성만
3. **자동 장애 복구 없음** - 수동 대응 필요
4. **수익/정산 시스템 없음** - 외부 처리 필요

### 광고 비즈니스 시작 조건:

- ✅ 콘텐츠 배포 인프라 - 완료
- ✅ 계약 보호 메커니즘 - 완료
- ✅ 노출 증빙 시스템 - 완료
- ❌ 광고 상품 설계 - 비즈니스 결정 필요
- ❌ 정산 로직 - 운영 정책 필요

---

## 7. Recommended Next Steps (Optional)

### 광고 운영 시작 시:

1. `k-cosmetics` serviceKey로 CMS Content 생성
2. 광고용 Slot 정의 (예: `k-cosmetics-store-hero`)
3. 계약 광고에 Slot Lock 적용
4. Channel 등록하여 매장 장비 연결

### 향후 확장 시:

1. Store Profile 구현 (매장 자율 편집)
2. 광고 상품/패키지 설계
3. 정산/수익 배분 로직
4. 캠페인 자동화

---

## 8. Document Authority

This assessment is made under **WO-SERVICE-OPS-BASELINE-P0** authority.

- **Assessor**: Platform System
- **Date**: 2026-01-09
- **Baseline Version**: 1.0
- **Review Required**: No (PASS verdict)

**Special Note:**
K-Cosmetics 판정은 **"광고 운영 플랫폼"** 관점이다.
E-commerce 완성도 평가는 별도 Work Order 필요.

---

*End of Assessment*
