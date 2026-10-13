# 공급자 프로필·API 코드 정비 — 3차

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거**: 사용자 — 다음 작업 진행. 공급자 단계별 코드 정비의 3차, commit → push까지.

## 최초 TODO와 재점검

코드 조사 전에 `/workspace/artifacts/supplier-code-phase3-todo.md`에 TODO를 작성했다.
최신 main `aa59a0962`와 앞선 미통합 승인 변경 `affa32bc4`를 새 독립 checkout,
`wo/supplier-code-phase3`의 dependency merge로 구성했다. 기존 checkout/branch는 보존했다.
조사 대상은 SupplierProfilePage 1,300행, supplier API 2,014행과 route·export·소비처·경계 검사다.

정본: [Role Workspace §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[Supplier Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[B2B Contract](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[Commerce Boundary](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md).

- [x] 최초 TODO → 최신 코드·문서·실제 route·소비처 조사 → TODO 보정
- [x] 원래 프로필 화면·API 전송/오류 계약을 먼저 실행하여 기준 확보
- [x] 사업자 프로필, onboarding/문서, 품목군 controller와 표시 책임 분리
- [x] 기존 API facade를 보존하고 업무별 구현·타입·오류 helper 분리
- [x] 기존 소스 경계 assertion을 보존하며 분리된 API 전체 포함
- [x] 회귀·타입·빌드·lint·원본 AST·PC/mobile 브라우저 검사
- [x] 명시적 파일 commit → 전용 branch push → 원격 일치 확인

## 구현과 보존 계약

| 영역 | 변경 |
|---|---|
| SupplierProfilePage | 1,300 → 140행. `profile/`의 조정 hook, 3개 업무 controller, 6개 표시 섹션과 공통 표시 helper로 분리 |
| 사업자 profile controller | 사업자·담당자·공개 연락처·주문/배송 입력과 profile 저장을 담당. 세금계산서 이메일·정산 계좌·통신판매 정보는 이 저장에 포함하지 않음 |
| onboarding controller | 세금계산서 이메일·정산 정보·통신판매 입력/저장, 문서 PDF 선택/업로드/열람과 독립 재조회 담당 |
| 품목군 controller | 선택/허용 상태의 해제·기존 증빙 열람과 독립 재조회. 승인·검토·보류 상태 해제 금지와 선택-only 정책 유지 |
| 초기 조회 | 기존 Promise.allSettled 완료 후 화면 표시. 기본 실패/부재 구분, 보조 실패 격리와 영역별 retry, 초기 tax email fallback 유지 |
| supplier API | 2,014 → 92행의 호환 facade. 39개 메서드의 순서·함수 참조와 기존 standalone API/type/constant 공개 이름 유지 |
| 업무 모듈 | media/products/orders/inventory/shipments/settlements/library/spot, copilot/profile/onboarding/categories/recruitment/event-offer/bulk 별 구현. 6개 타입 파일과 오류 helper 파일 |
| 전송/오류 | 기존 apiClient singleton, endpoint/query/payload, multipart/blob, 부분 성공, 404/403/실패/정상0건 의미 유지. 새 API나 공통 Programs engine 없음 |
| 소스 검사 | cutover·Partner 은퇴 검사가 facade와 업무 API 전체를 읽음. 기존 assertion 제거·완화 없음 |

`/mypage/business-profile`의 실제 소비처와 기존 supplier profile redirect는 그대로 유지한다.
조직 business profile의 저장 소유권을 설명하는 화면 주석 1곳만
`users.businessInfo`에서 현행 `organizations.metadata.businessProfile`로 바로잡았다.
사업 정책·권한·backend production 코드·DB/schema·package/lockfile·CI 변경은 없다.

## 검증과 인계

검증 근거는 동일 정비 트랙의 [CHECK 3차 절](../checks/CHECK-O4O-SUPPLIER-PRODUCT-UI-CODE-CLEANUP-V1.md)에 추가했다.
종료 전 fetch에서 main은 `90e49c3e6`으로 이동했다. 추가 변경은 PharmacyHub 정리 workflow/스크립트/WO이며,
이번 프로필/API 코드·정본·지침과 겹치지 않는다. 검증 기준은 명시한 `aa59a0962` + 승인 dependency다.
main 통합 검증이나 배포 완료를 뜻하지 않는다.

실계정 검증은 사용자 유예대로 NOT_RUN. main merge·배포·운영 쓰기는 범위 밖이다.
후속 개발은 최신 main 재조사 후 backend supplier router/controller 책임 정비다.
기존 모바일 Drawer/공통 에디터 한계는 앞선 CHECK에 기록한 별도 후속 대상이다.

문서 정합: 사업자 정보 소유권을 잘못 설명한 코드 주석을 정본에 맞췄다. 정본 정책 변경 없음.

종료: 구현 `c5718402d1e986e57559fb8f0e3ad348de4e3ef9`를 `wo/supplier-code-phase3`에 push하고
원격 SHA 일치를 확인했다. 검증 서버 5191은 종료했다. 미통합 branch와 참조된 checkout은 보존했다.
