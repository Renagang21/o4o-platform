# 공급자 상품 UI 코드 정비 — 1차

> **상태**: ACTIVE
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거**: 사용자 — 공급자 코드 정비를 단계별로 조사 후 진행. 앞선 commit → push 종료 범위 유지.

## 조사와 확정 범위

최초 TODO는 코드 점검 전에 `/workspace/artifacts/supplier-code-phase1-todo.md`에 작성했다.
최신 main `f66ed5f5f`에서 모집단과 소비처를 재점검하고, 미통합된 승인 작업 `8f671674c`를
새 독립 checkout/`wo/supplier-code-phase1`에 dependency merge했다. 이전 checkout/branch는 보존했다.
공급자 도메인 전체를 한 번에 다시 설계하지 않고 이번 1차는 상품 목록·상세 Drawer로 확정했다.

정본은 [Role Workspace §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[Supplier Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[B2B Contract](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[Commerce Boundary](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)다.

- [x] TODO 먼저 작성 → 최신 코드·문서·소비처 점검 → TODO 수정
- [x] 원래 두 화면을 렌더한 회귀 검사로 동작 기준 확정
- [x] 목록의 조회·선택·일괄 저장/삭제/승인·연속 작업과 컬럼 표시 분리
- [x] Drawer의 편집·이미지·가격 정책·공급 방식 상태/저장 책임 분리
- [x] 기존 공통 테이블·상품 폼·에디터의 PC/mobile 브라우저 비교
- [x] 회귀·타입·빌드·lint·차이 검사
- [ ] 명시적 파일 commit → branch push → 원격 일치 확인

## 변경과 보존 계약

| 기존 책임 혼재 | 정비 |
|---|---|
| SupplierProductsPage의 조회·필터·선택·일괄 처리·연속 작업·컬럼 JSX | `supplier-products/useSupplierProducts`, `useSupplierProductColumns`, `supplierProductBaseColumns`, `productListFeedback`로 분리 |
| Drawer의 편집/dirty-close/두 설명 저장 | `useSupplierProductEditor`로 이동. B2B-only와 offer → B2B 저장 순서 및 부분 실패 안내 유지 |
| 이미지 조회/업로드/설명 에디터 이미지/라이브러리/삭제 | `useSupplierProductImages`로 이동. 기존 SupplierImageSection 재사용 |
| 스팟 정책과 서비스별 가격 | 각각 `useSupplierSpotPolicies`, `useSupplierServicePrices`. 스팟 stale guard·조회 실패/정상 0건·후속 재조회 실패 구분 유지 |
| 공급 방식 모달의 inline mutation | `useSupplierDistribution`과 표시 전용 모달로 분리. 서비스 철회 확인 유지 |
| readonly 설명/스팟 정책 JSX | 전용 섹션으로 분리. B2C·B2B·STORE 설명의 정책/이동선 유지 |

페이지는 1,566 → 601행, Drawer는 1,342 → 631행이다. 행 수 자체가 완료 기준은 아니다.
조회·변경을 담당하는 hook과 화면 표시 모듈의 경계를 명시하고, hook의 공개 반환값은 소비처가 사용하는 값으로 제한했다.
목록 column memo에서 사용하는 콜백을 안정화해 의존성을 명시했다. 조회 effect 의존성과 API 호출 시점은 유지한다.

기존 OfferEdit/MasterReadOnly/OfferDistribution/Image Section과 public page/Drawer props는 유지한다.
공급자 외 Operator 승인 소비처의 `approvalActions`도 동일하다.
Master readonly·의약품 후속 작업 gate·권한·API payload·route·저장 정책은 변경하지 않는다.
package/lockfile/CI/backend/schema/정산/운영 데이터 변경은 없다.

## 검증과 후속

[검증 기록](../checks/CHECK-O4O-SUPPLIER-PRODUCT-UI-CODE-CLEANUP-V1.md)을 참고한다.
실계정은 사용자 유예대로 NOT_RUN이다. main PR/merge·배포는 이번 종료 범위 밖이다.
최종 fetch에서 main은 `aa59a0962`로 이동했다. 추가 변경은 auth/로그인과 별도 운영 기록이며,
이번 상품 UI 변경 경로와 직접 겹치지 않는다. 공유 auth 소비 영향은 이후 PR 통합 시 최신 main 기반으로 다시 검증해야 한다.
push 종료 범위이므로 이번 branch에 자동 main merge를 하지 않았다.

후속 개발은 등록/import, 프로필/API 모듈, backend router/controller, 공유 설명·program 소비처 순으로
매 단계 최신 census를 거쳐 확정한다. 모바일 390px의 기존 480px Drawer가 일부 잘리는 문제도 후속 UI 보완 대상이다.
이번에는 해당 배치를 유지하고 회귀 여부를 비교했다.

문서 정합: 이번 실행 기록만 추가. 정본 정책과 과거 WO/CHECK 변경 없음.
