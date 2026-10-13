# CHECK-O4O-STORE-WORKSPACE-WEB-PLAN-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (한국시간)
> **근거 WO**: [WO-O4O-STORE-WORKSPACE-WEB-PLAN-V1](../work-orders/WO-O4O-STORE-WORKSPACE-WEB-PLAN-V1.md)
> **검토안**: [DESIGN-O4O-STORE-WORKSPACE-WEB-V1](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md)

## 대상

조사 기준 main: `b3f792578a497c0509ab844d0096d543709fee49`.
독립 [화면 초안](../../services/web-store/prototypes/store-workspace/README.md)을 Chromium에서 검증했다.
production 앱·계정·기기·DB 검증이 아니라 합성 자료와 메모리 상태로 실행한 기획 시연이다.

## 실행 결과

| 검증 | 결과 |
|---|---|
| Chromium, Node 22.18.0, 화면 폭 1280·800·375·320 | 328개 assertion PASS |
| 네 상단 메뉴와 하위 업무 이동 | PASS |
| 메뉴별 AI 도움 자리와 업무 문맥, Escape로 대화창 닫기 | PASS |
| 예시 원본 가져오기 → 소유 사본 선택 → 제작 문맥 | PASS |
| QR·사이니지·태블릿·POP 형태 선택 → 편집 → 미리보기 | PASS |
| 언어 표시 변경, 본문 `<예시> & 문구`의 문자 표시 | PASS — 번역 실행 없음 |
| 저장 전 적용 이동 차단, 수정 후 재저장 요구 | PASS |
| 저장한 결과물 → 사용 위치 선택 → 예시 적용 확인 | PASS |
| 위치 미선택 차단, 활용 현황 → 편집 문맥 유지 | PASS |
| 상품에서 안내 제작 진입, 공백 제목·본문 저장 차단 | PASS |
| 검색 결과 없음, 향후 상담의 비활성 표시 | PASS |
| 네 화면 폭에서 문서 가로 넘침 | 없음 |
| JavaScript pageerror·외부 네트워크 요청 | 0건 |
| localStorage 사용 없음, 새로고침 후 초기화 | PASS |
| PC·모바일 제작 화면 캡처 시각 확인 | PASS — PC 두 열, 모바일 한 열 및 네 메뉴 2×2 |

자동 검증 첫 실행은 숨겨진 AI dialog의 문맥과 본문 문맥에 같은 CSS class가 있어
검증 스크립트의 locator strict 오류로 종료됐다. 본문 locator를 `main`으로 한정한 뒤
전체 검증을 다시 실행해 위 결과를 얻었다. 오류 실행을 PASS로 집계하지 않았다.

검증 스크립트·로그·캡처는 현재 작업환경의 `/tmp/store-workspace-web-plan-browser.mjs`,
`/tmp/store-workspace-web-plan-browser.log`, `/tmp/store-workspace-<폭>-home.png`,
`/tmp/store-workspace-<폭>-make.png`에 있다. Git으로 보관하는 산출물이 아니며 새 환경 복원을 보장하지 않는다.

## 정적·문서 검증

- `node --check services/web-store/prototypes/store-workspace/workspace.js`: PASS.
- 새 문서의 상대 링크 대상 존재, DRAFT/COMPLETED 헤더·작성일·최종 갱신을 확인했다.
- 지정 산출물 5개 파일의 문서 민감정보 검사: 0건. 상대 링크 대상 13개 및 문서 헤더 4개: PASS. staged scope·공백 검사: PASS.
- runtime src·공통 패키지·API·dependency·lockfile·CI 변경 없음.
- 독립 HTML·CSS·JavaScript 초안이므로 production 앱 build나 실제 업무 API 테스트를 완료했다고 주장하지 않는다.

## 종료 범위

사용자 지시: **push까지만, merge 금지**.
작업 브랜치: `wo/store-workspace-web-plan`.
main merge·production 배포·실계정·실기기·외부 AI 호출: 미실행.
DEPLOYMENT = NOT_APPLICABLE — 초안과 기획 문서만 추가하며 runtime 연결이 없다.

## 다음 개발에 남긴 것

기획안 검토 후 실제 메뉴·폼·미리보기·출력·배치 구조를 변경한다.
그때 shared 모듈 모든 소비처, service scope·직원 권한, 기존 URL·인쇄 QR,
자료 원장·독립 사본, 매체별 게시 반영 시점과 실패 처리를 다시 검증한다.
O4O 공통 AI 구조·제공 업체·비용 정책은 별도 담당과 맞춘다.

문서 정합: 기존 정본을 변경하지 않고 조사 결과를 기획 DRAFT와 WO에 연결했다.
