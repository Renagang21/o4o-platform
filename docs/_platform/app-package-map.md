# App Package Map (O4O Platform)

> **Status**: Active
> **Created**: 2025-12-24
> **Updated**: 2025-12-25
> **Phase**: R8 Unused Package Drop

---

## 1. 패키지 개요

| 구분 | 수량 |
|------|------|
| 총 패키지 (packages/) | 53개 |
| 총 앱 (apps/) | 11개 |
| **전체** | **64개** |

> R7에서 Legacy 패키지 4개 삭제: admin, commerce, customer, lms-marketing
> R8에서 미사용 패키지 1개 삭제: design-system-cosmetics

---

## 2. Apps (실행체)

```
apps/
├── api-server/          # Core API Server (Express + TypeORM)
├── admin-dashboard/     # 관리자 대시보드 (React)
├── main-site/           # 메인 사이트 (React)
├── ecommerce/           # 이커머스 프론트엔드
├── api-gateway/         # API Gateway (개발 중)
├── mobile-app/          # 모바일 앱 (React Native)
├── digital-signage-agent/ # 사이니지 에이전트
├── funding/             # 펀딩 서비스
├── healthcare/          # 헬스케어 서비스
├── page-generator/      # 페이지 생성기
└── vscode-extension/    # VSCode 확장
```

---

## 3. Core Packages (FROZEN)

> ⚠️ 이 패키지들은 구조/테이블 변경 금지

```
packages/
├── auth-core/           # 인증 Core (FROZEN)
├── cms-core/            # CMS Core (FROZEN)
├── platform-core/       # 플랫폼 Core (FROZEN)
└── organization-core/   # 조직 Core (FROZEN, R3.5 흡수)
```

---

## 4. Domain Core Packages

```
packages/
├── forum-core/          # 포럼 도메인 Core
├── ecommerce-core/      # 이커머스 도메인 Core
├── lms-core/            # LMS 도메인 Core
├── dropshipping-core/   # 드롭쉬핑 도메인 Core
├── digital-signage-core/ # 디지털 사이니지 Core
├── partner-core/        # 파트너 도메인 Core
├── diabetes-core/       # 당뇨 도메인 Core
├── pharmaceutical-core/ # 제약 도메인 Core
└── block-core/          # 블록 에디터 Core
```

---

## 5. Extension Packages

### 5.1 Cosmetics Extensions
```
packages/
├── cosmetics-seller-extension/
├── cosmetics-supplier-extension/
├── cosmetics-partner-extension/
├── cosmetics-sample-display-extension/
├── dropshipping-cosmetics/
└── forum-cosmetics/
```

> R8 삭제: ~~design-system-cosmetics~~ (미사용, ui 패키지로 통합)

### 5.2 Yaksa Extensions
```
packages/
├── forum-yaksa/
├── membership-yaksa/
├── member-yaksa/
├── lms-yaksa/
├── reporting-yaksa/
├── annualfee-yaksa/
├── groupbuy-yaksa/
├── yaksa-accounting/
├── yaksa-admin/
└── yaksa-scheduler/
```

### 5.3 Healthcare Extensions
```
packages/
├── health-extension/
├── diabetes-pharmacy/
├── pharmacy-ai-insight/
├── cgm-pharmacist-app/
└── signage-pharmacy-extension/
```

### 5.4 Integration Extensions
```
packages/
├── organization-forum/      # organization + forum 통합
├── organization-lms/        # organization + lms 통합 (TBD)
├── digital-signage-contract/
└── supplier-connector/
```

---

## 6. Ops Packages (운영 도구)

```
packages/
├── sellerops/           # 셀러 운영
├── supplierops/         # 공급업체 운영
├── partnerops/          # 파트너 운영
└── pharmacyops/         # 약국 운영
```

---

## 7. UI/Utility Packages

```
packages/
├── ui/                  # Design Core v1.0
├── types/               # 공통 타입
├── utils/               # 공통 유틸리티
├── auth-client/         # 인증 클라이언트
├── auth-context/        # 인증 컨텍스트
├── shortcodes/          # 숏코드 시스템
├── block-renderer/      # 블록 렌더러
├── slide-app/           # 슬라이드 앱
├── cpt-registry/        # CPT 레지스트리
├── appearance-system/   # 외관 시스템
└── forum-app/           # 포럼 앱 (프론트)
```

---

## 8. Other Packages

```
packages/
├── @o4o-apps/           # 앱 메타 패키지
├── market-trial/        # 마켓 트라이얼
└── partner-ai-builder/  # AI 빌더
```

> R7 삭제: ~~admin~~, ~~commerce~~, ~~customer~~, ~~lms-marketing~~

---

## 9. 의존성 관계도

### 9.1 Core 계층 (Layer 0)
```
auth-core ─┬─→ platform-core
           └─→ organization-core
cms-core ────→ platform-core
```

### 9.2 Domain Core 계층 (Layer 1)
```
forum-core ────────→ platform-core
ecommerce-core ────→ platform-core
lms-core ──────────→ platform-core
dropshipping-core ─→ platform-core, ecommerce-core
```

### 9.3 Extension 계층 (Layer 2)
```
cosmetics-seller-extension ──→ dropshipping-core
cosmetics-supplier-extension → dropshipping-core
forum-yaksa ─────────────────→ forum-core
forum-cosmetics ─────────────→ forum-core
organization-forum ──────────→ organization-core, forum-core
```

### 9.4 Feature/Service 계층 (Layer 3)
```
membership-yaksa ──→ organization-core
member-yaksa ──────→ organization-core
lms-yaksa ─────────→ lms-core
reporting-yaksa ───→ organization-core
```

---

## 10. 금지된 의존성

| From | To | 사유 |
|------|-----|------|
| Core | Extension | 역방향 의존 금지 |
| Core | Service | 역방향 의존 금지 |
| Extension | api-server | 직접 import 금지 |
| Any | FROZEN Core (구조 변경) | 동결 정책 |

---

*Phase R8: WO-GEN-PLATFORM-R8-DROP-DESIGN-SYSTEM-COSMETICS*
*Updated: 2025-12-25*
