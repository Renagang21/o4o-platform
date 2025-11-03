# Phase 2.1 진행 상황 보고서

**작성일**: 2025-11-03
**Phase**: 2.1 - Tracking & Commission Core (진행 중)
**상태**: 🟡 **데이터 구조 완성, 서비스 레이어 구현 필요**

---

## 📋 개요

Phase 2는 **Tracking + Commission Automation**을 목표로 하며, 두 묶음으로 나누어 진행합니다:
- **Phase 2.1 (현재)**: Tracking & Commission Core - 핵심 로직 구현
- **Phase 2.2 (다음)**: Operations & Monitoring - 대시보드 확장 및 운영 도구

---

## ✅ 완료된 작업

### 1. 사전 동기화 및 기준선 태그

**Git 태그 생성**: `phase1-complete`
```
Phase 1 Complete - Entity SSOT Foundation
- Entity tables: partners, sellers, suppliers, partner_commissions
- Production Ready: Yes
- Date: 2025-11-03
```

### 2. Tracking 엔티티 설계 완료 ✅

#### **ReferralClick Entity** (`referral_clicks` 테이블)

**목적**: 추천 링크 클릭 추적 with 필터링 및 개인정보 보호

**핵심 기능**:
- ✅ **클릭 수집**: 추천 코드, 캠페인, 소스/미디엄 추적
- ✅ **중복 필터링**: Session ID + Fingerprint 기반 중복 검출
- ✅ **봇 차단**: User-Agent 분석, 의심 패턴 감지
- ✅ **레이트 리밋**: 과도한 클릭 차단
- ✅ **내부 트래픽 차단**: Internal traffic 마킹
- ✅ **개인정보 최소화**: IP 익명화, 지오로케이션은 도시 레벨까지만
- ✅ **GDPR 준수**: `anonymize()` 메서드, 보존 기간 후 자동 익명화

**필드 그룹**:
```typescript
// Identification
partnerId, productId, referralCode, referralLink

// Campaign Tracking
campaign, medium, source

// Filtering
status (valid/duplicate/bot/internal/rate_limited/invalid)
isDuplicate, isSuspiciousBot, isRateLimited

// Privacy-conscious
sessionId (hashed), fingerprint (hashed)
ipAddress (anonymized), anonymizedAt

// Conversion Tracking
hasConverted, conversionId, convertedAt
```

**인덱스**: 5개 (partnerId+createdAt, referralCode+createdAt, status+createdAt, sessionId, fingerprint)

#### **ConversionEvent Entity** (`conversion_events` 테이블)

**목적**: 전환 이벤트 추적 with 어트리뷰션 모델

**핵심 기능**:
- ✅ **어트리뷰션 모델**: Last-touch, First-touch, Linear, Time-decay, Position-based
- ✅ **어트리뷰션 윈도우**: 기본 30일, 설정 가능
- ✅ **멱등성**: Idempotency key (orderId + productId + referralCode)
- ✅ **환불 처리**: 전액/부분 환불 추적
- ✅ **고객 타입**: 신규 vs 재구매 구분
- ✅ **다중 터치**: Attribution path 저장 (JSON)

**상태 전이**:
```
pending → confirmed → (cancelled/refunded/partial_refund)
```

**필드 그룹**:
```typescript
// Attribution
attributionModel, attributionWeight, attributionPath
clickedAt, convertedAt, conversionTimeMinutes

// Financial
orderAmount, productPrice, quantity, currency
refundedAmount, refundedQuantity

// Validation
attributionWindowDays, isWithinAttributionWindow
idempotencyKey (unique), isDuplicate
```

**인덱스**: 5개 (partnerId+createdAt, orderId, referralClickId, status+createdAt, conversionType+status)

#### **CommissionPolicy Entity** (`commission_policies` 테이블)

**목적**: 커미션 계산 규칙 관리 with 우선순위 기반 충돌 해결

**핵심 기능**:
- ✅ **정책 타입**: Default, Tier-based, Product-specific, Category, Promotional, Partner-specific
- ✅ **커미션 타입**: Percentage, Fixed, Tiered
- ✅ **우선순위 시스템**: Priority 숫자 (높을수록 우선)
- ✅ **스코프 필터**: Partner, Tier, Product, Supplier, Category, Tags
- ✅ **유효 기간**: validFrom, validUntil
- ✅ **사용 제한**: maxUsagePerPartner, maxUsageTotal
- ✅ **스태킹 규칙**: canStackWithOtherPolicies, exclusiveWith

**계산 로직**:
```typescript
calculateCommission(orderAmount, quantity): number {
  // Percentage: orderAmount * rate / 100
  // Fixed: amount * quantity
  // Tiered: Find matching tier → apply rate/amount

  // Apply min/max constraints
  // Round to 2 decimal places
}
```

**적용 로직**:
```typescript
appliesTo(context): boolean {
  // Check partner/tier/product/supplier/category match
  // Check order amount constraints
  // Check new customer requirement
  // Return true if all conditions met
}
```

**인덱스**: 6개 (policyType+status, partnerId+status, productId+status, category+status, priority+status, validFrom+validUntil)

### 3. 증분 마이그레이션 생성 ✅

**파일**: `2000000000000-CreateTrackingAndCommissionTables.ts`

**특징**:
- ✅ `CREATE TABLE IF NOT EXISTS` (멱등성)
- ✅ 인덱스 생성 (`IF NOT EXISTS`)
- ✅ 외래키 존재 확인 후 생성
- ✅ Rollback 지원 (`down()` 메서드)

**생성되는 테이블**: 3개
1. `referral_clicks` - 16개 인덱스
2. `conversion_events` - 18개 인덱스
3. `commission_policies` - 19개 인덱스

**외래키**: 4개
- referral_clicks → partners
- conversion_events → partners
- conversion_events → referral_clicks
- conversion_events → products

---

## 🚧 진행 중 작업

### 현재 단계: 데이터 구조 완성 → 서비스 레이어 구현 필요

**다음 작업**:
1. **Tracking Service** 구현
   - 클릭 수집 API (`POST /api/v1/tracking/click`)
   - 봇/중복 필터링 로직
   - 레이트 리밋 미들웨어

2. **Attribution Service** 구현
   - 전환 이벤트 생성 (`POST /api/v1/tracking/conversion`)
   - 어트리뷰션 모델 적용
   - 멱등성 체크

3. **Commission Engine** 구현
   - 정책 매칭 엔진
   - 커미션 계산 로직
   - 상태머신 (pending → confirmed → paid)

4. **Webhook 핸들러**
   - 주문 생성 훅 → 전환 이벤트 생성
   - 주문 확정 훅 → 커미션 confirmed
   - 주문 취소/환불 훅 → 커미션 조정

5. **Phase 2 롤백 스크립트**
   - Phase 2.1 테이블 롤백
   - Phase 1 상태로 복원

---

## 📊 설계 결정사항

### 1. 개인정보 보호 우선

**최소 수집 원칙**:
- IP 주소: 익명화, 보존 기간 후 자동 삭제
- 지오로케이션: 도시 레벨까지만 (정확한 위치 없음)
- Session/Fingerprint: 해시 처리
- `anonymizedAt` 필드로 GDPR 준수 추적

### 2. 멱등성 보장

**ConversionEvent**:
- Idempotency Key: `${orderId}-${productId}-${referralCode}`
- Unique constraint 적용
- 재처리 시 중복 방지

### 3. 유연한 어트리뷰션

**5가지 모델 지원**:
1. **Last-touch** (기본): 마지막 클릭이 100% 크레딧
2. **First-touch**: 첫 클릭이 100% 크레딧
3. **Linear**: 모든 클릭에 균등 배분
4. **Time-decay**: 최근 클릭에 더 많은 가중치
5. **Position-based**: 40% 첫/40% 마지막/20% 중간

**Attribution Path 저장** (JSON):
```json
[
  { "clickId": "uuid1", "timestamp": "2025-11-01", "weight": 0.4 },
  { "clickId": "uuid2", "timestamp": "2025-11-02", "weight": 0.2 },
  { "clickId": "uuid3", "timestamp": "2025-11-03", "weight": 0.4 }
]
```

### 4. 정책 우선순위 시스템

**충돌 해결 규칙**:
1. **Priority 숫자** (높을수록 우선)
2. **Specific > General** (상품 특정 > 카테고리 > 기본)
3. **시간 우선** (최신 정책 우선)
4. **스태킹 규칙** 확인

**예시**:
```
Priority 100: PROMO-SUMMER2025 (promotional, 15%)
Priority 50:  PRODUCT-ABC (product_specific, 12%)
Priority 10:  TIER-GOLD (tier_based, 10%)
Priority 0:   DEFAULT (default, 5%)

→ 상품 ABC 구매 시: 15% (프로모션 우선)
→ 프로모션 종료 후: 12% (상품 특정)
```

### 5. 상태머신 설계

**ReferralClick**:
```
valid ←→ duplicate
valid ←→ bot
valid ←→ rate_limited
valid ←→ internal
* → invalid
```

**ConversionEvent**:
```
pending → confirmed → paid
pending → cancelled
confirmed → refunded
confirmed → partial_refund
```

**CommissionPolicy**:
```
scheduled → active → expired
active ←→ inactive
```

---

## 🔧 기술 스택 및 도구

**ORM**: TypeORM (Entity-first approach)
**Database**: PostgreSQL (13+)
**인덱싱**: Composite indexes for query performance
**데이터 타입**:
- UUID for IDs
- INET for IP addresses
- JSON for flexible metadata
- Enum for constrained values

---

## 📁 생성된 파일

### Entities (3개)
1. `apps/api-server/src/entities/ReferralClick.ts` - 179줄
2. `apps/api-server/src/entities/ConversionEvent.ts` - 251줄
3. `apps/api-server/src/entities/CommissionPolicy.ts` - 333줄

### Migration (1개)
4. `apps/api-server/src/database/migrations/2000000000000-CreateTrackingAndCommissionTables.ts` - 220줄

**총 코드**: 983줄

---

## 🎯 다음 세션 계획

### Phase 2.1 완료 작업 (예상)

1. **서비스 레이어** (3-4개 파일)
   - TrackingService.ts
   - AttributionService.ts
   - CommissionEngine.ts
   - WebhookHandlers.ts

2. **API 컨트롤러** (2개 파일)
   - TrackingController.ts
   - CommissionController.ts

3. **미들웨어** (1-2개 파일)
   - RateLimiter.ts
   - BotDetector.ts

4. **테스트 & 검증**
   - 마이그레이션 적용
   - 샘플 데이터 시드
   - 엔드투엔드 테스트

5. **Phase 2 롤백 스크립트**
   - `scripts/rollback-phase2.sh`

### Phase 2.2 작업 (이후 세션)

1. **대시보드 확장**
   - 클릭/전환/커미션 추이 차트
   - KPI 위젯

2. **운영 패널**
   - 수동 승인/조정 UI
   - 분쟁 처리 워크플로우

3. **성능 최적화**
   - 캐싱 전략
   - 비동기 큐 도입

4. **스테이징 배포**
   - 단계별 검증
   - 프로덕션 롤아웃

---

## 🚀 현재 상태

**진행률**: 약 30% (데이터 구조 완성)

**Git 상태**:
- 최신 커밋: `8e3170b0d` - "feat: Add Phase 2.1 tracking & commission entities and migration"
- 태그: `phase1-complete` (기준선)
- 브랜치: `main`

**블로킹 요소**: 없음
**준비 상태**: 서비스 레이어 구현 준비 완료

---

**작성**: Claude Code
**최종 업데이트**: 2025-11-03 11:45 KST

🤖 Generated with [Claude Code](https://claude.com/claude-code)
