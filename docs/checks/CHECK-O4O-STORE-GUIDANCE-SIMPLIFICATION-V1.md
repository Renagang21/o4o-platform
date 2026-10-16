# CHECK-O4O-STORE-GUIDANCE-SIMPLIFICATION-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-16 · **최종 갱신**: 2026-10-16
> **근거 WO**: [WO-O4O-STORE-GUIDANCE-SIMPLIFICATION-V1](../work-orders/WO-O4O-STORE-GUIDANCE-SIMPLIFICATION-V1.md)

## 1. 기준과 종료점

최신 `origin/main` `04ff6b829cc087c676c663ef688153497895889c`에서 전용 worktree `/workspace/o4o-wt/store-guidance-simplification`, branch `wo/store-guidance-simplification`을 만들었다.
초기 TODO를 작성한 뒤 정본·producer/consumer·raw-source 검사를 대조해 실행 TODO를 수정했다.
사용자 지시에 따라 commit·push로 종료하며 **PR을 만들지 않는다.** main 병합·자동 병합·배포는 수행하지 않는다.

## 2. 변경 결과

- 새 제작의 기본 배치는 기존 키를 사용하는 3종이다. 기존 진열형·대기 영상형을 자동 변환하지 않고 같은 ID·키·블록으로 편집·저장한다. 상품 이미지 미사용 정책을 유지한다.
- 공용 제작기는 선택적 영역을 접어 입력을 보존한다. 중복 저장·저장 중 닫기를 막고 실패를 지속 표시한다. Store·KPA Store·운영자·공급자의 헤더 생성 후 블록 실패는 같은 작성 세션의 생성 ID로 재시도한다.
- 공용 태블릿은 제목·QR을 가리지 않고 한 방향으로 스크롤한다. 제품·자료는 native button으로 선택한다. 자료/QR 상세의 native dialog는 Escape·닫기·포커스 복귀를 지원한다. ScreenSet 상세를 읽을 때 최소 2분의 무조작 유예 후 상세·확대 QR을 정리한다.
- QR 모바일은 고객 제목을 사용하고 관리 이름을 노출하지 않는다. 고객 제목이 없으면 기본 제목을 쓴다. 기존 원본·순서 의미·대기 영상 제외 계약을 유지하며 제품 중심 배치는 제품을 먼저 보여준다. 상품 QR의 기존 연결을 안전한 HTTP(S)/상대 링크로 직접 연다.
- Store의 두 경로에서는 저장 후 같은 안내의 적용·다시 수정으로 이어가고 사용 중인 안내에서 직접 제작 화면을 연다. 수정 영향 위치와 실제 기기 확인 필요를 안내한다. 적용 실패는 선택을 유지한 채 재시도한다. 저장 안내 배너도 최신 목록 상태를 따르며 보관된 안내에는 적용 동작을 노출하지 않는다.
- QR 주소 변경은 접힌 선택 사항이다. 기존 자동 주소·사용자 입력·생성/연결 계약을 보존한다.
- 사이니지 일정은 재생목록·요일·시간과 상세 기간·우선순위를 구분한다. 자동 관리 이름은 재생목록에서 채우고 수동 입력을 보존한다. 현황은 저장 일정 기준임을 표시한다.

## 3. Shared Module Change Verification

공개 타입·컴포넌트 주입 계약·export 이름·API/DB·route·권한·의존성·잠금 파일·CI는 변경하지 않았다. `LEGACY_ONLY_TEMPLATE_KEYS`는 진열형의 신규 선택 노출 보류를 반영한다. 공용 패키지는 기존 렌더·제작 UI 내부만 정돈했다.
실제 import와 endpoint·사용자 문구·href·파일 경로를 검색하고 raw-source 소비처도 포함했다. 공통 Core 데이터 모델이나 resolver를 바꾸지 않았다.

| 소비처 | 영향과 유지 경계 | 검증 범위 |
|---|---|---|
| Store `/store/*`, `/work/kpa-society/store/*` | Store 조합·공유 제작/뷰어·새 저장/적용/직접 수정 진입. 기존 매장·서비스 scope 유지 | 전체 Store 테스트, build, 두 경로 desktop/mobile 합성 API browser |
| KPA 매장 `TabletScreenSetManager` | 기존 adapter·목록·출처를 유지하고 공용 제작 UI 소비 | KPA build, 실제 manager의 desktop/mobile 생성·부분 실패·같은 ID 재시도 |
| KPA 공개 `/tablet/:slug`, `/qr/:slug`·미리보기 | 기존 공용 뷰어·resolver 응답 소비. 새 로그인·주문/결제 없음 | 실제 뷰어 desktop/mobile·키보드·제목/QR·상세·언어 배치·기존 계약 검사 |
| KPA 운영자 | `operatorScreenSetBuilderApi`, SPD 출처, 매장 상품·적용·공개 QR 미제공 유지 | KPA build, 실제 원본 페이지의 desktop/mobile 생성·부분 실패·재시도·Store endpoint 미호출 |
| Neture 공급자 | `supplierScreenSetBuilderApi`, SPD 출처와 별도 게시 흐름 유지 | Neture build, 실제 원본 페이지의 desktop/mobile 생성·부분 실패·재시도·Store endpoint 미호출 |
| admin·forum·My Home·기타 Neture 화면 | 수정한 UI의 직접 소비가 없는 부분은 동작/계약 변경 없음 | import/경로 조사, 변경 앱 build |
| 퇴역 K-Cosmetics·PharmacyHub | 새 consumer·기능·가입·권한·API를 복구하지 않음 | 기존 navigation 회귀·raw-source 검사 |

## 4. 실행 검증

Node `22.18.0`, pnpm `10.25.0`. 현재 환경의 `/workspace/.o4o-cloud/activate.sh`를 사용했다.

| 검사 | 실행·결과 |
|---|---|
| 설치·무결성 | PASS — `pnpm install --frozen-lockfile --verify-store-integrity=true --store-dir /workspace/.pnpm-store` |
| workspace prerequisites | PASS — `pnpm run build:packages` |
| Store 전체 단위·컴포넌트 | PASS — 48 files / 590 tests. `pnpm exec vitest run --config services/web-store/vitest.config.mjs --maxWorkers=2` |
| 신규 고객·제작 회귀 | 위 전체 실행에 포함 — 17 tests. 고객 제목/관리 이름 분리, 직접 연결 URL, native 상세·포커스 복귀, idle 유예, 세 기본 배치, 기존 배치 복귀·키 보존, 세 역할의 생성 ID 재사용·실패/중복/닫기, 일정 상세 입력 보존 |
| raw-source·기존 계약 | PASS — API Jest 5 suites / 111 tests. generation consolidation, scoped mount, external LLM authoring, QR canonical, AI first editor boundary |
| Store build | PASS — `pnpm --filter store-web build` (`tsc -b` + Vite) |
| KPA build | PASS — `pnpm --filter @o4o/web-kpa-society build` |
| Neture build | PASS — `pnpm --filter @o4o/web-neture build` |
| 집중 ESLint | PASS — 변경 TS/TSX 11개 파일, 오류·경고 0 |
| desktop/mobile Chromium | PASS — 아래 42개 시나리오 |
| 문서·diff | PASS — 문서 민감정보 패턴 0, 변경 문서 상대 링크 누락 0, `git diff --check` |

Vite의 기존 chunk 크기·Browserslist 데이터 경고는 유지한다. 의존성·빌드 설정을 변경하지 않았다.
Jest는 저장소 설정에 따른 force-exit 안내를 출력했다.
PR은 생성하지 않으므로 PR CI는 실행하지 않는다. CI workflow는 기존 설정을 유지하며 임의 dispatch하지 않는다.

## 5. 브라우저 검증 방식과 artifacts

별도 Vite harness에서 실제 production 페이지·편집기·뷰어·HTTP 클라이언트를 렌더했다.
Auth/선택 매장 문맥과 HTTP API만 합성 fixture다. 문맥 A/B는 실제 계정/매장이 아니다.
실제 외부 AI·운영 API·운영 데이터·로그인을 호출하지 않았다. 외부 요청은 차단하고 예상하지 않은 API와 pageerror를 검사한다.
기기 크기는 desktop `1440×1000`, mobile `390×844`다.

- harness·check script·결과 JSON·스크린샷: `/workspace/.o4o-guidance-browser`
- 단위·build·lint·계약 검사 로그: `/tmp/o4o-guidance-*.log`

| 시나리오 묶음 | 수 | 확인 |
|---|---:|---|
| 태블릿·휴대전화의 세 기본 배치 | 12 | 고객 제목·기존 QR·직접 연결·제품/자료 상세, keyboard Enter/Space·Escape·포커스 복귀 |
| 긴 안내·실제 언어 선택 표시 | 4 | 단일 본문 스크롤, 언어·제목·QR 겹침 없음 |
| QR 주소 선택 입력 | 2 | 자동 주소로 시작, 실패 후 주소 변경·접기·재시도 시 입력 보존 |
| Store 두 경로의 제작·수정·전환 | 12 | 블록 실패 후 같은 ID 재시도, 중복 생성 없음, 적용 실패 후 재시도, 직접 수정, 이전 매장 지연 응답 차단 |
| 사이니지 일정 | 4 | 자동 관리 이름, 상세 우선순위의 접힘·실패·재시도 중 보존 |
| KPA Store·운영자·공급자 실제 제작 페이지 | 6 | 세 기본 배치, 부분 실패 후 같은 ID로 저장, 운영자·공급자에서 Store endpoint 미호출 |
| 저장 배너의 보관 상태 반영 | 2 | 이전 저장 상태가 active여도 현재 목록이 archived이면 적용 동작 미노출 |
| 합계 | 42 | desktop·mobile 각각 실행한 단일 최종 실행 결과 |

예상하지 않은 API·외부 요청과 pageerror는 0이었다. 검사 지점의 문서 가로 넘침도 0이었다.
스크린샷을 직접 확인해 상품 QR을 제품 정보 옆으로 묶고 글자 크기·대비·터치 영역을 조정한 뒤 전체 시나리오를 재검증했다.

## 6. 미확인 범위와 인계

- 합성 API browser는 실사용·실계정 권한 검증을 뜻하지 않는다. 직원 초대→수락→승인→해제와 매장 간 실제 접근 격리는 실행하지 않았다.
- 실제 태블릿/사이니지 기기 연결·재생·수정 반영, QR 실제 인쇄·스캔은 현장 검증으로 남는다.
- 공용 제작기의 재시도는 열린 작성 세션의 ID를 보존한다. 브라우저 재시작 후 재개·전체 서버 transaction·모든 단계 원자성은 추가하지 않았다.
- 자료 원본과 매장 독립 사본의 수정 반영 범위는 기존 계약을 따른다. 새 저장 원장·사이니지 모델 통합·즉시 송출 엔진은 없다.
- AI 생성·대화창·개인화·학습은 후속 범위다. 내부 AI OFF인 Store와 기존 운영자·공급자 주입 정책을 유지한다.
- PR·main 반영·배포를 수행하지 않으며 push한 개발 branch를 보존한다.
- 최종 검토 중 최신 main은 `daad0563c`로 이동했다. 변경은 PR 인계 정책 문서 6개이며 이번 구현 파일과 겹치지 않는다. 최신 AGENTS와 Git 안전 규칙을 확인했고 자동 merge/rebase는 하지 않았다.
- `WORKTREE_DISPOSITION = KEEP`: 통합 전 개발 branch·worktree를 보존한다. Git 결과는 저장소·branch·최종 SHA와 함께 완료 보고로 인계한다.

## 7. 문서 정합

초기 TODO → 점검 후 TODO → 구현·검증 결과를 WO에 남기고 [현재 화면/업무 설계](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md)의 2026-10-16 절을 갱신한다.
과거 WO/CHECK와 canonical index의 판정·상태를 다시 쓰지 않는다.

## 2026-10-16 통합 담당 검증

인계 head `e81a71cc01`을 main `a4063be499`와 결합한 전용 통합 worktree에서 충돌 없이 검증했다. 기존 PR #651을 재사용한다.

- frozen lockfile·integrity 설치와 workspace packages build PASS.
- Store 전체 48 files / 590 tests PASS. 기존 API 계약 5 suites / 111 tests PASS(로컬 scoped-mount 서버가 필요해 sandbox 소켓 제한 확인 후 재실행).
- Store·KPA·Neture TypeScript 포함 production build PASS. 기존 Browserslist·chunk 크기 경고는 비차단이다.
- 실제 공통 PublicScreenSetViewer·TabletKioskPage와 production CSS를 Chromium 1440/390px에서 실행했다. 고객 제목·관리 이름 미노출·가로 넘침 없음, 키보드 상세 열기·Escape·포커스 복귀, 제품 설명·복귀, 모바일 기존 QR 직접 링크의 14개 관측 PASS. pageerror/외부 요청/네트워크 쓰기 각각0. 합성 데이터이며 운영 계정·실제 기기 재생 검증은 아니다.
- 최초 browser harness가 태블릿 제품 상세도 dialog로 가정했다. 기존 전체 상세 화면→뒤로 계약에 맞춰 기대를 바로잡아 재검증했다. 제품 코드를 이 기대에 맞춰 바꾸지 않았다.
- source head의 CI Gate는 PASS였으나 Sonar Reliability B로 실패했다. guardedCancel의 한 줄 다중 조건문을 동작 변경 없이 중괄호·여러 줄로 명확히 구분했다. 보완 후 관련 17 tests와 변경 대상 ESLint PASS. source export package에는 독립 build script가 없어 이를 package build PASS로 집계하지 않는다.

최신 HEAD의 원격 CI·Sonar·Codex 결과는 다시 확인한다. 이 기록은 main 병합·운영 배포 성공을 선행 보고하지 않는다.

## 2026-10-16 개발 담당 Codex P2 보완

통합 담당 보완 HEAD `ea6369546d`(원격 동일 확인) 위에서 같은 branch로 수정했다. API·권한·route 계약, 의존성, lockfile, Sonar 설정은 바꾸지 않았다.

### 수정

- **제작 화면 미리보기의 상세/QR(PRRT_kwDOOXrFm86tDlmk)**: `GuidanceDialog`에 `contained` 모드를 두었다. `TabletKioskPage embedded`의 상세·코너 QR·제품 QR 확대는 `showModal()` 대신 미리보기 상자 안의 non-modal dialog로 열려 바깥 입력·버튼을 가리거나 막지 않는다. Escape·닫기·배경 클릭으로 닫고, 열 때 상세 안으로 포커스를 옮기며, 닫으면 여는 버튼으로 포커스를 돌려준다. Escape는 바깥 편집기로 전파하지 않는다. 독립 태블릿·공개 QR은 기존 native modal을 유지한다.
- **화면 전환 정리**: 매장 slug·Screen Set id가 바뀌면 열린 상세/QR을 닫는다. draft 미리보기는 입력마다 객체가 새로 오므로 객체가 아닌 식별자로 판단하며, 같은 화면의 내용 수정에는 상세가 유지된다.
- **'현재 안내 수정' 재요청(PRRT_kwDOOXrFm86tDsS5)**: 요청마다 증가하는 key를 붙이고, `TabletScreenSetManager`가 처리한 key를 `onAutoEditHandled`로 알려 부모가 그 요청만 비운다. 같은 Screen Set의 반복 요청, 다른 위치·같은 안내, 실패 뒤 재시도가 각각 새 요청으로 열린다. 매장 전환 뒤 이전 매장의 늦은 응답은 기존 세션 분리·`edits.cancel()`로 열지도 확인하지도 않는다. 새 UI route·전역 상태는 없다.
- **탭과 URL 모드 일치**: 수정 요청 시 탭만 바꾸지 않고 탭 버튼과 같은 `workspace=studio` URL로 맞춘다. 이전에는 URL이 `use`로 남아 편집 뒤 '위치별 운영'을 눌러도 돌아가지 않았다.
- **Sonar 실제 blocker**: 원격 gate 실패 조건은 new Reliability B 하나였다. 원인은 modal dialog의 배경 `onClick`에 키보드 대응이 없다는 S1082(BUG)였다. 배경 클릭의 키보드 대응으로 두 모드 공통 Escape `onKeyDown`을 붙였고, 같은 파일의 S6759(props read-only)도 정리했다. 기준 완화·skip은 하지 않았다.
- 유지보수성 경고로 남긴 것(gate 조건 OK, 이번 수정 범위 밖): `role="status"`→`<output>` 권고 2건(TabletKioskPage, TabletContentLibraryList), 중첩 template literal 1건(tablet-screen-set-editor), dialog 이벤트 핸들러 S6847 1건. 최신 push 뒤 원격 Sonar 재분석 결과로 다시 확인해야 한다.

### 검증

- 관련 tests: guidance-experience 22(기존 17 + 신규 5), display-media-pages 19(기존 13 + 신규 6) PASS. 수정 전 소스로 돌린 negative control에서 신규 7개가 실패해 회귀를 잡는 것을 확인했다. 같은 안내 재편집(위치 복귀 후)과 실패 뒤 재시도 2개는 탭 전환 시 manager가 다시 mount되어 수정 전에도 통과하며, 회귀 방지용으로 유지한다.
- Store 전체 48 files / 601 tests PASS. web-store `tsc -b`, tablet-kiosk-core `tsc --noEmit`, 변경 6파일 ESLint PASS. Store·KPA·Neture production build PASS(기존 chunk 크기 경고만).
- 합성 browser(Chromium 1440/390px, 실제 `StoreTabletDisplaysPage`·공용 제작기·`TabletKioskPage`, Store/Auth context만 stub, API는 매장별 route fixture): 38/38 PASS.
  - 제작 화면 작은 미리보기: 상세가 non-modal이며 미리보기 상자 안에 열리고, 포커스가 상세 안으로 간다. 상세를 연 채 바깥 '코너 제목' 입력을 편집할 수 있고, 미리보기가 갱신돼도 상세가 유지된다. Escape를 누르면 상세만 닫히고 편집기는 유지되며 포커스가 돌아온다. 닫기·배경 클릭으로 닫힌다. 바깥 버튼이 가려지지 않는다. QR 확대도 상자 안에 열리고 포커스가 복귀한다. 문서 가로 넘침이 없다. 변경이 있을 때 목록으로 가면 확인 질문이 나오고, 편집기를 닫으면 상세가 정리된다.
  - 반복 수정: 닫기 후 위치로 돌아가 같은 안내를 재편집, 다른 위치·다른 안내, 같은 안내·다른 위치, 콘텐츠 탭 재진입 시 다시 열리지 않음, 실패 뒤 재시도, 위치 상세 패널 버튼, 매장 전환 뒤 늦은 응답 무시와 새 매장 편집.
  - pageerror·외부 요청·네트워크 쓰기(미리보기 POST 제외) 각 0.
  - 처음 실행에서 실패한 3건은 모두 harness 문제였고 제품 코드는 바꾸지 않았다. 매장 정보 fixture 필드명(`storeSlug`), 모바일 미리보기 안 버튼의 스크롤, 변경 후 목록 이동 확인 질문 처리를 harness에서 바로잡아 재실행했다.
  - 이 browser 실행은 마지막 Sonar 보완(modal dialog의 Escape `onKeyDown` 추가) 전이다. 보완 뒤에는 Store 전체 tests·builds로 확인했다.
- 임시 harness는 commit 전에 삭제했다.

### 미실행

- 원래 42개 synthetic browser 시나리오: 그 harness가 이 PC에 없어 재실행하지 못했다.
- '태블릿 크게 보기' 전체 화면 overlay 안의 상세는 별도로 browser 확인하지 않았다.
- 실계정 로그인, 실제 tablet 기기, QR 인쇄·스캔, 운영 데이터 생성은 요청 범위 밖이다.
- 원격 CI·Sonar·Codex 재리뷰와 thread 처리는 통합 담당이 이어서 맡는다.
