# WO-O4O-PRODUCT-APPROVAL-TRASH-V1

> 상태: ACTIVE · 작성일: 2026-10-30 · 범위: 개발·PR 검증, main 병합 전

## 요청과 조사

사용자 요청: 공급자 상품 승인 목록의 실제 상품명 확인·표시 수정, 선택 삭제, 휴지통 비우기.
운영 상품을 도구로 삭제하지 않는다. 테스트는 합성 데이터만 사용한다.

- operator GET `/neture/operator/products` → `AdminOfferReadService.getAllProducts` → `mapAdminOffer`는
  `masterName = ProductMaster.name`을 반환한다. 화면은 없는 `marketingName`을 읽고 있었고,
  아래 보조 Offer ID만 보였다. 삭제 확인의 `undefined`도 같은 원인이다. 원장 이름 변조로 우회하지 않는다.
- 삭제 정책은 APPROVED만 행 삭제가 노출돼 PENDING/REJECTED와 선택 삭제가 누락됐다.
- 기존 휴지통은 개별 복원·완전 삭제가 있으나 전체 비우기가 없다.

## 기준과 안전 범위

[역할 V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md),
[공급자 경계](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[공유 UI 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md),
[B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)를 확인했다.
Supplier Products 축의 기존 Offer 정리 동선만 보완한다. Master 삭제·이름 변경·권한 확대·migration 없음.
반려는 공급자의 보완·재신청 업무로 유지하고 삭제는 별도로 제공한다.
휴지통 비우기는 기존 admin guard, 미리보기·확인·감사·참조 보호를 적용한다.
사용자 추가 지시에 따라 개별 완전 삭제·전체 비우기는 사유 입력을 없애고 자동 감사 사유를 기록한다.
병합과 반려의 기존 사유는 유지한다.
주문/장바구니/활성 매장/서비스 상품 연결은 건너뛰고 사유를 표시한다. 새로운 도착 상품은 제외한다.

## TODO

- [x] 최신 main 전용 worktree, 정본·코드 조사
- [x] 실제 서버 DTO로 상품명·검색·상세·확인창 검증
- [x] 대기/승인/반려 상품의 개별·선택 휴지통 이동
- [x] 휴지통 직접 진입, 전체 범위 미리보기·비우기와 보호 사유
- [x] 동시 변경·권한·감사 실패·중복 제출 회귀
- [x] admin/Neture 소비처 typecheck·build·UI 테스트
- [ ] commit·push·PR·CI·리뷰 확인

## Shared Module Change Verification

| 소비처 | 사용 | 영향·검증 |
| --- | --- | --- |
| 중앙 admin | 사용 | 공통 승인·정리 화면/API, 중앙 기존 메뉴 guard 유지 |
| Neture operator/admin | 사용 | 같은 공통 화면/API, 기존 neture role guard 유지 |
| KPA/강의/펀딩/store/partner | 미사용 | import 검색으로 Neture 모듈 직접 소비 없음 확인 |

신규 메뉴·역할 없음. 화면 내 휴지통은 기존 cleanup 경로로 연결한다.
실계정 검증은 `docs/local/TEST-ACCOUNTS.local.md` 존재를 확인하며 누락 시 합성 UI 검증과 구분한다.

## 검증 결과

- 로컬 PostgreSQL 15 전용 fixture 7건: 124개 전체 범위, 주문/장바구니/매장/서비스 연결 5개 보존,
  뒤늦은 유입 제외, xmin 변경 감지, 동시 실행 1회, 감사 실패 rollback, 단건 사유 생략.
- HTTP route guard wiring 6건 + 중앙 메뉴 분류 11건: 익명·다른 서비스·operator 파괴적 작업 차단.
  guard wiring은 합성 middleware로 라우트 연결을 검증하며 실계정 권한 확인과 구분한다.
- 공유 UI 9건 + Neture wrapper 회귀 6건 통과. 실제 DTO 상품명·검색·상세·삭제 확인,
  전 상태 선택 삭제·중복 클릭·실패 보존·휴지통 전체 범위·사유 없는 완전 삭제 검증.
- 합성 브라우저 1440/390px: 실제 client 정규화→3개 선택 삭제 1요청→휴지통 124개 확인→
  122개 삭제·2개 보호 표시. 사유 입력 없음, body 가로 넘침 없음, 콘솔 예외 없음.
- API/admin/Neture tsc, admin Vite·Neture tsc+Vite 빌드 통과. 변경 소스 lint 오류·경고 0.
  PR CI는 후속 기입.
- 테스트 계정 기준 파일은 이 worktree와 기준 checkout 모두 누락됐다. 운영 로그인·실제 상품 삭제 검증 없음.
- CI 기존 disposable PostgreSQL step의 실행 대상에 이 테스트를 추가했다. 새 인프라·배포 설정 없음.
- 범위 제한: 휴지통 비우기·선택 삭제는 최대 10,000개이며 초과 시 명시적으로 거부한다.
  휴지통 비우기는 새 유입을 제외한 확인 snapshot 전체를 처리하며, 예상하지 않은 FK 오류는 transaction 전체 rollback한다.
- 문서 정합: 과거 사유 필수 정책 기록은 당시 이력으로 보존. 이번 사용자 지시와 구현은 이 WO로 기록한다.


### 기존 정책 회귀 보완

PR #898 전체 API 검사에서 기존 두 suite가 휴지통에도 사유를 필수로 요구하던 기대값 때문에 실패했다.
로컬에서 3개 실패를 재현한 후, 사용자의 사유 생략 결정에 맞게 해당 기대값을 수정했다.
직접 pending 삭제·병합의 사유 필수, 잘못된 명시 사유 거부, 기존 서비스 admin 권한·참조 보호는 유지한다.
사유 없는 휴지통 삭제가 자동 감사 사유를 남기는 테스트와 실제 role middleware의 404 최종 대상 확인을 검증한다.


### 휴지통 진입 위임 경계

Codex 리뷰의 cleanup 진입 지적을 반영한다. 공통 화면의 휴지통 버튼은 기본 비노출이며,
중앙 wrapper가 실제 `menuKeys`의 `neture.cleanup`으로 표시 여부를 넘긴다. role만으로 중앙 권한을 추정하지 않는다.
Native 승인 wrapper도 role만으로 판단하지 않고 기존 휴지통 GET(1개)을 성공한 경우에만 진입을 표시한다.
중앙 위임 제한이 native 호스트에도 적용되므로 동일한 403 동선을 예방하고 늦은 이전 계정 응답을 무시한다. 권한이 없으면 선택 삭제는 유지하고 관리 담당자 안내를 보인다.
서버의 cleanup 분류·권한은 바꾸지 않는다. sidebar 개편 PR #899와 경로가 겹치지 않는다.
