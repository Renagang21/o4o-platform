# Forum + Dropshipping Domain Phase 3 조사 요약

**작성일**: 2025-11-30
**조사 목적**: Forum 및 Dropshipping 도메인이 App Store 기반 Core/Extension 확장 구조로 설계되었는지 검증

---

## 조사 결과 요약

### ✅ 핵심 발견사항

1. **Core/Extension 구조 완벽 구현됨**
   - Forum: `forum-app` (Core) + `forum-yaksa`, `forum-neture` (Extensions)
   - Dropshipping: `dropshipping-core` (Core) + `dropshipping-cosmetics` (Extension)
   - 각 패키지는 명확한 `manifest.ts`로 타입, 의존성, 데이터 소유권 정의

2. **App Store 플러그인 패키징 준비 완료**
   - CPT/ACF/Block/Permission/Routes/Lifecycle 모두 manifest에 선언
   - 설치/삭제 lifecycle hooks 구현됨
   - `ownsTables`, `extendsCPT`, `dependencies` 명확히 정의

3. **독립 웹서버 선택적 설치 구조 적합**
   - Multi-tenant 아님 (각 서비스는 독립 웹서버)
   - Core 앱 없으면 Extension 설치 불가 (의존성 검증)
   - 테이블 소유권 명확 → 삭제 시 정확한 제거 가능

4. **Organization-Core 연동 준비도**
   - Forum/Dropshipping 엔티티는 `userId` 기반 → `organizationId` 추가 용이
   - 현재 organization 기능 없음 = **정상** (아직 미도입)
   - Extension App 패턴으로 organization 기능 추가 가능

5. **RBAC 연동 가능**
   - 현재 `RoleAssignment` 테이블 존재
   - Forum/Dropshipping은 권한 체크만 수행 (`permissions` 필드)
   - 도메인 특화 역할(forum_moderator, seller 등) 추가 가능

---

## 조사 도메인

### Forum 도메인
- **Core**: `forum-app` (게시글/댓글/카테고리/태그)
- **Extension**: `forum-yaksa` (약사 조직 특화), `forum-neture` (네츄어 서비스 특화)
- **데이터 구조**: ForumPost, ForumCategory, ForumComment, ForumTag
- **확장 모델**: YaksaCommunity (조직 커뮤니티), ACF 약물 메타데이터

### Dropshipping 도메인
- **Core**: `dropshipping-core` (상품/공급자/판매자/정산)
- **Extension**: `dropshipping-cosmetics` (화장품 특화 메타데이터)
- **데이터 구조**: Product, Supplier, Seller, Partner, Commission, Settlement
- **확장 모델**: 피부타입/성분/루틴 메타데이터 (ACF)

---

## Organization-Core 연동 평가

### ✅ 연동 가능 항목

1. **Forum + Organization**
   - ForumPost에 `organizationId` 추가 → 분회/지부 게시판
   - YaksaCommunity에 `organizationType` 추가 → 조직 단위 커뮤니티
   - Extension으로 "분회 전용 카테고리 자동 생성" 기능 추가

2. **Dropshipping + Organization**
   - Product에 `organizationId` 추가 → 지부 공동구매 상품
   - Order/Settlement에 `organizationId` 추가 → 조직별 정산
   - Extension으로 "공동구매 일정 관리" 기능 추가

3. **RBAC 확장**
   - `RoleAssignment`에 `scope: organizationId` 추가
   - 조직별 역할 할당 (예: 분회장, 지부 운영자)
   - Forum/Dropshipping 권한 체크 시 조직 스코프 고려

### 🔵 현재 상태 (정상)

- **Organization-Core 미도입**: 아직 organization 테이블/로직 없음 → **예상된 상태**
- **확장 가능 설계**: userId 기반 구조로 organizationId 추가만으로 확장 가능
- **Extension 패턴 활용**: organization 기능은 Extension App으로 추가 예정

---

## App Store 패키징 검증

### ✅ 설치 시 자동 처리 요소

| 요소 | Forum | Dropshipping | 비고 |
|------|-------|--------------|------|
| **CPT 등록** | ✅ forum_post, forum_category 등 | ✅ ds_product, ds_supplier 등 | manifest.cpt 정의 |
| **ACF 필드** | ✅ Extension이 추가 | ✅ cosmetics_metadata 등 | manifest.acf 정의 |
| **테이블 생성** | ✅ Migration 실행 | ✅ Migration 실행 | lifecycle/install.js |
| **권한 등록** | ✅ forum.read, forum.admin 등 | ✅ seller.admin, commission.view 등 | manifest.permissions |
| **라우트 등록** | ✅ /admin/forum/* | ✅ /api/v2/seller/* | manifest.routes |

### ✅ 삭제 시 자동 처리 요소

| 요소 | Forum | Dropshipping | 비고 |
|------|-------|--------------|------|
| **의존성 검증** | ✅ Extension 설치 시 거부 | ✅ Extension 설치 시 거부 | AppManager 체크 |
| **데이터 보존 정책** | ✅ keep-data (기본) | ✅ keep-data (기본) | uninstallPolicy.defaultMode |
| **Purge 옵션** | ✅ 명시 시 테이블 삭제 | ✅ 명시 시 테이블 삭제 | lifecycle/uninstall.js |
| **테이블 소유권** | ✅ ownsTables 명시 | ✅ ownsTables 명시 | manifest.ownsTables |

---

## 독립 웹서버 선택적 설치 시나리오

### 시나리오 1: 약사회 웹사이트
```
설치 앱:
- forum-app (Core)
- forum-yaksa (Extension)
- organization-core (향후)
- organization-yaksa (향후 Extension)

결과:
- 약물 메타데이터가 있는 포럼
- 분회/지부 커뮤니티 지원
- Dropshipping 기능 없음
```

### 시나리오 2: 화장품 쇼핑몰
```
설치 앱:
- dropshipping-core (Core)
- dropshipping-cosmetics (Extension)

결과:
- 피부타입/성분 필터 지원
- 인플루언서 루틴 추천
- Forum 기능 없음
```

### 시나리오 3: 통합 플랫폼 (네츄어)
```
설치 앱:
- forum-app (Core)
- forum-neture (Extension)
- dropshipping-core (Core)
- dropshipping-cosmetics (Extension)

결과:
- 포럼 + 쇼핑몰 동시 운영
- 각 도메인 독립적 동작
```

---

## 주요 권장사항

### 1. Organization-Core 도입 시 작업
- [ ] `Organization` 엔티티 생성 (type: branch/division/global)
- [ ] Forum/Dropshipping 엔티티에 `organizationId` 컬럼 추가
- [ ] RoleAssignment에 `scope: organizationId` 추가
- [ ] Extension App: `organization-yaksa`, `organization-cosmetics` 제작

### 2. App Store 통합 작업
- [ ] AppManager에 설치/삭제 UI 연동
- [ ] CPT/ACF 자동 등록 로직 검증
- [ ] 의존성 그래프 시각화 (A → B → C)
- [ ] Purge vs Keep-data UI 선택 옵션

### 3. 테스트 시나리오
- [ ] Core 앱 삭제 시 Extension 거부 확인
- [ ] Extension 삭제 시 Core 데이터 보존 확인
- [ ] 독립 웹서버에서 선택적 설치 테스트
- [ ] Organization 연동 후 분회/지부 필터링 검증

---

## 상세 문서

- [Forum Phase 3 조사](./forum_phase3_audit.md)
- [Dropshipping Phase 3 조사](./dropshipping_phase3_audit.md)
- [Core Integration Map](./core_integration_map.md)

---

**결론**: Forum 및 Dropshipping 도메인은 App Store 기반 Core/Extension 구조로 완벽하게 설계되었으며, Organization-Core 연동 시에도 확장 가능한 구조를 갖추고 있음.
