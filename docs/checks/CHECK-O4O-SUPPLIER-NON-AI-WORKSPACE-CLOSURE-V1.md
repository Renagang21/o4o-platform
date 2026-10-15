# CHECK-O4O-SUPPLIER-NON-AI-WORKSPACE-CLOSURE-V1

> 상태: COMPLETED · 작성일: 2026-10-15
> 실행 WO: [WO-O4O-SUPPLIER-NON-AI-WORKSPACE-CLOSURE-V1](../work-orders/WO-O4O-SUPPLIER-NON-AI-WORKSPACE-CLOSURE-V1.md)
> 이력: 기존 #629의 코드·fixture 검증은 [선행 CHECK](CHECK-O4O-SUPPLIER-WORKSPACE-TASK-FLOW-V1.md)에 보존한다. 이 기록은 추가 review 보완·통합·배포 결과다.

## 문서·코드 census

기준 main `e6202355af0fc0f39a778d5a2bb51b76bab70896`을 자기 branch에 정상 merge했다.
통합 대기 중 main이 `85779c2079681516da50997a761d241c82003977`로 이동해 다시 정상 merge했다.
추가 main 변경은 PharmacyHub 정리 CLI·테스트·CI·문서 11파일이며 공급자/Web Neture 소스 차이 0이다. 기존 앱 검증 결과를 보존하고 최신 merge HEAD의 원격 CI를 확인한다.
기존 PR의 연속 Phase로 같은 전용 branch/worktree를 유지한다. 공유 기준 checkout과 다른 세션 파일은 변경하지 않는다.
Supplier Domain·역할별 업무공간·B2B 계약·소비자 commerce 경계·공통 모듈 변경 절차·현행 Delivery를 대조했다.

| 업무 | 확인한 코드/동선 | 판정 |
|---|---|---|
| 홈 | SupplierDashboardPage·dashboardView, 실행/대기·원래 집계/지표·개별 오류 재시도 | 기존 구현 유지. 신규 AI·지표 재설계 없음 |
| 상품 | 상품 추가·기존 Master 연결·신규 Candidate·단일/대량/HTML·목록·공용 ProductDetailDrawer | 원문 입력 하단 취소·검색 요청 보완. 기존 Offer/승인 경계 유지 |
| 주문 | SupplierOrdersPage·목록/상세·배송·재고·정산 | 기존 상태·검색·페이지 복귀와 payment-first 유지. 새 commerce write 없음 |
| 자료 | 현황·보관함·상품 설명서·태블릿·사이니지 | ID/언어 정확성 유지. 게시/과거 설명서 읽기 전용, 현재 작업본 우선 |
| 판매활동 | 모집·유통참여형 펀딩·이벤트·세미프랜차이즈 제안/이벤트/모집 | 각 원장·기존 상태 전이 유지. 승인된 자기 상품 지정/없는 대상 차단 검증 |
| 설정·역할 | 기존 사업자 정보·SupplierSpaceLayout·App route guard | 기존 인증/인가 유지. 운영자 공용 Drawer에 공급자 전용 링크 비노출 |

사이드바는 5그룹·19개 실제 진입점을 유지한다. `hostProfile.ts`가 펀딩 별칭을 전용 host의 기존 관리 화면으로 연결하는 것도 확인했다. 상품 입력 방법은 상품 추가 내부로 모으고,
기존 URL/legacy deep-link를 보존한다. 단순 파일 행 수를 이유로 추가 모듈 분리를 하지 않았다.
AI 외 신규 기능·정책·DB·migration·공통 프레임워크 변경 잔여는 이번 census에서 확정하지 않았다.

## 수정 및 회귀 근거

- Codex P1(내장 가져오기 취소): 하단 취소에도 부모 callback을 전달한다. 위/아래 취소와 적용이 같은 등록 초안을 사용하며 기존 입력·선택 파일·규제 구분을 보존한다. 복사 중 취소를 차단한다.
- Codex P1(과거 설명서 덮어쓰기): 요청한 과거/게시 ID는 읽기 전용이다. 저장·검수·이미지 업로드·템플릿 편집을 막고 명시적 현재 작업본 열기를 제공한다. 기존 작업본이 있으면 그 내용을 우선한다. 작업본이 없을 때만 게시 내용을 바탕으로 새 작업본을 명시적으로 시작할 수 있다.
- 설명서 기본 진입·언어 전환도 현재 작업본을 우선한다. 저장 캐시는 ID로 갱신하고 철회는 해당 ID만 제거해 같은 언어의 과거/게시 행을 보존한다. 미저장 닫기를 확인하며 저장 실패/닫기 취소 후 같은 내용을 재시도할 수 있다. 저장/철회 중 언어 전환·닫기를 차단한다.
- Codex P2(검색): 입력과 확정 URL 검색어를 분리한다. 실제 공유 SearchBar의 debounce/Enter로 확정할 때 목록·카운트가 각각 한 번 조회된다. 동일 검색 반복으로 추가 조회하지 않는다. 초기화/URL 뒤로가기 후 남은 타이머는 폐기된 검색어를 복원하지 않는다.
- 모바일 설명서 목록: 언어별 상태 칩이 편집 버튼을 390px 화면 밖으로 밀어내는 것을 브라우저에서 재현했다. 상태를 상품명 아래에서 줄바꿈한다.
- 추가 대상 전환 점검: 판매활동 3종에서 URL을 정상 상품→없는 상품으로 바꿀 때 이전 선택을 비우고, 사이니지는 이전 제작 폼을 닫는다. fresh mount뿐 아니라 같은 컴포넌트의 URL 변경을 검증했다. 다른 상품에 잘못 제출할 수 있는 잔류를 차단한다.
- 최종 Sonar 분석에서 신규 코드 Reliability B와 annotation 14건을 확인했다. URL 갱신의 조건문 중괄호·중첩 빈 상태 문구·readonly props·state setter 이름을 정리하고, 상품/설명서 닫기 overlay를 native button으로 바꾼다. 상품 상세의 후속 작업/상태, 제품 검토 접수 완료, 설명서 언어/읽기 전용 안내를 표시 책임별로 분리한다. 가져오기 이미지 반영은 기존 media hook이 담당하며 필드·파일 보존 동작은 유지한다.
- 공용 Drawer 소비처를 다시 전수 검색했다: SupplierProductsPage·OperatorProductApprovalPage·행동 회귀. 기존 helper의 공급자 이미지/편집 hook과 media hook의 입력/제출 type 소비처도 확인했다. 운영자 승인 callback과 공급자 전용 링크 비노출을 함께 검증한다.
- 로컬 SonarJS cognitive-complexity 검사: 대상 8파일의 함수가 모두 기준 15 이하, 오류 0. 검사 도구는 `/tmp`에 별도 설치했고 저장소 dependency/lockfile은 변경하지 않았다. 최종 원격 Sonar도 지적 0으로 통과했다(아래 통합 근거).
- HEAD `1ed6aa069`의 PR CI **38737723941 SUCCESS**, required CI Gate·CodeQL·Guard·Sonar 모두 PASS, review thread 미해결 0. Sonar에 자료 현황 중첩 조건식의 표시 권고 1건이 남아 목록 표시를 순차 반환하는 별도 함수로 정리했다. DOM·필터·조회/재시도 동작은 보존했다. 관련 행동 **25/25**, ESLint·인지복잡도·빌드 PASS. 이 보완 뒤의 최신 HEAD로 통합 gate를 다시 확인한다.

## 로컬 검증

- Node `22.18.0`, pnpm `10.25.0` — 저장소 pin과 일치. 기존 설치된 전용 worktree 의존성을 사용하며 lockfile 변경 없음.
- web-neture Vitest: 로컬 전체 **1,019/1,019 PASS**, 실패/skip 0. `/tmp/supplier-closure-quality-final-vitest.json`. 마지막 자료 목록 표시 분리 뒤 동선 25건·타입/빌드·브라우저를 재검증했고, 최종 PR·병합 후 CI에서도 전체 suite가 통과했다.
- web-neture `tsc && vite build`: **PASS**. 최종 품질 보완 후 로그 `/tmp/supplier-closure-quality-final-build.log`. 기존 Browserslist 갱신·큰 chunk 경고는 유지.
- Supplier boundary Jest: **41/41 PASS**. 문서 민감정보 guard와 `git diff --check` PASS.
- 초기 전체 실행에서 즉시 검색을 가정한 기존 테스트 1건이 실패했다. 검색 확정 동작을 실행하도록 테스트를 수정했고 위 최종 전체 실행에서 통과했다.
- 추가 URL 대상 전환 보완 후 관련 행동 회귀 **25/25 PASS**, `tsc && vite build` 재통과. 초기 전체 1,015건에 URL 전환 4건을 더한 최종 전체 1,019건도 통과했다.
- 최종 변경 11개 소스 파일의 저장소 ESLint PASS. 표시 책임 분리 후 Supplier 행동 회귀 113건·전체 1,019건·경계 41건·PC/mobile fixture를 재확인했다. 마지막 자료 목록 표시 분리 후에도 동선 25건·ESLint·인지복잡도·빌드·PC/mobile을 재확인했다. 최종 browser 로그 `/tmp/supplier-closure-material-browser.log`.
- 격리 브라우저 **1440px/390px PASS**: 상품 추가·위/아래 가져오기 취소·주문 목록/상세 복귀·자료 ID/언어·읽기 전용/현재 작업본·태블릿/사이니지·3종 판매활동 상품 전달·URL 대상 정상→없는 상품 전환 4종·검색 요청 횟수·조회 실패/재시도. page error 0, 업무 write 0, 홈/태블릿/설명서 전체 가로 넘침 없음. `/tmp/supplier-closure-browser.json`. 초기 fixture의 잘못된 HTML/오류 주입은 고쳤으며 마지막 실행만 완료 근거로 사용했다. 실제 API는 fixture로 차단한다.

## 통합·배포·운영 확인

- 실제 main ruleset: PR 필수, required `CI Gate`, human approval 0. admin bypass·force push·direct main push를 사용하지 않는다.
- GitHub 저장소 변수 API는 현재 integration 권한으로 403이다. freeze를 추정하거나 변경하지 않고 정식 Delivery의 실제 분류·gate 결과를 확인한다.
- Actions 상세 artifact 다운로드는 Azure 결과 저장소의 egress 제한으로 불가했다. GitHub API의 job/step·commit status와 운영 브라우저 결과를 구분해 기록한다.
- 최종 [PR CI 38739861492](https://github.com/Renagang21/o4o-platform/actions/runs/38739861492) SUCCESS. HEAD `e72949faf4c54e7e93ef6da75560554a7fd54260`, required CI Gate·CodeQL·Guard·Sonar PASS. Sonar annotation **0**, Codex 3건 처리·미해결 review thread **0**.
- [PR #629](https://github.com/Renagang21/o4o-platform/pull/629) 정상 merge: main `20a04ee2a3337687eae86c4029b01d83b2479a1a` (2026-10-15). PR HEAD와 병합 tree 전체 차이 0, source tip이 main 조상임을 확인했다. direct push·force push·admin bypass 없음.
- [post-merge CI 38741504453](https://github.com/Renagang21/o4o-platform/actions/runs/38741504453): **SUCCESS**.
- [Delivery 38742977260](https://github.com/Renagang21/o4o-platform/actions/runs/38742977260): **SUCCESS**, target `20a04ee2a3337687eae86c4029b01d83b2479a1a`. `Deploy to Cloud Run`·`Smoke new revision and switch traffic (verified rollout)`·최종 `Report (serving SHA · commit status)` 모두 SUCCESS. Report가 serving SHA=target을 확인했고 `production = success / DEPLOYED · deploy: neture`다. 상세 Actions artifact는 egress 제한으로 받지 못했으므로 revision 이름을 별도 수기 확인한 것으로 보고하지 않는다.
- DEPLOYMENT = AUTOMATIC — 정식 Delivery의 CI·freeze·serving 판정으로 Neture 웹만 배포했다. API·Admin은 skip, migration/API 배포·promote·freeze 변경 없음.
- 공유 작업 확인: 별도 진행 중 PH-only media/GCS 정리 Job의 대상과 Neture 웹 서비스 배포는 다르다. 다른 세션의 run을 취소하거나 설정을 변경하지 않았다.
- 종료 기록은 최신 main `20a04ee2a`에서 새 문서 전용 worktree/branch `wo/supplier-non-ai-deployment-record`로 작성한다. 앱 소스·의존성 변경 없이 이 WO/CHECK만 갱신한다.
- 운영 desktop/mobile 읽기 전용 smoke: **PASS**. 공급자·매장 역할 계정을 사용했으며 운영자 실제 검수는 사용자 담당이다. 아래 운영 확인에 실행 범위와 초기 메뉴 대기 원인을 구분한다.
- 배포 전 계정 준비 확인: 공급자·매장 경영자·매장 직원의 실제 로그인 모두 200, 테스트 업무 데이터 생성 없음.

## 배포 후 운영 확인

| 확인 | 결과 |
|---|---|
| 공급자 화면 직접 진입 | 19경로 × 1440px/390px = **38/38 PASS**. 새 상품 추가·자료 현황 명칭과 최종 destination 확인. 펀딩 별칭은 기존 funding host 관리 화면으로 연결 |
| 다른 역할 차단 | 매장 경영자·직원 각각 PC/mobile = **4/4 PASS**, 공급자 상품 화면에 접근 권한 없음 표시 |
| 실제 계정 로그인 | 세 역할 × PC/mobile = **6/6 PASS**, 응답 200 |
| 메뉴 진입 | 두 해상도에서 19개 메뉴 대상 전부 존재, 실제 자료 현황 메뉴 클릭 **2/2 PASS** |
| 오류·데이터 | API 오류 0·page error 0·전체 화면 가로 넘침 0·차단된 업무 write 0. 업무 생성/수정/삭제 요청 없음 |
| HTTP 준비 상태 | API `/health/ready` 및 공급자 웹 경로 모두 **200** |

운영 메뉴 검증의 첫 실행은 프로필 미완료 계정의 기존 보완 안내 모달을 닫지 않아 클릭 대기 시간이 초과됐다.
소스 `SupplierActivationGate`에서 `나중에 하기`가 화면 상태만 닫는 동작임을 확인하고 그 순서를 반영했다.
업무 데이터 변경 없이 안내를 닫은 뒤 PC/mobile 메뉴를 다시 검증해 통과했다. 이 문제로 앱 코드를 추가 변경하지 않았다.
직접 URL·역할·API 검증의 통과와 메뉴 재검증을 구분한다. 근거는 `/tmp/supplier-closure-production.json`(38+4경로·6로그인),
`/tmp/supplier-closure-production-menu-final.json`(안내 닫기 후 메뉴)이다. 두 실행의 검증 범위와 초기 대기 원인을 별도 근거로 보존했다.

## 데이터·문서 정합

로컬 행동 테스트는 격리 fixture다. 운영 상품·주문·결제·배송·정산·게시 업무 데이터 생성/수정/삭제는 이번 작업에서 하지 않는다.
로그인·접속·보안 감사기록은 정상 보존 정책을 따른다. 계정값·credential·production 응답 원문은 기록하지 않는다.
Supplier Domain §2.1 메뉴 정렬은 선행 PR에 포함되어 있다. 기존 완료 WO/CHECK와 canonical index 상태는 변경하지 않는다.
이 종료 기록의 변경은 WO/CHECK 2파일뿐이며 `DEPLOYMENT = NOT_APPLICABLE`이다. 문서 PR의 병합 상태는 GitHub에서 확인하고, 자기 worktree 정리는 main 포함·clean·남은 작업 없음 조건을 확인한 뒤 수행한다. 다른 세션 checkout은 정리 대상이 아니다.
