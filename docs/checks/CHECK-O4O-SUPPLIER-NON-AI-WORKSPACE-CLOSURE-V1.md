# CHECK-O4O-SUPPLIER-NON-AI-WORKSPACE-CLOSURE-V1

> 상태: IN_PROGRESS · 작성일: 2026-10-15
> 실행 WO: [WO-O4O-SUPPLIER-NON-AI-WORKSPACE-CLOSURE-V1](../work-orders/WO-O4O-SUPPLIER-NON-AI-WORKSPACE-CLOSURE-V1.md)
> 이력: 기존 #629의 코드·fixture 검증은 [선행 CHECK](CHECK-O4O-SUPPLIER-WORKSPACE-TASK-FLOW-V1.md)에 보존한다. 이 기록은 추가 review 보완·통합·배포 결과다.

## 문서·코드 census

기준 main `e6202355af0fc0f39a778d5a2bb51b76bab70896`을 자기 branch에 정상 merge했다.
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

## 로컬 검증

- Node `22.18.0`, pnpm `10.25.0` — 저장소 pin과 일치. 기존 설치된 전용 worktree 의존성을 사용하며 lockfile 변경 없음.
- web-neture Vitest: **1,015/1,015 PASS**, 실패/skip 0. 최종 결과 `/tmp/supplier-closure-final-vitest.json`.
- web-neture `tsc && vite build`: **PASS**. 모바일 배치 보완 후 해당 행동 회귀 **21/21 PASS**와 빌드도 재확인했다. 기존 Browserslist 갱신·큰 chunk 경고는 유지. 로그 `/tmp/supplier-closure-layout-build.log`.
- Supplier boundary Jest: **41/41 PASS**. 문서 민감정보 guard와 `git diff --check` PASS.
- 초기 전체 실행에서 즉시 검색을 가정한 기존 테스트 1건이 실패했다. 검색 확정 동작을 실행하도록 테스트를 수정했고 위 최종 전체 실행에서 통과했다.
- 격리 브라우저 **1440px/390px PASS**: 상품 추가·위/아래 가져오기 취소·주문 목록/상세 복귀·자료 ID/언어·읽기 전용/현재 작업본·태블릿/사이니지·3종 판매활동 상품 전달·검색 요청 횟수·조회 실패/재시도. page error 0, 업무 write 0, 홈/태블릿/설명서 전체 가로 넘침 없음. `/tmp/supplier-closure-browser.json`. 초기 fixture의 잘못된 HTML/오류 주입은 고쳤으며 마지막 실행만 완료 근거로 사용했다. 실제 API는 fixture로 차단한다.

## 통합·배포·운영 확인

- 실제 main ruleset: PR 필수, required `CI Gate`, human approval 0. admin bypass·force push·direct main push를 사용하지 않는다.
- GitHub 저장소 변수 API는 현재 integration 권한으로 403이다. freeze를 추정하거나 변경하지 않고 정식 Delivery의 실제 분류·gate 결과를 확인한다.
- Actions 상세 artifact 다운로드는 Azure 결과 저장소의 egress 제한으로 불가했다. GitHub API의 job/step·commit status와 운영 브라우저 결과를 구분해 기록한다.
- PR 수정 push·CI·review thread·병합·post-merge CI·Delivery·serving SHA: **PENDING**.
- 운영 desktop/mobile 읽기 전용 smoke: **PENDING**. 공급자·매장 역할 계정을 사용하며 운영자 검수는 사용자 담당이다.
- 배포 전 계정 준비 확인: 공급자·매장 경영자·매장 직원의 실제 로그인 모두 200, 테스트 업무 데이터 생성 없음.

## 데이터·문서 정합

로컬 행동 테스트는 격리 fixture다. 운영 상품·주문·결제·배송·정산·게시 업무 데이터 생성/수정/삭제는 이번 작업에서 하지 않는다.
로그인·접속·보안 감사기록은 정상 보존 정책을 따른다. 계정값·credential·production 응답 원문은 기록하지 않는다.
Supplier Domain §2.1 메뉴 정렬은 선행 PR에 포함되어 있다. 기존 완료 WO/CHECK와 canonical index 상태는 변경하지 않는다.
