# WO-O4O-BUSINESS-HOME-SHOWCASE-V1

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

상태: 개발·검증 완료 (종료점 push) · 2026-10-19 · 기준 main 491be1bb82

사용자 지시: pharmacy·carepharm·drugstore·pharmcoop 공급자 제품/콘텐츠 심사와 협업체 메인 진열을 한 묶음으로 정비한다. TODO를 코드·문서로 재검증한 뒤 개발·검증·push까지 진행한다. PR·병합·운영 변경은 범위 밖이다.

## 최초 TODO
- [x] 정본과 실제 승인·조회·홈·권한 소비처를 재검증하고 TODO 보완.
- [x] 공통 승인 결과를 메인에 연결하고 운영자가 진열 순서·중단·복구를 관리.
- [x] 제품은 승인 제안의 조건/대상 약국을 유지. pharmacy 기본 공급·주문 계약은 유지.
- [x] 콘텐츠 자기 승인 방어·처리 이력·보관 후 재요청 규칙 보완.
- [x] pharmacy/drugstore 공용 홈, CarePharm 별도 홈, 개별 Pharmcoop 홈 연결.
- [x] 서버 담당 사업·열람 범위, 상태 변동, 동시 처리, 실패 입력 보존·늦은 응답, PC/모바일 검증.
- [x] 문서 정합·commit·push. 운영 데이터/담당 지정/DB 변경 실행 없음.

## 원칙
일상 심사·진열은 operator, 영구 삭제·사업 설정·담당 지정은 admin. 공급자 원본과 약국 사본을 변경하지 않는다. 비회원 공개와 주문·결제 변경은 이번 작업에 추가하지 않는다. 협동조합은 개별 조합의 businessKey로 제한하며 연합회 역할만으로 다른 조합의 자료를 열람시키지 않는다.

## 코드·문서 재검증 후 보완 (구현 전)
- Supplier 경계/ROLE-WORKSPACE/B2B 정본 및 DESIGN-SUPPLIER-BUSINESS-TERMS-V1 확인. 기본 공급/주문/조건 원장은 유지.
- 승인: neture-pharmacy.routes.ts, SupplyProposalService, SemiFranchiseContentService, 공통 OperatorSemiFranchisePage 재사용.
- 홈: PharmacyMemberHomePage/BusinessProductsPreview는 최신 3개 미리보기일 뿐 진열 설정이 없다. CarePharmHomePage/CooperationMemberSpace는 별도 구현. Pharmcoop App의 CooperativeHome/MemberSection은 placeholder다.
- 드럭스토어형 약국은 BUSINESS_SITE가 선택하는 공용 약국 앱이며 별도 앱을 만들지 않는다.
- 진열 설정은 사업 운영 조직 metadata의 businessHomeShowcase에 사업 ID별 저장한다. 승인 원장/가격을 복제하지 않으며 SQL 행 잠금으로 개별 수정과 낙관적 버전 검사를 적용한다. 기존 action_logs에 같은 트랜잭션으로 변경 이력 저장. 새 schema/migration 없음.
- 승인 즉시 메인에 자동 진열한다. operator가 항목별 순서/숨김을 조절한다. 기본 공급 옵션은 거래 경로에만 남고 메인 상품은 approved 제안만 사용.
- 약국은 선택 조직의 활성 가입/권한을 매 조회 확인. 조합원은 해당 개별 조합의 활성 개인 가입으로 콘텐츠·전체 대상 제품 소개만 열람. 대상 약국 한정 제안/가격/첨부는 일반 조합원 소개 DTO로 유출하지 않는다. 구매는 기존 내 매장에서만.
- 비회원 공개 없음. 콘텐츠 본문은 승인된 검토 사본만, 기존 ContentRenderer 사용. 운영자 미리보기는 담당 사업 판정 필수.
- 콘텐츠 자기 승인·상태 변경 감사 로그 보완. 공급자 원본 수정은 이미 승인한 사본에 전파하지 않는다. archived 공급자 콘텐츠의 다시 게시 버튼 제거, 재요청 경로 유지.
- 오류를 빈 목록으로 위장하지 않는다. 사업/계정/약국 전환 때 과거 응답을 폐기하고 저장 실패 시 입력 유지. 진열 상태가 바뀌면 버전 충돌을 표시해 덮어쓰기 방지.


## 검증 후 정합
- 공급자 archived 콘텐츠의 다시 게시 버튼은 최신 main에서 이미 숨겨져 있음을 재확인했다. 기존 처리를 유지하고 서버 전이/자기 승인·감사 로그를 보완했다.
- 기존 사업 운영자와 Pharmcoop 운영 역할의 서버 정책은 변경하지 않았다. 기존 담당 판정이 최종 권한이며 개별 조합 session/businessKey로 화면을 연결한다.
- 진열 전용 신규 schema 대신 기존 조직 metadata·action_logs를 재사용한다. 관련 설계는 [DESIGN](../design/DESIGN-O4O-BUSINESS-HOME-SHOWCASE-V1.md), 검증은 [CHECK](../checks/CHECK-O4O-BUSINESS-HOME-SHOWCASE-V1.md).
- 새로운 메인 진열과 별개인 Pharmcoop 게시판·가입 등 placeholder 업무는 이번 작업으로 완료됐다고 보고하지 않는다.


WORKTREE_DISPOSITION
- worktree: /workspace/o4o-wt/business-home-showcase
- branch: wo/business-home-showcase / base: 491be1bb82
- main integration: 미실행 / PR CI: 미실행 / deployment: 미실행
- smoke: 합성 API Chromium 16 cases PASS (PC/모바일)
- verdict: KEEP — push 후 통합 담당의 검토·수정 요청을 위해 보존

## 통합 진행
사용자의 후속 main 병합·배포 지시로 이 공간에서 통합을 진행한다. 최신 main 40c8f9d6e0의 협동조합 역할·회원관리/관리자 가시성/상품 안내 변경을 보존했다. neture-pharmacy.routes.ts의 import 충돌은 신규 협동조합 관리 route/role과 메인 진열 service를 함께 유지해 해결했다. 개별 조합 cooperative_roles 및 기존 businessOperator/requireOperatorOf 판정은 최신 main 구현을 그대로 사용한다. 우리 변경에는 새 migration이 없으며 선행 main 배포와 겹치지 않게 진행한다. 앞 개발 단계의 PR·배포 미실행 기록은 당시 범위다.
