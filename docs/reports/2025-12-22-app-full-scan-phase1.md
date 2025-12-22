# 1단계: 전체 App 1차 스캔 조사결과

**범용 전자상거래 사업자 서비스 구축 – App Store 재정비 작업**

- **조사일**: 2025-12-22
- **조사자**: Claude Code (Opus 4.5)
- **버전**: v1.0

---

## 1. 조사 요약 (Executive Summary)

| 구분 | 개수 |
|------|------|
| **packages/** 총 앱 | 57개 |
| **apps/** 실행체 | 11개 |
| **extensions/** | 1개 |
| **manifest.ts 보유** | 42개 |
| **Core 앱** | 11개 |
| **Extension 앱** | 27개 |
| **기타 (infra/utility)** | 19개 |

---

## 2. 전체 App 리스트 테이블

### A. Core Apps (11개)

| App ID | 위치 | 역할 요약 | appType | 사용 여부 | 비고 |
|--------|------|-----------|---------|----------|------|
| `platform-core` | packages | 앱 레지스트리, 설정, 계정 활동 관리 | core | **Active** | FROZEN |
| `auth-core` | packages | 인증, RBAC, 사용자/역할/권한 관리 | core | **Active** | FROZEN |
| `cms-core` | packages | 템플릿, CPT, ACF, 뷰, 메뉴, 미디어 | core | **Active** | FROZEN |
| `organization-core` | packages | 조직 계층 관리 (본회/지부/분회) | core | **Active** | FROZEN |
| `ecommerce-core` | packages | 판매 주문 원장 (Sales Order Source of Truth) | core | **Active** | 주문/결제 필수 Core |
| `dropshipping-core` | packages | 산업 중립적 드랍쉬핑 엔진 | core | **Active** | |
| `forum-app` | packages | 커뮤니티 포럼 (게시글, 댓글, 카테고리) | core | **Active** | |
| `lms-core` | packages | 학습 관리 시스템 (강좌, 수강, 인증서) | core | **Active** | |
| `digital-signage-core` | packages | 미디어, 디스플레이, 스케줄 관리 | core | **Active** | |
| `pharmaceutical-core` | packages | B2B 의약품 유통 워크플로우 | core | **Active** | |
| `partner-core` | packages | 클릭/전환/수수료/정산 워크플로우 | core | **Active** | 신규 |

---

### B. Extension Apps - 서비스별 확장앱 (27개)

#### B-1. Yaksa (약사회) 서비스군 (11개)

| App ID | 위치 | 역할 요약 | appType | 사용 여부 | 비고 |
|--------|------|-----------|---------|----------|------|
| `membership-yaksa` | packages | 회원 관리, 검증, 소속 시스템 | extension | **Active** | Organization 확장 |
| `forum-yaksa` | packages | 약사 전용 포럼 (약물DB, 케이스스터디) | extension | **Active** | Forum 확장 |
| `lms-yaksa` | packages | 약사회 교육/연수 시스템 | extension | **Active** | LMS 확장 |
| `reporting-yaksa` | packages | 연간 현황 보고, 승인 워크플로우 | extension | **Active** | |
| `annualfee-yaksa` | packages | 연회비 정책, 청구, 납부, 감면 | extension | **Active** | |
| `groupbuy-yaksa` | packages | 지부/분회 주도 공동구매 | extension | **Active** | 최근 개발 |
| `member-yaksa` | packages | 회원용 프로필, 약국, 홈 대시보드 | extension | **Active** | |
| `yaksa-admin` | packages | 지부/분회 관리자 관제 센터 | extension | **Active** | |
| `yaksa-scheduler` | packages | 중앙 스케줄러 (Cron 기반) | extension | **Active** | |
| `yaksa-accounting` | packages | 지부/분회 디지털 현금출납부 | extension | Development | |
| `pharmacyops` | packages | 약국 운영앱 (B2B 의약품) | extension | **Active** | |

#### B-2. Cosmetics (화장품) 서비스군 (7개)

| App ID | 위치 | 역할 요약 | appType | 사용 여부 | 비고 |
|--------|------|-----------|---------|----------|------|
| `dropshipping-cosmetics` | packages | 화장품 드랍쉬핑 산업 확장 | extension | **Active** | Dropshipping 확장 |
| `cosmetics-seller-extension` | packages | 셀러 매장 운영 관리 | extension | **Active** | |
| `cosmetics-supplier-extension` | packages | 브랜드/공급사 관리 | extension | **Active** | |
| `cosmetics-partner-extension` | packages | 파트너/인플루언서 제휴 판매 | extension | **Active** | |
| `cosmetics-sample-display-extension` | packages | 샘플/테스터, 진열, 전환율 관리 | extension | Development | |
| `forum-cosmetics` | packages | 화장품 포럼 (피부타입, 성분분석) | extension | **Active** | Forum 확장 |
| `design-system-cosmetics` | packages | Antigravity 디자인 시스템 | utility | Partial | |

#### B-3. Ops (운영) 서비스군 (3개)

| App ID | 위치 | 역할 요약 | appType | 사용 여부 | 비고 |
|--------|------|-----------|---------|----------|------|
| `sellerops` | packages | 범용 셀러 운영앱 | extension | **Active** | |
| `supplierops` | packages | 범용 공급자 운영앱 | extension | **Active** | |
| `partnerops` | packages | 파트너 운영앱 (Partner-Core 기반) | extension | **Active** | |

#### B-4. 기타 Extension (6개)

| App ID | 위치 | 역할 요약 | appType | 사용 여부 | 비고 |
|--------|------|-----------|---------|----------|------|
| `health-extension` | packages | 건강기능식품/건강제품 산업 확장 | extension | Development | |
| `organization-forum` | packages | 조직-포럼 통합 (자동 카테고리 생성) | extension | **Active** | |
| `organization-lms` | packages | 조직-LMS 통합 (조직별 강좌) | extension | Development | |
| `lms-marketing` | packages | LMS 마케팅 확장 | extension | Development | |
| `market-trial` | packages | 공급사 제품 체험 펀딩 | extension | Development | |
| `signage-pharmacy-extension` | packages | 약국 디지털 사이니지 확장 | extension | **Active** | Phase 3 완료 |

---

### C. Signage/Healthcare 특화앱 (4개)

| App ID | 위치 | 역할 요약 | appType | 사용 여부 | 비고 |
|--------|------|-----------|---------|----------|------|
| `digital-signage-contract` | packages | Signage 확장 개발용 계약/타입 | utility | **Active** | |
| `diabetes-core` | packages | CGM/BGM 혈당 데이터 분석/코칭 | core (가설) | Development | 신규 |
| `diabetes-pharmacy` | packages | 혈당관리 세미프랜차이즈 약국 실행앱 | extension | Development | 신규 |
| `pharmacy-ai-insight` | packages | 약사 전용 AI 인사이트 도구 | extension | Development | Phase 3 진행중 |
| `partner-ai-builder` | packages | AI 기반 파트너 콘텐츠 생성 | extension | Development | |

---

### D. Infrastructure/Utility Apps (11개) - AppStore 비대상

| App ID | 위치 | 역할 요약 | appType | 사용 여부 | 비고 |
|--------|------|-----------|---------|----------|------|
| `types` | packages | 공유 TypeScript 타입 | infra-core | **Active** | |
| `utils` | packages | 공유 유틸리티 함수 | infra-core | **Active** | |
| `ui` | packages | 공유 UI 컴포넌트 (Design Core v1.0) | infra-core | **Active** | |
| `auth-client` | packages | 인증 클라이언트 | infra-core | **Active** | |
| `auth-context` | packages | 인증 컨텍스트 | infra-core | **Active** | |
| `appearance-system` | packages | 디자인 토큰/외관 시스템 | infra-core | **Active** | |
| `block-core` | packages | 블록 플러그인 시스템 | infra-core | **Active** | |
| `block-renderer` | packages | 통합 블록 렌더링 엔진 | infra-core | **Active** | |
| `cpt-registry` | packages | CPT 스키마 레지스트리 | infra-core | **Active** | |
| `shortcodes` | packages | 숏코드 시스템 | infra-core | **Active** | |
| `slide-app` | packages | 통합 슬라이드/캐러셀 컴포넌트 | utility | **Active** | |
| `supplier-connector` | packages | 드랍쉬핑 공급자 커넥터 프레임워크 | utility | Development | |

---

### E. Application 실행체 (11개) - AppStore 비대상

| App ID | 위치 | 역할 요약 | appType | 사용 여부 | 비고 |
|--------|------|-----------|---------|----------|------|
| `admin-dashboard` | apps | WordPress 스타일 관리자 대시보드 | application | **Active** | 운영중 |
| `api-server` | apps | NestJS 기반 API 서버 | application | **Active** | 운영중 |
| `api-gateway` | apps | API 게이트웨이 | application | Planned | |
| `main-site` | apps | Next.js 메인 사이트 | application | **Active** | 운영중 |
| `ecommerce` | apps | 이커머스 프론트엔드 | application | Development | |
| `digital-signage-agent` | apps | 매장측 디스플레이 컨트롤러 | application | **Active** | |
| `mobile-app` | apps | Capacitor + React 모바일 앱 | application | Planned | |
| `page-generator` | apps | AI 기반 페이지 생성기 | application | Development | |
| `healthcare` | apps | 헬스케어 앱 | application | Planned | 빈 폴더 |
| `vscode-extension` | apps | VSCode 통합 확장 | application | Development | |
| `admin` | packages/@o4o-apps | 레거시 Admin 앱 | legacy | Deprecated | |
| `commerce` | packages/@o4o-apps | 레거시 Commerce 앱 | legacy | Deprecated | |
| `customer` | packages/@o4o-apps | 레거시 Customer 앱 | legacy | Deprecated | |
| `signage` | packages/@o4o-apps | 레거시 Signage 앱 | legacy | Deprecated | |

---

### F. Extensions 폴더 (1개)

| App ID | 위치 | 역할 요약 | appType | 사용 여부 | 비고 |
|--------|------|-----------|---------|----------|------|
| `o4o-integration` | extensions | VSCode 블록 변환 확장 (.vsix) | utility | Development | 빌드 산출물만 존재 |

---

## 3. Active vs Legacy 목록 구분

### A. Active 앱 (현재 사용 중) - 40개

**Core (11개)**
- platform-core, auth-core, cms-core, organization-core
- ecommerce-core, dropshipping-core, forum-app, lms-core
- digital-signage-core, pharmaceutical-core, partner-core

**Extension (22개)**
- Yaksa: membership-yaksa, forum-yaksa, lms-yaksa, reporting-yaksa, annualfee-yaksa, groupbuy-yaksa, member-yaksa, yaksa-admin, yaksa-scheduler, pharmacyops
- Cosmetics: dropshipping-cosmetics, cosmetics-seller-extension, cosmetics-supplier-extension, cosmetics-partner-extension, forum-cosmetics
- Ops: sellerops, supplierops, partnerops
- 기타: organization-forum, signage-pharmacy-extension

**Infra/Utility (7개)**
- types, utils, ui, auth-client, auth-context, appearance-system, block-core, block-renderer, cpt-registry, shortcodes, slide-app

### B. Development 앱 (개발 중) - 12개

- yaksa-accounting, cosmetics-sample-display-extension
- health-extension, organization-lms, lms-marketing, market-trial
- diabetes-core, diabetes-pharmacy, pharmacy-ai-insight, partner-ai-builder
- supplier-connector, ecommerce (app)

### C. Legacy/Deprecated 앱 (폐기 예정) - 4개

| App ID | 위치 | 폐기 사유 |
|--------|------|-----------|
| `admin` | packages/@o4o-apps | apps/admin-dashboard로 대체됨 |
| `commerce` | packages/@o4o-apps | ecommerce-core + apps/ecommerce로 대체됨 |
| `customer` | packages/@o4o-apps | 사용되지 않음 |
| `signage` | packages/@o4o-apps | digital-signage-core로 대체됨 |

### D. Planned/Empty 앱 (미구현) - 3개

- apps/api-gateway: 계획만 존재
- apps/mobile-app: 계획만 존재
- apps/healthcare: 빈 폴더

---

## 4. 중복/유사 기능 탐지

### A. 잠재적 중복 영역

| 영역 | 앱들 | 분석 |
|------|------|------|
| **Admin 기능** | `admin` (legacy), `admin-dashboard` (active), `yaksa-admin` | admin은 폐기, yaksa-admin은 약사회 전용이므로 중복 아님 |
| **Commerce 기능** | `commerce` (legacy), `ecommerce-core` (active), `ecommerce` (app) | commerce는 폐기 예정, ecommerce-core가 새 기준 |
| **Signage 기능** | `signage` (legacy), `digital-signage-core` (active) | signage는 폐기 예정 |
| **Seller 관련** | `sellerops`, `cosmetics-seller-extension` | sellerops는 범용, cosmetics-seller-extension은 화장품 특화로 명확히 분리됨 |
| **Partner 관련** | `partnerops`, `cosmetics-partner-extension`, `partner-core` | partner-core가 기반, 나머지는 확장앱으로 적절히 분리됨 |

### B. 통합 검토 필요 영역

| 영역 | 앱들 | 권고 |
|------|------|------|
| **포럼 확장** | `forum-yaksa`, `forum-cosmetics`, `organization-forum` | 현재 구조 적절 (산업별 분리) |
| **LMS 확장** | `lms-yaksa`, `organization-lms`, `lms-marketing` | lms-marketing 역할 명확화 필요 |
| **Ops 앱** | `sellerops`, `supplierops`, `partnerops`, `pharmacyops` | pharmacyops가 약국 특화이므로 적절 |

---

## 5. 2단계 분석을 위한 메모

### A. Core 후보 검토 필요

| 현재 상태 | App ID | 분석 |
|-----------|--------|------|
| extension → core? | `sellerops` | 범용 셀러 기능으로 Core 승격 검토 |
| extension → core? | `supplierops` | 범용 공급자 기능으로 Core 승격 검토 |
| extension → core? | `partnerops` | partner-core와 함께 Core 레벨 고려 |
| core 확정? | `diabetes-core` | 현재 개발중, Core로 확정 필요 |

### B. Extension 정리 필요

| 현재 상태 | App ID | 분석 |
|-----------|--------|------|
| Development | `lms-marketing` | 역할 불명확, LMS-Core 통합 또는 폐기 검토 |
| Development | `market-trial` | 사용 여부 확인 필요 |
| Development | `health-extension` | 화장품 외 건강식품 확장, 로드맵 확인 필요 |

### C. Legacy 정리 필요 (즉시 조치)

| App ID | 조치 |
|--------|------|
| `packages/@o4o-apps/admin` | 코드 제거 또는 deprecated 표시 |
| `packages/@o4o-apps/commerce` | 코드 제거 또는 deprecated 표시 |
| `packages/@o4o-apps/customer` | 코드 제거 또는 deprecated 표시 |
| `packages/@o4o-apps/signage` | 코드 제거 또는 deprecated 표시 |

### D. 범용 전자상거래 사업자 서비스 구축을 위한 핵심 앱

**필수 Core 앱**:
1. `platform-core` - 플랫폼 기반
2. `auth-core` - 인증/권한
3. `ecommerce-core` - 주문/결제 원장
4. `dropshipping-core` - 드랍쉬핑 엔진
5. `partner-core` - 파트너/제휴 워크플로우
6. `organization-core` - 조직 관리 (선택적)

**필수 Ops 앱**:
1. `sellerops` - 셀러 운영
2. `supplierops` - 공급자 운영
3. `partnerops` - 파트너 운영

**확장 구조**:
- 산업별: `dropshipping-{industry}` (예: dropshipping-cosmetics)
- 역할별: `{role}-{industry}-extension` (예: cosmetics-seller-extension)

---

## 6. 결론 및 다음 단계

### 6.1 1단계 스캔 완료 사항

1. **전체 앱 목록화 완료**: 57개 packages + 11개 apps + 1개 extensions
2. **appType 분류 완료**: 11 Core, 27 Extension, 19 Infra/Utility/Application
3. **사용 상태 분류 완료**: 40 Active, 12 Development, 4 Legacy
4. **중복/유사 기능 탐지 완료**: 주요 영역 분석 및 권고 제시

### 6.2 2단계 권고 사항

1. **Core 적합성 심층 분석**: sellerops, supplierops, partnerops의 Core 승격 여부
2. **Legacy 정리 작업**: @o4o-apps 폴더 내 4개 앱 폐기 처리
3. **Development 앱 로드맵 확정**: 12개 개발중 앱의 Active 전환 일정
4. **범용 전자상거래 사업자 서비스 아키텍처 확정**:
   - SellerOps-Core 신설 여부
   - Partner-Core 기반 제휴 시스템 표준화
   - 산업별 Extension 구조 표준화

---

*Generated: 2025-12-22*
*Next Step: 2단계 - Core 적합성 심층 분석*
