# 매장 상품 상담자료 작성 흐름 검증 V1

> 상태: COMPLETED (개발 검증·push 인계) · 작성일: 2026-10-26 (Asia/Seoul)
> [WO](../work-orders/WO-O4O-STORE-PRODUCT-CONSULTATION-AUTHORING-COMPLETION-V1.md) · [이용 안내](../guides/products/O4O-STORE-PRODUCT-CONSULTATION-AUTHORING-V1.md)

## 변경 결과

기존 상품 선택/안내 작성 진입을 유지하고 명시적 원문→상품 사실 근거 사용, 두 종류 근거의 출처/검수 입력, 목적/언어 선택, 기존 사용자 AI 요청문/결과 편집, 상품 연결 저장, 본문/맥락/실제 링크 재조회, 기존 상세 재편집을 연결했다. metadata 버전/형식/길이를 검사하며 미지원 자료는 기존 일반 편집 흐름을 유지한다. 기존 다국어 Picker의 기본 본문 추가와 다른 ProductDescriptionAssist 소비처의 비제어 기본값은 유지한다.

재조회 실패에도 생성 id를 반환해 같은 행을 재시도한다. 확인 실패는 성공 화면으로 이동하지 않고 경고와 입력을 유지한다. 다른 매장/화면으로 전환한 응답은 기존 session guard와 visible 검사로 적용/이동하지 않는다. 외부 결과는 기존 sanitizeRichHtml로 정제한다. 오래된 원문과 검수 표시는 저장 당시 맥락이며 최신 정본 검수/공식 승인 기록이 아니다.

## 검증 근거

| 항목 | 결과 |
|---|---|
| 의존성 준비 | frozen lockfile, offline, ignore-scripts 설치 성공. manifest/lockfile 변경 없음 |
| 패키지 | 정본 build:packages 성공 |
| 매장 전체 Vitest | 79파일 / 859개 PASS |
| 최종 보완 집중 Vitest | 6파일 / 51개 PASS (위 전체와 중복 합산하지 않음) |
| store-web TypeScript | PASS |
| 변경 소스/테스트/config ESLint | 오류·경고 0 |
| 매장 production Vite build | PASS, 기존 chunk/Browserslist 경고 유지 |
| 실제 앱 Chromium | desktop/mobile 2 PASS, 합성 인증·API·상품만 사용 |
| 정적 검사 | git diff --check, 변경 문서 민감정보 검사 PASS |

브라우저는 상품 연결 진입→원문 확인/명시적 사용→전문인 목적·영어·참고근거→실제 Prompt Builder→사용자 결과 HTML 적용→최초 저장→의도적 readback 503→같은 행 재저장→상세→새로고침→맥락 복원→수정 저장을 확인한다. 생성 1회/수정 2회, 상품/매장 헤더와 실제 link 조회, 예상 외 쓰기0·pageerror0·수평 overflow 없음 및 script/onclick 제거를 검증한다. 첫 브라우저 회차는 fixture placeholder 오기로 실패했으며 수정 후 PC/모바일 PASS. 초기 타입 검사 Object.hasOwn의 target lib 불일치도 호환 호출로 수정 후 PASS. 위 실패를 운영 오류로 보고하지 않는다.

## 변경 경계·인계

- 소스 변경은 services/web-store 내부. API·DB schema·migration·packages·공통 권한·메뉴·MCP/OAuth·서버 AI·worker 변경0.
- 운영 계정/DB/상품 원본/외부 AI 호출·연결 변경0. 브라우저 저장은 route mock의 메모리에만 존재한다. 운영 검증이 아니다.
- ChatGPT 직접 연결/권한/도구 연동은 다른 담당자 작업이다. 이 기능은 기존 복사·붙여넣기 경로를 완성한다.
- 기존 서버의 원자적 revision 충돌 방지나 생성 응답 유실에 대한 서버 멱등성을 새로 제공하지 않는다. readback 실패 뒤 id를 받은 경우의 중복 재생성을 방지한다.
- 기존 공유/채널에 연결된 자료를 수정하는 경우 기존 활용 정책을 따른다. QR 생성·게시·공식 DB 채택은 실행하지 않는다.
- 기존 관리자 상품 정비 배포 기록을 바꾸지 않고 별도 매장 작성 안내로 기록했다. 문서 정합: 해당 새 흐름의 guide·WO·CHECK 연결 완료.
- main 통합·PR CI·운영 배포는 미실행. branch와 최종 SHA는 완료 인계를 따른다. worktree KEEP(미병합). push 전 main은 `7e9c1c99d6`으로 이동했으며 이번 web-store 변경 경로와 겹치지 않는다. 무관한 운영 정리 변경을 이 개발 branch로 병합하지 않았다.

## 후속 지시의 남은 구현 완료 — 2026-10-26

사용자의 “남은 것이 있으면 모두 구현” 지시에 따라 같은 미병합 branch에서 추가 완료했다. 위 최초 push의 API 변경0·서버 멱등/원자적 revision 미제공 표기는 당시 기록이다. 아래가 최종 구현 상태다.

- 서버: 기존 direct 저장 API의 상담자료에 clientContentId·expectedRevision 선택 계약을 추가했다. 기존 UUID/JSON/source_metadata/상품 연결 원장을 사용하며 schema/migration은0이다. 서버가 근거/목적/언어/길이를 검증·HTML 정제하고 현재 매장의 활성 상품과 실제 링크를 확인한다.
- 생성: 안정적인 UUID와 DB advisory/row lock, 생성 fingerprint·작성자 조건으로 응답 유실·동시 재시도를 같은 행으로 처리한다. 본문과 상품 링크가 같은 transaction에서 commit/rollback한다.
- 수정: 서버 revision이 일치할 때만 저장한다. 충돌 시 입력을 유지하고 최신 본문·목적·언어·근거를 비교한 후 사용자가 확인해야 다시 저장한다. 그 사이의 추가 수정도 다시 차단한다. 맥락 없는 일반 수정이나 전환과 경합한 과거 일반 편집으로 새 맥락을 덮어쓰지 않는다. 기존 일반 자료 저장도 조건부 transaction으로 링크와 함께 처리한다.
- 화면: 응답 유실은 고정 UUID로 재조회/재시도하고 태그까지 확인한다. 실제 상품 연결 변경은 덮어쓰기 가능한 revision 충돌과 구분해 상품에서 다시 열도록 안내한다. 상품에서 기존 연결 direct 자료 수정을 선택하면 원래 행에서 목적·언어·근거 맥락을 추가한다.

| 최종 검증 | 결과 |
|---|---|
| 실제 PostgreSQL + 기존 선택 매장/권한 API | 2 suites / 28 PASS. 신규 DB 8개 + 기존20개 |
| 전체 매장 Vitest | 79파일 / 862 PASS |
| 마지막 편집/adapter 집중 재확인 | 2파일 / 41 PASS, 위 전체와 중복 합산하지 않음 |
| API·매장 타입 | PASS |
| API 모든 tsup entry·매장 production build | PASS |
| 변경 코드 ESLint | 오류·경고0 |
| 실제 앱 Chromium | desktop/mobile 2 PASS |

DB 검증은 12개 동시 생성의 자료1/링크1, 두 수정 중 하나만 성공, 링크 실패 시 본문 rollback, 타 매장·잘못된 상품/활성 상태·잘못된 입력 차단, 서버 HTML 정제, 실제 링크 회수, 기존 자료 전환·일반 편집 경합, 안전한 이미지/빈 본문을 검증했다. localhost:55440의 이번 전용 consultation_review DB만 사용했고 임시 schema0 확인 후 전용 컨테이너를 종료했다.

브라우저는 생성 응답 abort + 첫 재조회503 → 같은 UUID 재생성 확인(자료1) → 재편집 충돌409 → 최신 저장본 비교/명시적 확인 → 재저장 → 기존 연결 자료의 원래 행 전환까지 실제 앱에서 검증했다. 합성 인증·메모리 API만 사용했다. 실제 ChatGPT/실계정/운영 DB·상품·기준은 건드리지 않았다. 최종 pageerror0·예상 밖 쓰기0이며 외부 결과 script/onclick 제거와 PC/모바일 overflow도 확인했다.

API/Core 인증·MCP/OAuth·서버 AI 정책·관리자 상품 정비·정기 worker·외부 연결 설정·공개/QR은 수정하지 않았다. 이 작성 흐름의 추가 구현 잔여는 없으며 운영 적용·외부 직접 연결은 별도 담당/범위다. PR CI·main 병합·배포는 미실행이다. 일반 저장과 새 상담자료 계약의 consumer 차이는 이용 안내에 기록했다.

문서 정합: guide의 응답 유실·서버 충돌 한계를 실제 완성된 계약으로 갱신하고 최초 CHECK 기록은 위에 보존했다. 동일 WO의 후속 완료이므로 기존 branch를 유지했다.

## PR #830 병합 전 리뷰 보완

사용자의 main 병합·배포 지시에 따라 최신 main을 정상 merge하고 PR #830을 생성했다. 최초 HEAD e111793의 CI Gate·API Jest 3분할·권한 guard·CodeQL·관리자/웹 production build는 성공했다. Sonar 신뢰성 등급 D와 신규21건 지적 및 Codex P2 임베드 보존 지적은 병합 전에 해결한다.

편집기의 sanitizeRichHtml 정책과 같은 YouTube/Vimeo iframe·미디어 속성을 새 서버 rich sanitizer에 적용했다. 기존 기본 sanitizeDescriptionHtml의 다른 소비처는 변경하지 않았다. 임의 iframe 호스트·이벤트·script는 계속 차단한다. 원문과 달라져 무한 수정 충돌이 나던 허용 동영상과 구조-only 본문을 보존하며, 본문 존재 판정은 파서 기반으로 정비했다.

Sonar 지적의 중복 import·props readonly·접근성 output/label·중첩 ternary·고정 locale 비교 정렬·객체 검사·async·복잡도·불필요 fallback을 동작 보존 정비했다. 규칙·baseline·workflow·제외 목록은 완화하지 않았다.

리뷰 수정 로컬 검증: 실제 PostgreSQL9개+기존 권한20개=29 PASS, 전체 매장79파일/862 PASS, PC/모바일2 PASS, API/매장 타입·변경 lint·API 모든 bundle PASS. 컨테이너의 임시 schema0 확인 후 정리했다. 공식 최신 PR CI·Sonar·Codex 결과와 최종 배포 사실은 PR 최신 상태에 기록하며, 이 문서는 성공하지 않은 원격 검사를 성공으로 간주하지 않는다.

후속 Codex 재검토는 HTML 탭의 작은따옴표 등 원문 직렬화 차이가 실제 저장 성공을 충돌로 오인하는 사례를 지적했다. 상담자료의 전송과 재조회 비교 모두 기존 sanitizeRichHtml 정책으로 정규화했다. 본문 실질 변경·실제 revision 충돌 검사는 유지한다. 실제 HTML 탭 입력→저장 완료를 PC/모바일 시나리오에 추가했다. 이 수정의 로컬 전체 매장79파일/863개·집중42개(중복)·PC/모바일2개·매장 타입/lint/build가 PASS이며 API 코드는 직전29개 검증 이후 변경하지 않았다. 최신 공식 검사는 새 push HEAD에서 다시 확인한다.

HTML 정규화 HEAD의 Codex는 지적 없음으로 완료됐다. Sonar의 기존21건은 해소됐지만 iframe ADD_TAGS 포괄 허용에 대한 보안 지적1건이 추가되어, 해당 설정을 제거했다. 서버는 허용 호스트를 먼저 검증하고 호출별 임의 marker의 비활성 proxy에서 모든 속성을 기본 DOMPurify로 정제한 뒤 검증된 iframe만 복원한다. 위조 marker·임의 호스트·srcdoc·onload 차단과 허용 iframe 속성 직렬화 일치를 실제 DB 회귀에 포함했다. 추가 보완의 관련29개·API 타입/lint/build PASS, schema0 확인 후 전용 테스트 컨테이너 정리. 규칙 예외나 보안 gate 완화는 하지 않았다.
