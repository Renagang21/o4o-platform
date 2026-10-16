# CHECK-O4O-STORE-GUIDANCE-COMPLETION-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-16
> **범위**: 안내 제작·수정·활용의 후속 정비와 기존 공통 AI 질의 연결의 로컬 검증
> **근거 WO**: [WO-O4O-STORE-GUIDANCE-COMPLETION-V1](../work-orders/WO-O4O-STORE-GUIDANCE-COMPLETION-V1.md)

## 1. 기준·의존성

최신 main `a4063be499236ae468b20f3790c8968c4f73dd11`에서 전용 worktree `/workspace/o4o-wt/store-guidance-completion`,
branch `wo/store-guidance-completion`을 생성했다. main 미반영 선행 작업 `e81a71cc0107f6eac071d71d221dc8312c51c1f0`을
이 새 branch에 merge해 의존성을 포함했다. 이전 worktree·main checkout은 수정하지 않았다.
후속 검토 중 main은 `7cbfdeeb3`(테스트 계정 출처 정비)을 거쳐 push 전 `9a86fcf0f`(약국 운영자 업무 정비)로 이동했다.
main 차이는 지침·계정 문서·My Home 정본·운영자 화면/회귀 등이며 이번 Store·공용 태블릿 구현 경로와 겹치지 않는다.
자동 merge/rebase는 하지 않았다. 통합 담당은 이동한 main과 결합할 때 KPA/Neture 소비처를 함께 확인한다.
최신 계정 정본 경로는 `docs/local/TEST-ACCOUNTS.local.md`이며 폐기된 계정·과거 원본·환경 변수의 유효성을 추정하지 않는다.
실제 로그인은 실행하지 않았다.

## 2. 반영과 소비처

| 소비처 | 반영·검증 경계 |
|---|---|
| Store `/store/*`, `/work/kpa-society/store/*` | 빠른 안내 제작·기존 제작 대상 복귀·사본 수정·미리보기·게시·일정·재생의 연결. 두 mount의 PC/모바일 browser |
| Store 서비스 업무 `ServiceWorkLayout` | 같은 local workspace shell 사용. 서비스 지정 base가 공통 서비스 문맥보다 우선하는 AI 요청, 기존 capability 필터를 통과한 링크만 노출 |
| Store AI | 기존 인증·captured store header·query API·quota 사용. 입력과 최근 대화만 전송. 페이지 DOM·KPI·비공개 상품/주문을 자동 수집하지 않음. 안전한 텍스트 표시와 수동 복사/기존 화면 진입 |
| 사이니지 저장·일정 | `store_playlists`/snapshot과 `signage_playlists`/media 분리. 방송 일정 수정은 `playlistId`, 매장 일정은 `storePlaylistId`. 새 schema·dual-write·별도 엔진 없음 |
| 기존 `/store/marketing/signage/play/:playlistId` | 매장 선택 ID와 같은 existing public playback reader 연결. 게시·활성·필수 자료 필터는 서버 유지. 404만 방송 reader fallback, 401/403/장애 fallback 금지. 선택·매장 전환 뒤 늦은 화면 반영 차단 |
| 공용 태블릿 제작기·뷰어의 Store/KPA/운영자/Neture 공급자 | 선행 변경 포함. 이번 후속은 공용 export·props·API를 변경하지 않음. 실제 세 역할 제작 컴포넌트·고객 화면 회귀와 세 앱 build |
| My Home·admin·operator·forum·퇴역 서비스 | 새 AI UI/권한/메뉴를 추가하지 않음. 동명의 shared-space shell과 Store local shell을 구분해 조사. 퇴역 앱·내부 제작형 AI 경로 복구 없음 |

## 3. 자동 검사

Node `22.18.0`, pnpm `10.25.0`, `/workspace/.o4o-cloud/activate.sh` 사용.

| 검사 | 결과 |
|---|---|
| 설치 | PASS — `pnpm install --frozen-lockfile --verify-store-integrity=true --store-dir /workspace/.pnpm-store` |
| 공용 패키지 | PASS — `pnpm run build:packages` |
| Store 전체 | PASS — 52 files / 617 tests. `pnpm exec vitest run --config services/web-store/vitest.config.mjs --maxWorkers=2`. 최종 guard 위치 수정 후 관련 3 files / 26 tests도 PASS |
| 계약 검사 | PASS — API Jest 8 suites / 194 tests. 선행 5 계약 + signage forced-content surface read + service AI query HTTP + service AI extensions |
| Store/KPA/Neture build | PASS — `pnpm --filter store-web build`, `pnpm --filter @o4o/web-kpa-society build`, `pnpm --filter @o4o/web-neture build` |
| 집중 ESLint | PASS — 변경 TS/TSX 19개, 오류·경고 0. 최종 fixture/guard 변경 파일도 재검사 PASS |
| 문서·diff | PASS — `node scripts/check-doc-sensitive.mjs` 4028개, 상대 링크 24개, `git diff --check` |

신규 검사는 공통 AI의 명시 요청·화면 문맥·대화/입력 보존·중복 요청·한도·scope 격리·빈 응답·유료 호출 timeout,
사이니지 같은 ID/확인된 성공 자료 재사용·불명확한 결과 재전송 차단·저장 잠금·snapshot 미리보기,
게시 reader/legacy fallback·접근 실패·지연 응답·일정의 원장 보존을 검사한다.
빌드가 테스트 fixture의 불완전한 type assertion과 보호 자료 guard의 잘못된 대상 위치를 검출했다.
실제 계약 필드를 갖춘 fixture와 올바른 사본 편집 guard로 고친 후 관련 테스트·빌드·집중 린트를 재실행해 통과했다.
기존 Vite chunk 크기·Browserslist 안내와 Jest force-exit 안내는 설정/의존성 변경 없이 기록한다.

## 4. 합성 API 브라우저

실제 production 컴포넌트·편집기·뷰어·API client를 별도 Vite harness에서 실행한다.
인증·선택 매장과 응답 API만 합성이다. Chromium, desktop 1440×1000 / mobile 390×844.
예상하지 않은 API·외부 요청과 pageerror·가로 넘침을 확인한다. 영상 프레임은 외부 요청 없이 합성 응답으로 표시한다.

- 선행 회귀: 고객 3 배치·QR 휴대전화 링크·언어·본문/상세·태블릿 저장/재시도/적용·세 역할 제작기·보관 상태·일정 입력.
- 신규 흐름: 자료 선택·영상 확인·같은 초안에 재시도 → 저장 사본 미리보기/수정 → 게시 → 선택 유지한 일정 실패/재시도 → 현재 안내 수정 → 게시된 매장 자료 재생.
- 신규 AI: 한도 거부와 입력 보존 → 명시 재시도 → 메뉴 이동 중 대화/입력 유지 → 다음 요청의 현재 화면·직전 대화 → 매장 전환 후 늦은 답변 비노출.
- **최종 PASS 74개**: 선행 42개 + 신규 32개(8개 흐름 × 두 mount × 두 viewport). 각 runner exit 0과 현재 결과 JSON의 failure=null을 확인했다. pageerror·예상 밖 API/외부 요청·검사한 가로 넘침은 0건이다.
- 모바일 미리보기 중에도 빠른 제작의 저장/닫기 버튼이 화면에 보임을 bounding box로 확인하고 스크린샷을 검토했다. 안내 선택 후 다른 목록은 접어 두며 실제 후속 동작이 없는 일괄 선택 UI와 상태를 제거했다. 보호/잠금/보관/만료 자료는 빠른 제작에서 제외하고 보호 상태 변경 후 쓰기도 거부한다.
- 초회 cold compilation timeout·selector 수정·실행 중 HMR에 따른 중단은 최종 PASS로 세지 않았다. 수정 후 전체 42개와 신규 32개를 각각 다시 실행했고, 최종 guard 수정 뒤 신규 32개도 재실행했다.
- harness·scripts·JSON·스크린샷: `/workspace/.o4o-completion-browser`. 검사 로그: `/tmp/o4o-completion-*.log`. 저장소에는 합성 결과 요약만 둔다.

## 5. 현장 확인표 — 미실행

아래는 사용자 별도 지시와 해당 환경·기기가 필요하다. 합성 PASS로 완료 처리하지 않는다.

| 현장 흐름 | 확인할 결과 | 현재 상태 |
|---|---|---|
| 직원 초대 → 수락 → 최종 승인 → 접근 해제 | 승인 전/후 업무 접근, 해제 후 접근 차단. 로그인·역할 결과는 현행 로컬 계정 정본에만 기록 | 미실행 |
| 경영자·직원 업무와 매장 전환 | 각 매장 자료·상품·주문 격리, A→B→A 지연 응답·저장 대상 일치 | 실계정 미실행, 합성 회귀만 수행 |
| QR 출력 → 실제 인쇄물 스캔 → 연결 자료 수정 → 재스캔 | 같은 URL의 기존 인쇄물 유지, 실제 휴대전화의 고객 제목·본문·언어·링크 | 미실행 |
| 태블릿 연결 → 위치 적용 → 안내 수정 → 다시 열기 | 올바른 위치·안내·상품·언어, 터치와 실제 기기 idle/영상 정책 | 미실행 |
| 사이니지 게시 → 일정/수동 재생 → 사본 수정 → 다시 열기 | 실제 화면의 영상·순서·필수 자료·시간·네트워크와 자동 재생 제한 | 미실행 |
| 실제 공통 AI 요청·비용/한도 | 허용 자료·provider 설정·quota 차감·오류/유료 호출 이력. 자동 게시가 실행되지 않음 | 외부 provider 미호출 |

실계정·운영 업무 데이터·실제 기기·외부 유료 AI를 사용하지 않았으며 자격정보 값을 출력하지 않았다.
공유 Experience/개인화·새 Task/Memory 저장소·게시/주문/적용 도구는 이 UI가 제공하지 않는다.
이는 공통 기반의 별도 계약 경계이며 가상의 완료 기록이나 학습 통계를 만들지 않았다.

## 6. Git 인계·문서 정합

개발 종료점은 commit·push다. PR·PR CI·main 병합·배포는 실행하지 않는다.
선행 변경을 포함한 branch 전체를 통합 담당에게 인계하며 중복 적용하지 않도록 commit 관계를 함께 제공한다.
최종 SHA·원격 일치·worktree 상태는 완료 보고에서 확정한다. `WORKTREE_DISPOSITION = KEEP`(미통합 branch 보존).

새 WO·이 CHECK·현재 설계의 승인 반영 절을 맞췄다. 과거 CHECK·정본 색인의 상태를 소급 변경하지 않는다.
