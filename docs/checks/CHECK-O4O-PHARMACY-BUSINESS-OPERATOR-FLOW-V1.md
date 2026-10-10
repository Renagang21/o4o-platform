# 약국 협력사업 운영 흐름 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **범위**: 로컬 구현·검증 완료. 실제 계정·운영 smoke는 미확인.
> **작업**: [WO](../work-orders/WO-O4O-PHARMACY-BUSINESS-OPERATOR-FLOW-V1.md)

## 변경

사용자가 확정한 현행 권한을 유지했다. 공유 관리 화면·콘텐츠 폼의 사용자 용어를 약국 협력사업으로 정리하고 담당 사업 화면에 참여자 게시판 링크를 제공한다. 사업 공간에서는 서버가 `canManage`를 인정한 담당 운영자에게 게시판 운영·사업 자료 관리 링크를 제공한다. 사업 게시글은 기존 pin API로 공지 고정·해제하며 성공 후 재조회, 실패 시 오류 표시를 재사용한다. 일반 참여자에게 고정 버튼을 제공하지 않는다.

기존 Neture 호스트 경계가 `/operator/semi-franchises`를 약국 서비스로 넘기는 동작은 유지한다. 약국 서비스 링크는 `/community`, 공유 화면의 기본 링크는 사업 community key(없으면 `business:<key>`)로 연결한다. 원장·가입·공통 계정·DB·역할·API·공급·주문·결제는 변경하지 않는다. 정책은 [서비스 발견·용어](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md), [약국 사업 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)를 따른다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| `pnpm run build:packages` | PASS |
| `pnpm exec vitest run --config services/web-kpa-society/vitest.config.mjs services/web-kpa-society/src/pages/business/__tests__` | 4파일·41테스트 PASS |
| `pnpm exec vitest run --config services/web-neture/vitest.config.mjs services/web-neture/src/pages/operator/__tests__/OperatorBusinessFlow.test.tsx` | 2테스트 PASS |
| `pnpm --filter @o4o/web-neture run build` | TypeScript·Vite PASS |
| `pnpm --filter @o4o/web-kpa-society run build` | TypeScript·Vite PASS |
| `pnpm run check:unsafe-routes` | 1,149파일·위반 0 |
| literal 소비처 조사 | 화면명·기존 경로·문구 등 검색, 살아있는 소비처 85건 검토 |
| Playwright Chromium, 약국 운영 화면, mock API | 1440×900·390×900 제목·담당 게시판 href 확인, pageerror 0 |
| `git diff --check` | PASS |

공지 테스트는 고정·해제 각각의 사업별 URL/body, 재조회 결과, 일반 참여자(작성자 포함)의 버튼 비노출을 확인했다. 사업 운영 메뉴는 서버의 담당 판정을 사용한다. 공유 화면 테스트는 Neture 기본 주소와 약국 서비스 주소 및 고정 사업 필터를 확인했다.

최초 Neture mock 브라우저 실행은 기존 호스트 handoff API를 모사하지 않아 로그인 전달 안내에서 멈췄다. 실제 소유 경로인 약국 서비스로 재실행하여 위 두 viewport를 통과했다. 첫 테스트 fixture의 댓글 응답 모양·중복 링크 선택을 수정한 뒤 테스트를 통과했다. literal 검사 첫 실행은 필수 검색 인자가 없어 사용법 오류가 났고 인자를 지정해 재실행했다. 빌드의 큰 chunk·Browserslist 경고는 이번 변경의 실패가 아니다.

## 직접 테스트할 항목

실계정 로그인 세션이 없어 아래는 운영 환경에서 수행하지 않았다. mock PASS를 운영 권한·데이터 검증 PASS로 보지 않는다.

- 담당 운영자로 로그인해 약국 협력사업 운영 화면 → 참여자 게시판 → 게시판 운영·사업 자료 관리 이동을 확인한다.
- 안내 글을 공지로 고정하고 목록·상세에서 공지 표시를 확인한다. 다른 글을 고정하면 기존 공지가 해제되는지 확인하고 마지막에 원래 상태로 복구한다.
- 공지 해제, 실패 응답 시 오류 표시, 자료의 초안·게시·보관 및 참여 약국의 열람을 확인한다.
- 일반 참여자에게 운영 메뉴·공지 변경 버튼이 보이지 않고 직접 관리 API 호출도 차단되는지 확인한다.
- 담당하지 않은 다른 사업의 회원·게시판·자료 접근이 차단되는지 확인한다.
- 담당 해제 후 새 진입·기존 로그인 상태의 서버 접근 차단을 확인한다.

운영 데이터 write, 병합, 배포는 수행하지 않았다. 문서 정합: 표준 용어와 현행 권한을 유지하며 WO·검증 기록에 조사와 미확인 범위를 반영했다.
