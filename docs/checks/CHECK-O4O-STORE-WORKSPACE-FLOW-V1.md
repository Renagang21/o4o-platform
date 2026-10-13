# CHECK-O4O-STORE-WORKSPACE-FLOW-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (한국시간)
> **근거 WO**: [WO-O4O-STORE-WORKSPACE-FLOW-V1](../work-orders/WO-O4O-STORE-WORKSPACE-FLOW-V1.md)
> **기획**: [DESIGN-O4O-STORE-WORKSPACE-WEB-V1](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md)

## 대상과 종료 범위

최신 main `e4c48811b`에서 독립 개발 브랜치 `wo/store-workspace-flow`를 만들고,
자기 기획 브랜치의 커밋을 정상 통합한 후 실제 web-store 화면을 수정했다.
사용자 지시대로 **push까지만** 진행하며 main merge·production 배포는 하지 않는다.

## 로컬 검증

| 검증 | 결과 |
|---|---|
| Node 22.18.0·pnpm 10.25.0, frozen-lockfile 설치 | PASS — dependency·lockfile 변경 없음 |
| `pnpm --filter store-web test` | 10 files, 73 tests PASS |
| `pnpm --filter store-web type-check` | PASS |
| `pnpm --filter store-web build` | PASS — 기존 큰 chunk 경고 존재 |
| `node scripts/lint-ratchet.mjs` | PASS — 46 errors / baseline 46, 1009 warnings. 기존 오류 기준을 바꾸지 않음 |
| 변경 TS/TSX focused ESLint | 0 errors, 기존 태블릿 callback 의존성·unused directive warnings 3 |
| 새 문서 상대 링크·헤더·민감정보 | 링크 대상 10개·헤더 3개 PASS, 민감정보 0건 |
| staged scope·공백 | 26개 명시 경로 및 공백 검사 PASS |

추가 테스트는 메뉴에서 실기능 누락 방지, 상위 필터 존중, 서비스 scope,
제작/활용 이동 및 공통→서비스 지정 redirect의 state·query·hash 보존,
QR 콘텐츠 연결 유형 잠금·동영상 처리 분리, 태블릿 미리보기 전환·Escape 종료를 검증한다.

구현 중 추출된 props·테스트 fixture·테스트 import의 TypeScript 조립 오류를 수정하고 재검증했다.
그 실패 실행을 PASS로 집계하지 않는다. dependencies·lint 규칙·오류 baseline은 바꾸지 않았다.

## 실제 빌드 번들 브라우저 검증

Chromium에서 **actual built web-store**를 로컬 preview로 실행하고 API 요청만 합성 fixture로 대체했다.
독립 HTML 초안의 검증과 구분한다.

- 화면 폭 1280·375·320 × 경영자/승인 직원: **258 assertions PASS**.
- 공통·서비스 지정 업무 진입의 상단 4개 메뉴와 활성 영역, 가로 넘침 없음.
- 직원 구성원 관리 메뉴 없음 및 경영자 전용 직접 URL 차단 유지.
- 저장된 direct 콘텐츠 → QR 생성 → 기존 payload(`landingType=page`, 원본 식별자) 및 선택 매장 header 보존.
- 공개 QR origin은 매장 작업 호스트가 아니라 공개 서비스 호스트.
- 서비스 지정 QR 생성 → 배치·출력 진입, 제작/활용 query 이동.
- QR 조회 실패 → 재시도 → 회복.
- 태블릿 제작/활용 및 내부 탭과 상단 업무 영역 동기화, 사이니지 제작/스케줄, 제공 QR 자료 탐색, 사업별 외부 판매 설정 진입.
- 최종 전체 실행 JavaScript pageerror 0건.
- PC·모바일 QR 화면 캡처를 직접 확인했다. 모바일 상단 업무 메뉴는 2×2, 하위 메뉴는 줄바꿈한다.

초기 자동 검증에서 실제 버튼 이름과 두 API의 배열/객체 fixture 계약이 맞지 않아 실패했다.
코드의 기존 API 계약을 확인해 fixture·locator를 수정한 후 전체를 다시 실행했다.
잘못된 fixture에서 발생한 오류를 실제 production 장애나 제품 수정 근거로 처리하지 않았다.

현재 환경의 `/tmp/store-workspace-flow-browser.mjs`, `...-browser.log`,
`/tmp/store-workspace-flow-<폭>-<역할>-qr.png`에 검증 도구·결과·캡처가 있다.
이 파일들은 Git 추적 산출물이 아니며 새 환경 복원을 보장하지 않는다.

## 실측하지 않은 범위

- 실제 계정 로그인·운영 DB 저장·게시·QR 출력·사이니지 재생·태블릿 적용: 미실행.
- 실제 공유 운영 데이터·외부 AI·비용·WIF/IAM 설정: 변경 없음.
- 공통 Core·백엔드·API·schema·권한 계약·CI 변경 없음.
- 대형 화면의 모든 세부 폼 분리: 완료 아님. 해당 묶음에 필요한 UI 책임을 추출했다.
- GitHub PR CI 및 main 배포 검증: 미실행. 사용자 지시가 push까지만이므로 PR merge·Delivery를 실행하지 않는다.

DEPLOYMENT = REQUIRED after main integration. 이번 종료 상태는 미배포다.
문서 정합: 기획 DRAFT와 실제 개발 브랜치 상태, 합성 브라우저 결과와 실계정·운영 결과를 구분했다.
