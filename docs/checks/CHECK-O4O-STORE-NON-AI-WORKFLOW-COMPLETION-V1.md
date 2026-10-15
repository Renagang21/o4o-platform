# CHECK-O4O-STORE-NON-AI-WORKFLOW-COMPLETION-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-15 (한국시간)
> **범위**: AI 제외 내 매장 화면·기능 정돈 개발 검증. main 통합·배포·실사용 검증 완료가 아니다.
> **요청**: 기존 네 목적지 배치를 기준으로 상품·자료·안내 작성·재사용·현장 적용을 하나의 개발 묶음으로 정비.

## 1. 기준과 격리

- 착수 최신 `origin/main`: `e6202355af0fc0f39a778d5a2bb51b76bab70896`.
- 새 전용 worktree: `/workspace/o4o-wt/store-non-ai-workflow-completion`.
- branch: `wo/store-non-ai-workflow-completion`.
- 기존 작업 트리는 수정·삭제·재사용하지 않았다.
- 착수 시 #619·#625는 OPEN, 해당 head의 CI Gate·SonarCloud SUCCESS였다. 본 branch에 두 개발 변경을 포함했다. main을 병합하거나 자동 병합·배포를 설정하지 않았다.
- 포함한 선행 head: #619 `d20823d6693cc1839abdb5b3957d0a51d6e93a53`, #625 `38cb5e4411d68df1939ca35fbb276963f45497b5`.
- #619 리뷰의 P1(화면 세트 제목 저장과 블록 저장 사이 이탈로 부분 저장되는 문제)을 이번 작업에서 보완했다. 원 PR 리뷰 스레드 상태와 실제 수정 검증을 구분한다.

## 2. 조사·판정·수정

| 업무 모집단 | 최신 코드 판정과 수정 | 유지한 경계 |
|---|---|---|
| 홈·네 목적지 | #625 배치 포함. 홈 즉시 업무 시작, 주요·접힌 상세 진입, 미구현 상담 예고 노출 보류 | My Home 개인 공간과 선택 매장 구분. 가상 진행 작업·통계 없음 |
| 내 상품·직접 등록·표준 상품·등록 요청 | 기존 등록·요청 업무는 재사용. 등록·진열 관리 접기, 상품에서 안내·태블릿·다국어로 현재 경로 유지 | 서비스 가입을 제품 이용 조건으로 추가하지 않음. 표준 상품과 매장 자체 상품 원장 유지 |
| 자료 탐색·가져오기·내 자료함 | 주요 출처와 상세 유형 분리. 다국어 제공 자료·내 안내 재진입. 중복 사본 만들기 제어와 현재 서비스 자료함 복귀 | 사본 독립성·출처/소유권 유지. 재가져오기별 기존 덮어쓰기/새 사본 계약 유지 |
| 직접 작성·스냅샷·제작 자료 | 현재 서비스 경로와 자료함 검색·출처·태그·페이지 복귀. 제품 참조 전달, 다른 매장 제품의 자동 작성 중지. 작성 취소 시 미저장 확인 | 기존 콘텐츠 ID·저장 형식 유지. 전역 상품 설명에 매장 쓰기 없음 |
| 상품 설명·다국어 | 기존 편집·발행·대체 언어 처리를 재사용하고 내 안내 목록·운영으로 재진입. 매장 전환 시 편집 세션 초기화 | `detail_html` 매장 소유권, 언어별 원문·비 HTML 발행 계약 유지 |
| QR·PDF | 인라인 생성·상태 변경 동시 실행 차단, 실패 입력·재시도, 저장 중 닫기 제어. 기본 dialog 재사용. PDF 본문·옵션·팝업 확인 | QR 주소·참조 ID·기존 출력 계약 유지. QR 발행과 실제 스캔 성공은 별개 |
| POP | 기존 POP V2 위에 매장 세션 보호. 저장 실패한 문서의 이전 내용 출력 차단, 다른 정상 문서 출력은 허용 | 공통 Core·POP 원장·템플릿·렌더러 계약 무변경 |
| 블로그 | 매장 정보·목록·설정 실패 구분과 재시도. 실패 입력·저장 중 추가 입력 보존. 초안 중복 생성과 설정 미조회 덮어쓰기 방지. 공개 주소는 서비스 origin 사용 | 저장·발행·보관과 공개 노출 구분. 기존 service 인자·sourceItems 유지 |
| 태블릿 | #619 진열·화면 구성 정비 포함. 시작한 제목/블록 두 요청은 원래 매장·서비스로 완료. 다른 세션에는 이전 완료 결과를 반영하지 않음 | 기존 두 endpoint와 블록·적용·기기 계약 유지. 서버 원자 저장 기능을 새로 만든 것은 아님 |
| 사이니지 | #619 미디어 편집·명시적 미리보기·실패 복구 포함. 새 플레이리스트·편집·운영 진입에 현재 경로 유지 | `store_playlists` 스냅샷과 `signage_playlists` 미디어 모델 통합·dual-write 없음 |
| 실행 현황·운영 | 태블릿/QR 조회를 별도 처리·재시도. 실패를 0건으로 표시하지 않음. 조회 범위 표시와 적용·출력·수정 진입 | 저장 설정, 게시, 배치, 기기 연결·실제 재생을 같은 완료 상태로 표시하지 않음 |

AI 대화창·자동 생성·추천·경험 학습·통합 작업 이력은 제외했다. 기존 외부 도구 보조는 유지했다.
공통 Core·서버 route/API·권한·DB·dependency·lockfile·CI·배포 설정 변경은 없다.

## 3. Shared Module Change Verification

변경은 `services/web-store` 내부의 페이지·조합·클라이언트다. `packages/*` 및 API 서버 구현은 변경하지 않았다.
수정 모듈명·import, endpoint·상위 경로, 사용자 노출 label/href, 파일 경로 기반 raw-source 소비처를 재조사했다.
인구조사 도구의 경로 검색 0건을 runtime 소비처 0건으로 해석하지 않았다.

| 소비처 | 사용 여부·영향 | route/role/capability | 검증 |
|---|---|---|---|
| 공통 내 매장 `/store/*` | 페이지·홈·자료·운영 조합 직접 소비 | 기존 소유권·승인·capability 필터 유지 | 전체 Vitest·build·집중 lint·desktop/mobile browser |
| KPA 지정 매장 `/work/kpa-society/store/*` | 같은 store child route 소비 | 동일 매장/서비스 경로 유지. 제공 자료 전용 공통 route는 기존 위치 사용 | desktop/mobile 연결 흐름·회귀 검사 |
| 자료 전용 `/store/library/*` | `UnifiedStoreLibraryLayout`·다국어 탐색/내 사본 | 기존 gate 유지. 내 사본에서 출처 목록 중복 제거 | 실제 layout/menu + 합성 권한 경계 browser |
| Store 로컬 API의 다른 페이지 | `tabletDisplays`, `pharmacyInfo`, `blogStaff` 소비 | 성공 envelope 검증·선택 매장/서비스 캡처. 서버 계약 불변 | API scope/refresh 단위 검사·페이지 회귀·build |
| KPA 독립 앱·Neture·admin·operator·forum·My Home | 변경한 Store 구현을 직접 import하지 않음 | 공통 package·상위 URL·권한 계약 변경 없음 | import·경로 census 및 관련 API raw-source 계약 7 suites |
| K-Cosmetics·PharmacyHub | 퇴역 경계 유지 | 기능·가입·역할·API 복구 없음 | 기존 퇴역 navigation 회귀·소비처 조사 |
| raw-source / 테스트 | 실제 소비처로 포함 | 내부 AI OFF·외부 도구 보조·POP V2·Store 접근 경계 유지 | Jest 198개·Store Vitest 전체 |

관련 정본: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [공통 모듈 변경](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md), [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md), [상품 설명 소유권](../design/DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1.md), [사이니지 모델 경계](../baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md).

## 4. 실행 검증

Node `22.18.0`, pnpm `10.25.0` 활성화 후 실행했다.

| 검사 | 결과 |
|---|---|
| frozen install + store integrity | PASS — `pnpm install --frozen-lockfile --verify-store-integrity=true --store-dir /workspace/.pnpm-store` |
| workspace prerequisites | PASS — `pnpm run build:packages` 완료 후 검사 |
| Store 전체 단위·컴포넌트 | PASS — 45 files / 569 tests, `pnpm exec vitest run --config services/web-store/vitest.config.mjs --maxWorkers=2` |
| raw-source 계약 | PASS — 7 suites / 198 tests, API 서버 Jest `--runInBand --runTestsByPath` |
| Store production build | PASS — `pnpm --filter store-web build` (`tsc -b` + Vite) |
| 변경 TS/TSX 집중 ESLint | PASS — 오류·경고 0 |
| desktop/mobile Chromium | PASS — 아래 120개 합성 API 흐름 |
| 문서 민감정보·diff whitespace | PASS — `node scripts/check-doc-sensitive.mjs`, `git diff --check` |

최종 검사 전 한 전체 실행에서 수정하지 않은 B2B 수량 변경 검사 1개가 일시 실패했다.
해당 파일 격리 재실행은 8/8 PASS, 마지막 전체 실행은 569/569 PASS였다. B2B 코드·검사를 수정하거나 실패 검사를 제외하지 않았다.
Vite의 기존 chunk 크기·Browserslist 데이터 경고는 남아 있다. 의존성·build 설정을 변경하지 않았다.
Jest는 저장소의 기존 force-exit 설정에 따른 종료 안내를 출력했다.

## 5. 브라우저 검증

Chromium, desktop `1440×1000` / mobile `390×844`.
실제 production 화면 컴포넌트·클라이언트를 별도 Vite harness로 빌드하고 API HTTP를 합성 응답으로 처리했다.
선택 매장 A/B와 직원 표시는 fixture다. 자료 전용 layout 검사는 권한 경계를 fixture로 대체했고 실제 메뉴/layout을 렌더했다.
예상하지 않은 요청·pageerror·검사 지점의 문서 가로 넘침은 0이었다.

| 묶음 | 수 | 확인 |
|---|---:|---|
| 네 목적지·홈·보조 메뉴 | 36 | 즉시 업무 시작, 지연/실패·재시도, 최근 활동 lazy 조회, 상세 접힘, 경로·직원 필터, 매장 전환 |
| 다국어 | 16 | 자료 탐색·제품 검색/페이지·가져오기 실패/중복·연결 제품 편집·언어 초안 보존·대체 언어·공개 링크/QR·비 HTML 발행 내리기 |
| 태블릿·사이니지 | 20 | 진열 연결 실패 복구, 빠른 상품 편집, 화면 부분 저장 재시도, 지연 편집 취소, 미디어 명시적 미리보기·저장 실패·스냅샷 유형·매장 전환 |
| 연결된 수동 업무 | 44 | 상품→직접 작성→미리보기→실패/중복→저장→같은 ID 수정→QR 생성/상태 변경, 검색 복귀, 인쇄 본문, 실행 현황, 이전 매장 제품 차단, 자료 복사, 블로그, POP, 저장 중 이탈/전환 |
| 자료 출처·내 안내 메뉴 | 4 | 실제 layout에서 유형 접힘/펼침과 다국어 내 사본 재진입 |
| 합계 | 120 | 합성 기능 검증이며 실사용 검증이 아님 |

Artifacts는 checkout 밖 `/workspace/.o4o-non-ai-browser`에 보존했다.
`create-390-scoped.png`, `sources-390.png`, `studio-1440-common.png` 및 각 check script/results JSON을 포함한다.
로그는 `/tmp/o4o-non-ai-*.log`에 있다. fixture만 포함하며 실제 계정·운영 응답은 사용하지 않았다.

## 6. 남은 경계와 통합 인계

- 실계정 로그인·실제 권한/직원 초대→수락→승인→해제·운영 데이터 변경은 실행하지 않았다.
- 실제 QR 출력·스캔, 태블릿/사이니지 연결·재생·수정 반영은 현장 검증으로 남는다.
- PDF 검사는 실제 선택 본문으로 인쇄용 문서를 구성하는 경로와 합성 POP 출력 응답을 검증했다. 실제 프린터·외부 렌더러 검증을 뜻하지 않는다.
- 두 endpoint의 태블릿 저장에서 서버 실패가 발생하면 기존 header가 남을 수 있다. 같은 작성 세션의 재시도는 생성 ID를 재사용한다. 서버 transaction·새 재개 저장소는 추가하지 않았다.
- 응답 유실의 성공 여부와 브라우저를 닫은 뒤 미저장 입력 복원은 보장하지 않는다. 새 autosave·Task/Memory 저장소를 만들지 않았다.
- 본 branch는 #619·#625를 포함한다. 통합 담당자는 기존 PR과 중복되는 변경을 확인하고 본 PR의 최신 CI·리뷰를 기준으로 순차 통합한다.
- 개발 종료점은 commit→push→PR 생성→검증·CI 상태 인계다. main 병합·자동 병합·배포는 수행하지 않는다.

문서 정합: [화면 설계](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md)에 승인된 수동 업무 흐름과 AI·실사용·통합 경계를 반영했다. Canonical Index와 정책/Frozen 정본은 변경하지 않았다. 최초 설계의 옛 명칭·AI 방향은 승인 반영 절과 구분해 보존했다.

## 7. WORKTREE_DISPOSITION

- worktree: `/workspace/o4o-wt/store-non-ai-workflow-completion`
- branch: `wo/store-non-ai-workflow-completion`
- base: `e6202355a`
- main integration / deployment: 미수행
- smoke: 합성 API desktop/mobile 120 flows
- other session usage: 이 작업 전용
- verdict: KEEP — 미병합 개발 PR의 후속 수정·검증 artifacts 보존


## 2026-10-16 통합 담당 후속

고정 main `df5f28a934cb4bb3db0e51427ebcbfdf7c838f32`에서 전용 `wo/store-pr-integration-20261016` branch에 #634 `0dcf0b0829`를 합쳤다. #619 `d20823d669`·#625 `38cb5e4411`·#614 `7a9f327e75` 모두 이 head의 조상임을 확인했다. 원본 branch는 수정하지 않았다.

- #619의 두 요청 사이 취소 결함: 이미 시작한 header/write + blocks를 캡처한 원래 writer로 완료하고, 새 화면 세션에 이전 결과를 적용하지 않는 실제 구현을 대조했다.
- #614의 preview allowlist 결함: 일반 snapshot patch는 videoPreviewUrl로 거절하지 않고 선택적 미리보기·직접 영상 등록에서만 해당 검사를 사용하는 것을 대조했다.
- 현재 통합본에서 frozen install/build:packages, Store 전체 Vitest **569 PASS**, 선택한 Store 접근·QR·POP·내부 AI 차단·원문 계약 Jest **7 suites/142 PASS**, production build, 변경 TS/TSX 전체 ESLint 오류/경고0, docs/diff 검사를 실행했다. 원개발의7 suites/198과 이번 선택 목록은 다르므로 같은 집계로 대체하지 않는다.
- `services/web-store`, `packages`, lockfile의 런타임 tree는 #634 head와 diff0다. 이번 통합은 UI를 추가 수정하지 않았으며 위 원개발120개 browser 흐름과 이번711개 자동 검증을 구분한다. 이번 회차에 browser120개를 다시 실행했다고 보고하지 않는다.
- 실계정·운영 API/DB·QR 스캔·실기기 재생·배포 smoke는 미실행이다. PH plan·삭제 운영 창 뒤 CI·Sonar·Codex를 확인해 순차 통합/배포한다.

새 회차 CHECK를 만들지 않고 기존 기록에 이어 쓴다. 정본·정책·canonical index 변경은 없다.


### 통합 CI 후속 — 장바구니 첫 입력 회귀

다른 소비처 CI에서 드러난 공통 baseline 장바구니 입력 경쟁을 같은 통합 공간에서 수정한 commit 2ef246c99를 이 branch에 cherry-pick했다. 초기 동기화를 layout effect로 완료하고 이벤트 값을 updater 밖에서 복사한다. 신규 회귀는 수정 전 첫 입력 유실을 재현했다. 이 후속은 앞 절의 원본 runtime tree 동일성 확인 이후 추가한 변경이다. 현재 Store 전체 **570 PASS**, production build PASS. 기존 API 계약 142 PASS는 이전 절 기록과 같으며 실제 주문·결제를 실행하지 않았다.


### 통합 리뷰 후속 — 제공 자료 CTA의 실제 route ranking

#640 리뷰는 서비스 문맥에서 `/store/library/content`가 UnifiedStoreLayout을 거쳐 잘못된 `/work/...`로 rewrite된다고 지적했다. 실제 App의 route element tree를 `createRoutesFromElements`와 `matchRoutes`로 평가한 회귀3개에서 content·multilingual-product-contents·그 하위 my 모두 sibling `/store/library` branch가 선택되고 `/store` branch는 선택되지 않았다. 따라서 해당 이동에서는 UnifiedStoreLayout 자체가 실행되지 않으며, 서비스 scope를 지우거나 불필요한 mount를 추가하지 않는다. 이 검증은 축약 fixture router가 아니라 실제 App 선언을 사용한다. 신규3개 PASS, 기존 Store570개는 앞 절 결과다. 실제 브라우저 전체120개를 다시 실행한 결과는 아니다.
