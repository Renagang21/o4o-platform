# 네 약국 협업 사업 Core + Extension 통합 정비 검증

> **상태**: ACTIVE — 로컬 구현·검증 완료, Git 전달·원격 CI·병합·운영 배포는 별도 기록
> **작성일**: 2026-10-23 (Asia/Seoul)
> **근거 WO**: [통합 정비](../work-orders/WO-O4O-COOPERATION-CORE-EXTENSIONS-CONSOLIDATION-V1.md)

## 기존 작업 현재 상태 정리

기준 main `5a6ab8f235`를 Git 원격에서 fetch하고 clean 클라우드 checkout을 fast-forward했다. 기존 작업 branch의 이력을 변경하거나 다른 worktree를 수정하지 않았다.

| 대상 | 현 main에서 확인한 근거 | 이번 작업 판정 |
|---|---|---|
| 인계 PR #765 | merge `772296cb6d`, pull ref HEAD가 main의 조상 | 미사용 KPA API 정리는 재개발/중복 통합하지 않음 |
| 인계 PR #772 | merge `8c44ffde13`, pull ref HEAD가 main의 조상 | 상담 초안·사용처·QR/태블릿 동선은 기존 구현 재사용 |
| #772 배포 | 기존 [종료 CHECK](CHECK-O4O-STORE-WORKFLOW-STATUS-COMPLETION-V1.md)의 2026-10-23 후속: Delivery 39894078073, api/store DEPLOYED | 과거 인계의 미병합/미배포 표기를 현재 잔여로 세지 않음. 이번 세션에서 운영 상태를 재조회한 근거는 아님 |
| 공통 세션·사업 약관·운영 요구 집계 | PR #761·#763 및 [메가팜 완료 기록](CHECK-O4O-MEGAPHARM-OPERATIONAL-COMPLETION-V1.md) | 이전 조사에서 지적한 기능이 현재 존재함. 운영 문안·설정은 별도 |
| CarePharm | #686·#690·#717·#729·#749가 main 병합 이력에 존재 | 운영자·회원 자료·내 매장 연결을 재구현하지 않음 |
| Pharmcoop 포럼 배치 | PR #774가 main에 포함 | 조합원 포럼·운영 소식·작업별 운영 화면 유지. 이력 문서의 push-only 표기를 최신 현황으로 오독하지 않음 |
| 회원 홈·전체 관리자 설정 | 이전 후속 CHECK에 #704·#746 배포 완료 증거 | 옛 COMPLETED 문서 체크박스는 당시 기록으로 보존 |

## 이번 구현

공통 순수 계약/검증과 네 extension을 분리하고 세 앱·서비스 탐색·공통 운영 편집기에 연결했다. CarePharm 작성 도움과 회원 자료 태그는 extension 입력으로 제공한다. 계정·사업·약국/조합 원장, 가입 승인·기능 이용권·실제 약관 게시를 변경하지 않았다. 별도 package/dependency/lockfile/schema/migration/배포 설정 변경은 없다.

MegaPharm 사업 게시판을 Neture의 호환 주소에서 열 때 Pharmacy fallback 대신 MegaPharm `/community`로 직접 이동한다. 존재하지 않는 handoff alias를 발급하지 않는다. Pharmcoop의 사업 공동공간 진입은 조합 목록으로 보내며 조합 slug 없이 다른 사업의 글 경로를 붙이지 않는다.

## 로컬 검증 결과

Node 22.18.0 / pnpm 10.25.0, frozen lockfile·store integrity 설치와 `pnpm run build:packages` PASS.

| 검사 | 결과 |
|---|---|
| shared-space-ui 전체 Vitest | 18 files / 175 tests PASS |
| operator-core-ui 전체 Vitest | 28 files / 201 tests PASS |
| Pharmacy/MegaPharm 앱 전체 Vitest | 19 files / 140 tests PASS |
| Pharmcoop 전체 Vitest | 11 files / 81 tests PASS |
| Neture/CarePharm 전체 Vitest | 146 files / 1,262 tests PASS |
| 합계 | 222 files / 1,859 tests PASS |
| 세 소비 앱 `run build` | TypeScript + Vite PASS |
| 다른 공유 패키지 소비처 | Store·강의·분회 TypeScript + Vite, 관리자 타입 검사 + 직접 Vite build PASS |
| API `run type-check` | PASS |
| 공유 패키지 제품 소스 타입 검사 | PASS |
| 변경 TS/TSX 집중 ESLint | 오류·경고 0 |
| literal 소비처 점검 | businessSite 경로 raw-source 단언 없음. 직접 import 소비처와 기존 앱 회귀 함께 대조 |

공유 패키지의 **테스트를 포함한 전체 tsc는 실패**한다. 미변경 `src/legal/__tests__/ServiceEnrollmentPolicyAgreement.test.tsx:11`의 `it.each` callback tuple 타입 오류 1건이다. 해당 파일은 현재 main과 diff 0이며 실행 테스트는 통과한다. 이를 제외한 제품 소스 타입 검사와 실제 세 앱 TypeScript 빌드는 통과했다. 전체 tsc를 PASS로 보고하지 않고 범위 밖 테스트를 임의 수정하지 않는다.

Pharmcoop의 기존 ForumLayout fixture에서 중복 React key 경고가 나온다. suite는 통과했으며 이번 정비에서 해당 데이터·화면을 수정하지 않았다. 빌드의 기존 Browserslist/큰 chunk 경고도 실패와 구분한다.

## Chromium 실제 production bundle 검증

1440×900 / 390×900에서 네 사업 공개 홈 8건, CarePharm 회원 자료 태그 조회/변경 2건 PASS. JS pageerror 0·문서 가로 넘침 0. 별도 MegaPharm 게시판 진입은 실제 community 호스트 화면 → MegaPharm `/community` 이동을 확인했고 handoff 발급 요청은 0건이다. 총 11흐름 PASS.

auth/API/도착 문서는 메모리 fixture이며 운영 요청·쓰기·실제 자격 부여가 아니다. 최초 harness는 Vite preview의 공식 hostname 허용 설정이 빠져 차단됐고, 로컬 전용 preview 설정에 대상 hostname만 명시해 재검증했다. 처음 Neture 호스트에서 시작한 community 이동 검사는 기존 host boundary가 먼저 이동시켜 완료되지 않았으며, 실제 소유자인 community 호스트에서 다시 검사했다. 제품의 guard·host boundary·인가를 끄지 않았다.

실행 로그·브라우저 결과는 저장소 밖 `/workspace/.onboarding/unified-*`에 보존한다.

## 외부 접근과 남은 운영 준비

- Git fetch는 성공. `api.github.com` REST/GraphQL 및 인증 없는 CONNECT 확인은 프록시 403으로 거부됐다. 최신 원격 CI·ruleset·PR 생성·병합·배포 상태 확인은 차단된 상태다. 실패를 GitHub 계정/token 부재로 단정하지 않는다.
- 기존 package-manager preset과 다른 설정을 보존하며 `api.github.com`만 허용하는 환경 설정 초안을 저장했다(`status=saved`, `requires_publish=true`). 저장은 실행 환경 적용·게시가 아니다. 사용자 설정 검토·저장·Publish 후 해당 API 동작을 재확인한다.
- 현재 checkout에 테스트 계정 기준 파일이 없다. 실제 운영자·약사·직원·기기·음성·결제/배송 검증은 미실행이다.
- 사업별 실제 약관/법정정보 게시·기능 제공·직원 허용과 가입 상태 확인은 실제 운영 입력과 승인된 계정이 필요하다. ERP/POS 자료 확보·분석 기능, 상품 비교/추천 지원의 새 업무 설계, 조합의 독립 공지 고정/중재 확장은 확정 기능으로 임의 추가하지 않는다.
- 오래된 사업 독립 WO의 테스트 데이터 삭제·인프라 이름 변경 및 부분 사용 KPA router/공개 export 정리는 이번 비파괴 공통화로 완료됐다고 보고하지 않는다. 기존 기능·의존 소비처 분석과 별도 실행 범위가 필요하다.

문서 정합: 현 main의 완료·미확인·운영 입력 항목을 이 CHECK와 WO에 통합했다. 과거 COMPLETED 기록을 재작성하거나 canonical index의 상태를 임의 변경하지 않았다.

## Git 전달

구현 commit `f6d9429468`을 `origin/wo/pharmacy-cooperation-core-extensions`에 push했다. 원격은 해당 branch의 신규 생성과 PR 생성 URL을 반환했다. main 직접 push·PR gate 우회·force push는 하지 않았다. 현재 PR 미생성·원격 CI 미확인·main 미통합·이번 변경 운영 미배포다. 네트워크 설정 적용 뒤 기존 branch에서 후속 작업을 이어간다.

새 문서 파일 링크·민감정보 패턴·diff check PASS. 7개 소비 앱 빌드 뒤 추적 manifest/lockfile 변경은 0이다. 검사용으로 시작한 로컬 preview 프로세스는 종료했다. 이전 세션의 기존 서버·다른 작업공간은 종료/삭제하지 않았다. 본 checkout/branch는 후속 통합·수정용으로 KEEP한다.

## 통합 후속 — 2026-10-23

- GitHub API 접근 복구 후 최신 main `5423efa3b8`을 충돌 없이 병합하고 [PR #784](https://github.com/Renagang21/o4o-platform/pull/784)를 생성했다. 최초 HEAD의 CI Gate·API 3개 shard·영향 앱 빌드·CodeQL·SonarCloud가 통과했다.
- Codex 리뷰의 Store 메가팜 이동 경로 지적을 반영했다. 직접 로그인 사업은 handoff 요청 없이 목적 URL로 이동하며 CarePharm의 기존 handoff는 유지한다. 가입자 공간·신청 관리 회귀 테스트를 포함한 해당 파일 6개 테스트가 통과했다. 수정 HEAD는 재검증·리뷰 대상이다.
- 사용자 요청으로 [CarePharm 이용약관](../design/DRAFT-CAREPHARM-BUSINESS-TERMS-V1.md)과 [개인정보처리방침](../design/DRAFT-CAREPHARM-BUSINESS-PRIVACY-V1.md) 초안을 작성했다. 사용자는 별도 사업자 사용 및 아직 회사가 없으므로 사업자 정보를 빈칸으로 유지하도록 확인했다. O4O 법정정보로 대체하지 않았으며 운영 게시·가입 차단 해제는 하지 않았다.
- 문서 정합: 위 Git 전달 절은 당시 기록이다. 현재 PR 생성 완료, main 통합·배포는 아직 미완료다. 약관은 문서 초안 작성 완료와 실제 운영 게시 미완료를 구분한다.
