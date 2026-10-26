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
