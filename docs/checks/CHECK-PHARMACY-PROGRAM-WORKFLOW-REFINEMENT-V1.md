# 약국 협력사업·행사 운영 흐름 검증

> **상태:** COMPLETED
> **작성일:** 2026-10-14 · **최종 갱신:** 2026-10-14
> **근거:** [WO](../work-orders/WO-PHARMACY-PROGRAM-WORKFLOW-REFINEMENT-V1.md)

## 구현·보존

`OperatorSemiFranchisePage`에서 담당 사업/탭/상태 조회·요청 세대·심사 수명을
`useAssignedBusinessWorkspace`로 분리했다. 기존 5개 탭과 action/status 매핑은 도메인 모델로 옮겼다.
사업/탭 전환 시 빈 목록·loading, 동일 scope 최신 조회만 반영, 조회 실패 재시도,
담당 사업 실패/미지정 구분과 약국 소비처 제한을 유지한다.
scope마다 별도 수명 객체를 사용해 A→B→A 전환 후 첫 A 응답도 무효화한다. 전환은 동기 ref로도 표시해 같은 이벤트 묶음의 이전 행 처리 실행을 차단한다.

확인/선택 사유 입력은 도메인 확인창에서 담당 사업·대상과 함께 표시한다.
API 실패 시 대상/사유를 유지하고 재시도한다. 심사 중 중복 확인·사업/탭/상태 변경·닫기를 차단한다.
성공한 심사 후 조회 실패는 완료 안내와 목록 오류를 함께 표시하고 조회만 다시 실행한다.
키보드 초점 이동·복귀/Tab 순환·Escape 및 모바일 확인창 크기를 검증했다.
기존 반려/정지/종료 등의 사유는 선택이며 trim 후 전달하는 계약을 유지한다.

콘텐츠 초기값/요청값은 `semiFranchiseContentModel`, 읽기·초안·저장은
`useSemiFranchiseContentEditor`로 분리했다. 제목 trim/필수, 본문 원문, 태그 split/trim/빈 항목 제외,
초안 저장/기존 수정 endpoint 및 목록 복귀 query를 유지한다.
실패 후 초안을 보존하며 저장 중 입력·자체 목록/취소 링크를 잠근다.
보관 수정 차단·읽기 실패 재시도·미완료 읽기 저장 차단·이전 사업 저장 후 이동 방어를 유지한다.

## 소비처·영향

| 소비처 | 확인 |
|---|---|
| Neture App → operator wrapper → 기존 pharmacy-management 모듈 | 전체 담당 사업 선택, 기본 사업 게시판 주소, 두 route/편집/심사 검증 |
| KPA Society App 직접 route → 같은 기존 모듈 | businessKey=pharmacy 고정 및 해당 게시판 주소, 두 viewport 검증 |
| 약사회 분회 | 소비처 없음. 수정·배포 0. 전체 frontend script에 읽기 타입 검사만 포함 |
| 다른 operator-core-ui 소비처 | 공개 props/export·API adapter 계약 불변, 전체 frontend 타입 검사 |
| source literal | 두 수정 페이지 경로 재검색: 역사 문서 참조만, 활성 raw-source 계약 0. 기존 runtime 테스트는 그대로 실행 |

기존 공유 모듈 안의 책임 분리이며 새로운 서비스 간 공통화를 추가하지 않았다.
주문·결제·역할·API·DB schema/migration·수동 이벤트 2단계 인덱스는 수정하지 않았다.

## 모집 참여·내 매장 연결 조사

- 담당 운영자 `decideRecruitment`는 `/neture/operator/semi-franchises/:key/recruitments/:id/:action`에 note를 보낸다.
  서버 `SemiFranchiseRecruitmentService.operatorDecide`는 담당 사업 조건과 pending 상태를 확인해 exposure_status만 심사한다.
- 공급자 `SupplierSemiFranchiseRecruitmentsPage`의 참여 신청 관리 링크는 `/supplier/recruitments/:id`로 연결된다.
  `SupplierRecruitmentDetailPage`의 기존 approveApplication이 실제 참여 승인을 담당한다. 운영자에게 이 권한을 추가하지 않았다.
- `SemiFranchiseRecruitmentService.pharmacyBrowse` 및 `/neture/pharmacy/recruitments/:id/apply`는 조직 단위 기존 신청 경로다.
  내 매장 `web-store/PharmacyRecruitmentsPage`가 이 경로를 소비한다.
- 공급 가능 목록 `supply-access.ts`는 사업 활성/가입과 모집 조건 approved·모집 recruiting·해당 조직 참여 approved를 함께 요구한다.
  이벤트도 approved/is_active/기간을 확인한다. 운영자의 조건 승인만으로 참여 승인/상품 이용을 완료시키지 않는다.
- 게시 콘텐츠는 `SemiFranchiseContentService`의 published·사업 active·사업 가입 active 판정으로 약국에 보인다.
  이미 복사한 매장 사본은 독립 사본이며 원본 수정/보관과 함께 덮어쓰지 않는다.

이 연결은 코드 조사와 기존 DB 없는 규칙 검증이다. 공급자 참여 심사 화면 자체의 정비와
실계정 승인→참여자/내 매장 반영 검증은 별도 후속이며 이번에 완료됐다고 주장하지 않는다.

## 실행 증적

- Node 22.18.0 / pnpm 10.25.0 frozen install·`pnpm run build:packages` PASS. manifest/lockfile 변경 없음.
- operator-core-ui 전체 **10파일 72건 PASS**. 추가/확장 업무 집중 **2파일 14건 PASS**.
  최초 6개 실패는 상태 필터/행 액션의 같은 이름을 전역 단일 query로 찾은 테스트 모호성이었다.
  대상 행 안으로 query를 제한해 단언을 유지했고 전부 통과했다.
- Neture 전체 **98파일 883건 PASS**. 기존 OperatorBusinessFlow **7건 PASS** 포함.
- DB 없는 API business-access/neture-pharmacy-rules **2파일 25건 PASS**. 운영 DB/실계정 쓰기 없음.
  PostgreSQL 통합 spec은 이번에 실행하지 않았으며 이 25건으로 대체해 완료 표시하지 않는다.
- `pnpm run type-check:frontend` PASS. package 독립 tsc도 PASS.
  최종 package tsc에서 새 테스트의 지원하지 않는 exact query 옵션 2개를 제거했고 같은 이름의 기본 정확 매칭/행 범위 단언을 유지해 집중 재검증 PASS.
- Neture·KPA Society production build PASS. 기존 큰 chunk/Browserslist 경고 유지.
- 변경 9개 소스/테스트 ESLint error/warning 0. `git diff --check` 및 문서 민감정보 검사 PASS.
- Chromium 실제 UI·RichTextEditor·스타일 fixture: Neture/약국 소비처 × 1440/390px **4회 PASS**.
  사업 범위/게시판 주소, 행사 반려 실패→사유 유지→재시도, 쓰기 중 잠금, 콘텐츠 수정 실패→초안 유지→같은 payload 재시도→목록 복귀,
  모바일 확인창 범위와 pageerror 0. API/인증 대상은 합성 자료로 치환했고 fixture는 저장소 밖에 두었다.
  초기 fixture의 react-router absolute alias가 dom export를 가로막은 설정 오류를 해소한 뒤 실제 UI 4회 통과했다.

## 인계·문서 정합

새 WO/CHECK와 ACTIVE 운영자 TODO 2종을 갱신했다. 이전 COMPLETED 기록과 정책 정본은 변경하지 않았다.
착수 main은 `0d55cb43483860caf9596718cb38f16482ac7174`이며 작업 중 main의 추가 변경은
개발/통합 담당 분리를 명시한 문서 4파일뿐이었다. 제출 전에 해당 최신 main을 반영한다.
현재 사용자 지시와 최신 AGENTS에 따라 **개발 담당 종료는 push·PR 생성·검증 결과 인계**다.
main 병합·배포·운영 반영은 별도 통합 담당 공간에서 진행한다.
공유 패키지 영향은 기존 delivery 판정/통합 담당이 확인하며 개발 담당은 배포 설정을 변경하지 않는다.
WORKTREE_DISPOSITION: `/workspace/o4o-pharmacy-program-workflow`, `wo/pharmacy-program-workflow` KEEP — 미병합 소스와 후속 수정용.
이 세션의 fixture 서버는 검증 후 종료한다.
