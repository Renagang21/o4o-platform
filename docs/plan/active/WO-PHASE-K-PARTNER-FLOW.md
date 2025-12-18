# [WORK ORDER] Phase K - Partner Flow 확정

> **WO-PHASE-K-PARTNER-FLOW**
> Version: 1.1
> Created: 2025-12-18
> Updated: 2025-12-18
> Status: **Approved - Execution Started**

---

## 헤더 확인

- ☐ 본 Work Order는 work-order-standard-header.md를 준수한다
- ☐ feature/* 브랜치에서 작업한다 (`feature/phase-k-partner-flow`)
- ☐ CLAUDE.md v2.0 규칙을 따른다

---

## 1. Phase K 개요

### 1.1 Phase K의 본질

Phase K는 **"디자인이 아닌 전환 구조"**를 확정하는 단계이다.

| 핵심 질문 | 설명 |
|-----------|------|
| 파트너는 어디서 진입하는가 | Partner Landing → Signup Flow |
| 소비자는 어디에서 파트너를 인식하는가 | Attribution 포인트 |
| 루틴/상품은 어떻게 수익 흐름으로 연결되는가 | Conversion Path |
| 추천 링크는 어떤 UX 흐름을 타는가 | Referral UX |

### 1.2 Phase K 분리 구조

```
Phase K-1 : Claude Code (구조·흐름·기능 구현)  ← 본 Work Order
Phase K-2 : Antigravity (시각 보정·이미지·톤 정리) ← 후속
```

> ⚠ Phase K-1이 완료되어야 K-2 진행 가능
> ⚠ Antigravity는 K-1의 결과물을 "시각 보정만" 수행

---

## 2. 목표 (Objectives)

### 2.1 Primary Goal

**"Partner 비즈니스가 실제로 작동하는지 증명"**

- Consumer → Partner 전환 흐름 완성
- Partner 활동 → 수익 발생 경로 확정
- Attribution/Tracking 시스템 연결

### 2.2 Success Criteria

| 기준 | 상태 |
|------|------|
| Partner Landing Page 접근 가능 | ☐ |
| Partner Signup Flow 작동 | ☐ |
| Partner Dashboard 기본 기능 | ☐ |
| 추천 링크 생성 및 클릭 추적 | ☐ |
| Consumer → Partner Attribution 연결 | ☐ |
| 루틴 → 파트너 콘텐츠 연결 | ☐ |

---

## 3. 현황 분석 (As-Is)

### 3.1 기존 Partner 패키지 구조

```
packages/
├── partner-core/           # Core: Entity, Service
│   ├── entities/
│   │   ├── Partner.entity.ts
│   │   ├── PartnerLink.entity.ts
│   │   ├── PartnerClick.entity.ts
│   │   ├── PartnerCommission.entity.ts
│   │   └── PartnerConversion.entity.ts
│   └── services/
│       ├── PartnerService.ts
│       ├── PartnerLinkService.ts
│       ├── PartnerClickService.ts
│       └── PartnerConversionService.ts
├── partnerops/             # Extension: 운영용 앱
├── partner-ai-builder/     # Feature: AI 콘텐츠 빌더
└── cosmetics-partner-extension/  # Service Extension
```

### 3.2 현재 상태 평가

| 구성요소 | 상태 | 비고 |
|----------|------|------|
| partner-core Entity | ✅ 존재 | 기본 구조 완성 |
| partner-core Service | ✅ 존재 | 기본 CRUD 완성 |
| Partner Landing | ❌ 미구현 | 진입점 없음 |
| Partner Dashboard | ⚠️ 부분 | Admin용만 존재 |
| Consumer-facing 연결 | ❌ 미구현 | Attribution 없음 |
| 추천 링크 UX | ❌ 미구현 | 생성만 가능 |

### 3.3 Gap Analysis

**Critical Gaps:**

1. **Partner 진입점 부재**
   - Consumer가 Partner가 되는 경로 없음
   - Partner Landing Page 없음
   - Signup/Onboarding Flow 없음

2. **Attribution 연결 부재**
   - 추천 링크 → 주문 귀속 연결 미완성
   - Consumer-side 파트너 코드 인식 없음

3. **Partner Dashboard (Consumer-facing)**
   - Admin Dashboard만 존재
   - Partner 본인용 Dashboard 없음

---

## 4. 작업 범위 (Scope)

### 4.1 In-Scope (이번 Phase에서 구현)

#### A. Partner 진입 구조

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| Partner Landing Page | `/partner` 진입 페이지 | P0 |
| Partner Signup Flow | 회원 → 파트너 전환 | P0 |
| Partner Onboarding | 초기 설정 가이드 | P1 |

#### B. Partner Dashboard (본인용)

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| Dashboard Home | 요약 지표, 빠른 액션 | P0 |
| 추천 링크 관리 | 링크 생성/복사/통계 | P0 |
| 수익 현황 | 전환/커미션 조회 | P1 |
| 콘텐츠 관리 | 루틴 콘텐츠 연결 | P1 |

#### C. Consumer-side Attribution

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| 파트너 코드 인식 | URL param → cookie/session | P0 |
| 주문 귀속 | checkout 시 partner_id 연결 | P0 |
| 전환 기록 | PartnerConversion 자동 생성 | P0 |

#### D. 라우팅 구조

```
/partner                    # Partner Landing (Primary)
/business/partner           # Partner Landing (Alias) → 동일 컴포넌트
/partner/signup             # Partner Signup
/partner/dashboard          # Partner Dashboard Home
/partner/dashboard/links    # 추천 링크 관리
/partner/dashboard/earnings # 수익 현황
/partner/dashboard/content  # 콘텐츠 관리
```

> **라우팅 원칙**: `/partner`와 `/business/partner`는 동일한 `PartnerLanding` 컴포넌트로 연결
> SEO/마케팅 목적의 복수 진입점 허용, 내부 로직은 단일 컴포넌트로 통합

### 4.2 Out-of-Scope (이번 Phase에서 하지 않음)

| 제외 항목 | 사유 | 예정 Phase |
|-----------|------|------------|
| 정산 시스템 | partner-core 연동으로 충분 | - |
| Partner Tier/등급 | MVP 이후 | Phase L+ |
| 파트너 간 경쟁/랭킹 | MVP 이후 | Phase L+ |
| SNS 자동 공유 | MVP 이후 | Phase L+ |
| 시각적 디자인 보정 | Phase K-2 | K-2 |
| 애니메이션/마이크로인터랙션 | Phase K-2 | K-2 |

---

## 5. 기술 설계 (Technical Design)

### 5.1 라우팅 구조

```typescript
// apps/main-site 또는 apps/ecommerce
// Partner 전용 라우트

// Primary Route
<Route path="/partner">
  <Route index element={<PartnerLanding />} />
  <Route path="signup" element={<PartnerSignup />} />
  <Route path="dashboard" element={<PartnerDashboardLayout />}>
    <Route index element={<PartnerDashboardHome />} />
    <Route path="links" element={<PartnerLinks />} />
    <Route path="earnings" element={<PartnerEarnings />} />
    <Route path="content" element={<PartnerContent />} />
  </Route>
</Route>

// Alias Route (동일 컴포넌트)
<Route path="/business/partner" element={<PartnerLanding />} />
```

### 5.2 Consumer Attribution Flow

#### Attribution 원칙 (확정)

| 원칙 | 설명 |
|------|------|
| **Last-touch** | 마지막으로 클릭한 파트너 링크가 귀속 |
| **TTL 갱신** | 재클릭 시 cookie TTL(30일) 갱신 |
| **로그인 매핑** | 로그인 시 cookie → userId 매핑 (비로그인 전환도 추적) |
| **자기귀속 방지** | 파트너 본인의 주문은 귀속 제외 |

#### Flow

```
1. Consumer clicks partner link
   → /products/123?ref=PARTNER_CODE

2. Attribution Middleware captures (Last-touch)
   → setCookie('partner_ref', PARTNER_CODE, 30d)
   → 재클릭 시 TTL 갱신 (기존 값 덮어쓰기)

3. Consumer logs in (optional)
   → mapCookieToUser(userId, cookie.partner_ref)
   → 비로그인 상태에서도 cookie로 추적 유지

4. Consumer completes checkout
   → partnerId = resolvePartner(cookie.partner_ref || user.attributedPartnerId)
   → if (partnerId !== currentUser.partnerId) // 자기귀속 방지
       EcommerceOrderService.create({ partnerId })

5. Conversion recorded
   → PartnerConversionService.recordConversion({
       partnerId, orderId, orderAmount
     })
```

### 5.3 State Management

```typescript
// Partner Context (Consumer-facing)
interface PartnerContext {
  currentPartner: Partner | null;
  isPartner: boolean;
  links: PartnerLink[];
  stats: {
    totalClicks: number;
    totalConversions: number;
    totalEarnings: number;
  };
}
```

### 5.4 API Endpoints (신규)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/partner/signup` | 파트너 가입 |
| GET | `/api/partner/me` | 현재 파트너 정보 |
| GET | `/api/partner/dashboard` | 대시보드 요약 |
| POST | `/api/partner/links` | 링크 생성 |
| GET | `/api/partner/links` | 링크 목록 |
| GET | `/api/partner/earnings` | 수익 현황 |

---

## 6. 작업 단계 (Implementation Steps)

### Phase K-1.1: 기반 구조 (Foundation)

- [ ] Partner 라우트 구조 생성
- [ ] Partner Context 구현
- [ ] Partner API Controller 추가
- [ ] Attribution Middleware 구현

### Phase K-1.2: Partner 진입 (Entry)

- [ ] Partner Landing Page 구현
- [ ] Partner Signup Flow 구현
- [ ] Consumer → Partner 전환 로직

### Phase K-1.3: Partner Dashboard (Dashboard)

- [ ] Dashboard Layout 구현
- [ ] Dashboard Home (요약 지표)
- [ ] Links 관리 페이지
- [ ] Earnings 조회 페이지

### Phase K-1.4: Attribution 연결 (Attribution)

- [ ] Partner Code URL 파라미터 처리
- [ ] Cookie/Session 저장 로직
- [ ] Checkout 시 partner_id 귀속
- [ ] Conversion 자동 기록

### Phase K-1.5: 통합 테스트 (Integration)

- [ ] E2E 시나리오 테스트
- [ ] Partner Signup → Link 생성 → Click → Purchase → Conversion

---

## 7. 의존성 (Dependencies)

### 7.1 사용하는 기존 패키지

| 패키지 | 용도 |
|--------|------|
| partner-core | Entity, Service |
| auth-client | 인증/권한 |
| ecommerce-core | 주문 연동 |
| ui | Design Core v1.0 컴포넌트 |

### 7.2 수정하는 기존 코드

| 파일 | 수정 내용 |
|------|-----------|
| apps/ecommerce/src/App.tsx | Partner 라우트 추가 |
| apps/api-server/src/modules | Partner API 모듈 등록 |
| ecommerce-core checkout | partner_id 귀속 로직 |

---

## 8. 완료 기준 (Definition of Done)

### 8.1 기능 검증

- [ ] `/partner` 접근 시 Landing Page 렌더링
- [ ] 로그인 사용자 Partner 가입 가능
- [ ] Partner Dashboard 접근 및 기본 정보 표시
- [ ] 추천 링크 생성 및 복사 기능
- [ ] 링크 클릭 시 Attribution Cookie 설정
- [ ] 주문 완료 시 partner_id 귀속 확인
- [ ] Conversion 자동 기록 확인

### 8.2 기술 검증

- [ ] `pnpm build` 성공
- [ ] TypeScript 에러 없음
- [ ] 콘솔 에러 없음
- [ ] API 응답 정상

### 8.3 문서화

- [ ] API 스펙 문서 업데이트
- [ ] Phase K-1 완료 보고서

---

## 9. Phase K-2 Preview (Antigravity)

> Phase K-1 완료 후 진행

### K-2 적용 범위

- Partner Landing 시각 톤 보정
- Dashboard 카드/레이아웃 미세 조정
- 콘텐츠 강조 흐름

### K-2 제한 사항

- 구조 변경 ❌
- UX 흐름 변경 ❌
- 기능 변경 ❌
- Claude Code 결과물의 시각 보정만 허용

---

## 10. 위험 요소 (Risks)

| 위험 | 영향 | 완화 방안 |
|------|------|-----------|
| partner-core API 불완전 | 기능 제한 | 선행 API 검증 |
| Attribution 손실 | 전환 추적 실패 | Cookie 만료 정책 검토 |
| 인증 복잡성 | 구현 지연 | auth-client 활용 |

---

## 브랜치 정보

```bash
# 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/phase-k-partner-flow

# 커밋 컨벤션
git commit -m "feat(partner): Phase K-1.1 - Foundation structure"
git commit -m "feat(partner): Phase K-1.2 - Partner Landing & Signup"
git commit -m "feat(partner): Phase K-1.3 - Partner Dashboard"
git commit -m "feat(partner): Phase K-1.4 - Attribution integration"
```

---

## 관련 문서

- [PartnerOps Overview](../../specs/partnerops/partnerops-overview.md)
- [PartnerOps API](../../specs/partnerops/partnerops-api.md)
- [Work Order Standard Header](../../app-guidelines/work-order-standard-header.md)
- [Design Core Governance](../../app-guidelines/design-core-governance.md)

---

*Work Order Created: 2025-12-18*
*Target Branch: feature/phase-k-partner-flow*
*Tool: Claude Code (Phase K-1)*
*Status: Draft - Awaiting Approval*
