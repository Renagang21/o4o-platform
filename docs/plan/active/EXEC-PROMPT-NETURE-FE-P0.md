# 🧠 Claude Code 실행 프롬프트

## Neture P0 – Frontend Prototype (Mock 기반)

**대상**: Claude Code / AI 개발 에이전트
**용도**: 아래 내용을 그대로 복사하여 실행

---

## 📌 CONTEXT

당신은 O4O Platform의 Frontend 개발자입니다.
지금부터 **Neture P0 웹 서비스의 Frontend 프로토타입**을 구현합니다.

이 작업은 **WO-NETURE-CORE-V1** 및
**FE-WO-NETURE-CORE-P0**를 **절대적 기준**으로 합니다.

Neture는 다음 성격을 가집니다:

* 주문 ❌
* 결제 ❌
* 정산 ❌
* 내부 메시지 ❌
* 관리 콘솔 ❌

👉 **읽기 전용(Read-only) 정보 플랫폼**입니다.

---

## 🔒 HARD RULES (위반 시 즉시 중단)

1. POST / PUT / DELETE UI 또는 API ❌
2. "신청 / 승인 / 관리 / 대시보드" UI ❌
3. 제휴 요청 생성·수정·선택 버튼 ❌
4. 주문·결제·성과 관련 UI ❌
5. Neture 전용 판매자/파트너 대시보드 ❌

⚠️ 위 요구가 필요하다고 느껴지면
**즉시 작업을 멈추고 ChatGPT에게 판단을 요청**하십시오.

---

## 🧩 TECH STACK (이미 존재하는 기준 따름)

* React 19
* TypeScript
* Vite
* TailwindCSS
* Design Core v1.0 (`packages/ui`)
* Routing: React Router v6
* 참조 패턴:
  - GlycoPharm HomePage: `services/web-glycopharm/src/pages/HomePage.tsx`
  - K-Cosmetics HomePage: `services/web-k-cosmetics/src/pages/HomePage.tsx`

---

## 🎯 GOAL (이번 작업의 목적)

> **"이 화면만 보고도
> Neture가 관리툴이 아니라
> '정보·선택·연결 플랫폼'임을 오해 없이 이해할 수 있게 할 것"**

Backend 연동은 하지 않습니다.
**모든 데이터는 Mock 데이터**로 처리합니다.

---

## 🗂️ IMPLEMENTATION SCOPE

### 1️⃣ Global Layout

* 상단 네비게이션:
  ```
  Home | 공급자 | 제휴 요청 | 콘텐츠
  ```
* "대시보드" 메뉴 없음
* 로그인 상태에 따른 UI 변화 없음

---

### 2️⃣ Home Page

**파일**
```
/pages/HomePage.tsx
```

**구현**

* Hero
  * Headline:
    > 공급자를 찾고, 제휴를 연결하는 유통 정보 플랫폼
  * Subtext:
    > 주문·결제 없이 조건과 기회를 투명하게 확인하세요
  * CTA:
    * 공급자 보기 → /suppliers
    * 제휴 요청 보기 → /partners/requests

* 공급자 미리보기 섹션
  * 카드 4~6개
  * 로고 / 이름 / 카테고리
  * 클릭 → `/suppliers/{slug}`

* 제휴 요청 미리보기 섹션
  * 판매자명
  * 서비스 유형 badge
  * 제품 수
  * 제휴 기간
  * 제휴 기준 수익 구조
  * CTA: "제휴 조건 보기"

---

### 3️⃣ Supplier Detail Page

**파일**
```
/pages/suppliers/[supplierSlug].tsx
```

**구현**

* 공급자 로고 / 이름 / 한 줄 소개
* 외부 연락 버튼:
  * Email / Phone / Website / Kakao (외부 링크만)
* 소개 텍스트 섹션
* 제품 리스트 (이름 / 카테고리 / 설명)
* 유통 조건 섹션
  * 가격 정책(텍스트)
  * MOQ
  * 배송 정책 (일반 / 도서 / 산간)
* 하단 안내 문구:
  > 거래를 원하시면 각 서비스의 판매자 대시보드에서 신청하세요

❌ 신청 버튼 금지

---

### 4️⃣ Partnership Request List

**파일**
```
/pages/partners/requests/index.tsx
```

**구현**

* 타이틀:
  > 제휴 파트너를 찾는 판매자
* 설명:
  > 단일 판매자와 기간 제휴 형태로 진행됩니다
* 필터:
  * 서비스 유형
  * 카테고리
  * 상태 (OPEN / MATCHED)
* 카드:
  * 판매자명
  * 서비스 유형
  * 제품 수
  * 기간
  * 상태 badge
  * CTA: "조건 보기"

---

### 5️⃣ Partnership Request Detail

**파일**
```
/pages/partners/requests/[id].tsx
```

**구현**

* 상단 요약:
  * 판매자명
  * 서비스 유형
  * 기간
  * 상태 badge
* 제휴 대상 제품 리스트
* 제휴 기준 수익 구조
  * 하단 고정 문구:
    > 본 조건은 참고용이며 실제 정산은 외부 협의로 진행됩니다
* 홍보 범위 표시 (true인 항목만)
* 협의 CTA:
  * Email / Phone / Kakao (외부 링크)

❌ 선택 / 신청 / 지원 버튼 금지

---

## 📦 MOCK DATA

다음 문서의 Mock 데이터를 사용:
- `docs/plan/active/FE-WO-NETURE-CORE-P0.md`
- `docs/plan/active/API-CONTRACT-NETURE-P0.md`

### Mock Data Examples

**공급자 Mock:**
```typescript
const mockSuppliers = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    slug: "abc-pharma",
    name: "ABC 제약",
    logo: "https://via.placeholder.com/150",
    category: "의약품",
    shortDescription: "검증된 의약품 공급자",
    description: "ABC 제약은 20년 경력의 의약품 전문 공급자입니다.",
    products: [
      { id: "1", name: "비타민 C", category: "건강기능식품", description: "고함량 비타민 C" },
      { id: "2", name: "오메가3", category: "건강기능식품", description: "프리미엄 오메가3" }
    ],
    pricingPolicy: "도매가 기준 20% 할인",
    moq: "50개 이상",
    shippingPolicy: {
      standard: "무료 배송",
      island: "3,000원",
      mountain: "5,000원"
    },
    contact: {
      email: "contact@abc-pharma.com",
      phone: "02-1234-5678",
      website: "https://abc-pharma.com",
      kakao: "https://pf.kakao.com/abc-pharma"
    }
  }
];
```

**제휴 요청 Mock:**
```typescript
const mockPartnershipRequests = [
  {
    id: "660e8400-e29b-41d4-a716-446655440001",
    seller: {
      id: "seller-1",
      name: "서울약국",
      serviceType: "glycopharm",
      storeUrl: "https://glycopharm.co.kr/store/seoul-pharmacy"
    },
    productCount: 12,
    period: {
      start: "2026-02-01",
      end: "2026-07-31"
    },
    revenueStructure: "매출의 5% 수익 배분 (홍보 활동 기준)",
    status: "OPEN",
    products: [
      { id: "1", name: "당뇨 영양제", category: "건강기능식품" },
      { id: "2", name: "혈당 측정기", category: "의료기기" }
    ],
    promotionScope: {
      sns: true,
      content: true,
      banner: false,
      other: "월 1회 뉴스레터 발송"
    },
    contact: {
      email: "seoul@pharmacy.com",
      phone: "010-1234-5678",
      kakao: "https://pf.kakao.com/seoul-pharmacy"
    },
    createdAt: "2026-01-15T00:00:00Z",
    matchedAt: null
  }
];
```

---

## 📁 PROJECT STRUCTURE

```
services/web-neture/
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── suppliers/
│   │   │   └── SupplierDetailPage.tsx
│   │   └── partners/
│   │       └── requests/
│   │           ├── PartnershipRequestListPage.tsx
│   │           └── PartnershipRequestDetailPage.tsx
│   ├── components/
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx
│   │   └── common/
│   ├── data/
│   │   └── mockData.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

---

## ✅ DONE CONDITION

* [ ] 모든 페이지 정상 라우팅
* [ ] 관리 콘솔처럼 보이지 않음
* [ ] 모든 CTA는 탐색 또는 외부 이동
* [ ] Design Core v1.0 컴포넌트 사용 (또는 GlycoPharm 패턴 참조)
* [ ] 콘솔 에러 없음
* [ ] `pnpm build` 성공

---

## 🛑 FINAL INSTRUCTION

이 작업은 **P0 프로토타입**입니다.
"더 잘 만들어 보자"라는 이유로 기능을 추가하지 마십시오.

> **보여주는 데 성공하면, 이번 단계는 성공입니다.**

위 HARD RULES를 위반하는 요구사항이 발견되면
**즉시 작업을 중단하고 사용자에게 보고**하십시오.

---

## 🚀 EXECUTION STEPS

1. `feature/neture-core-v1` 브랜치 생성
2. `services/web-neture` 디렉터리 구조 생성
3. Mock 데이터 파일 작성
4. Layout 및 라우팅 설정
5. 각 페이지 구현 (순서: Home → Supplier List → Supplier Detail → Partnership List → Partnership Detail)
6. 빌드 및 검증
7. 완료 보고

---

**Work Order**: WO-NETURE-CORE-V1
**Phase**: P0 Prototype
**생성일**: 2026-01-11
**실행 환경**: Claude Code / AI 개발 에이전트
