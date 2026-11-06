# O4O 표준 목록 업무 화면 계약 검증

> 상태: 개발 검증 · PR 인계 (main 병합 · 배포 미수행)
> 작성일: 2026-11-06
> 작업 branch: `wo/standard-list-workspace-contract`
> 개발 기준: `dd83d30d29` 이후 `origin/main` 반영
> 근거: [TODO](../work-orders/TODO-O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md), [화면 계약 정본](../architecture/O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md)

## 판정 요약

| 영역 | 판정 |
|---|---|
| Core 계약(`ListWorkspace` · `useListSelection` · `ActionBar`) | PASS |
| 사이니지 동영상 · 재생목록 · 디스플레이 재생 | PASS (모의 API 브라우저 검증) |
| 기존 비준수 화면 20개 전환 | 타입검사 · 테스트 PASS. **배치 전환이며 `ListWorkspace` 직접 채택은 사이니지뿐** |
| 재생목록 재생시간 집계 SQL | **실행 미검증** (아래 미해결 1) |
| 운영 환경 smoke | **미수행** (미배포 코드 · 운영 데이터 변경 금지) |

## 자동 검증

Node 22.23.4 / pnpm 10.25.0 기준.

| 대상 | 타입검사 | 테스트 |
|---|---|---|
| `services/web-store` | `tsc -b` 통과 | 전체 98파일 970 PASS (최종 문구 반영 후 재실행) |
| `services/web-neture` | 통과 | 180파일 1530 PASS |
| `services/web-pharmacy-coop` | 통과 | 11파일 89 PASS |
| `apps/admin-dashboard` | 통과 | 관련 23파일 130 PASS, operator-role-catalog 15 PASS (전체 실행 아님) |
| `apps/api-server` | 통과 | `store-playlist-media-boundary` 9 PASS (전체 실행 아님) |
| `packages/operator-core-ui` | 변경 파일 오류 0 | 35파일 238 PASS |
| `packages/store-ui-core` | 변경 파일 신규 오류 0 | 10파일 156 PASS |
| `packages/shared-space-ui` | 변경 파일 오류 0 | 24파일 222 PASS |
| `packages/ui` | build 통과 | 4파일 45 PASS |

- `services/web-store` `vite build` 통과 (최종 문구 반영 후 재실행).
- 패키지 단독 `tsc --noEmit`(operator-core-ui · store-ui-core · shared-space-ui)은 이 변경과 무관한 기존 오류가 많아 변경 파일 기준으로 판정했다. `store-ui-core` 의 `VideoRegistration.tsx:4` TS6059(`tablet-kiosk-core` rootDir)는 `7f1ee655f5c`(2026-11-01)에서 들어온 기존 import 줄의 오류이며, 이번 변경으로 고치지 않았다.

## 브라우저 검증

**실서버가 아니라 로컬 web-store + Playwright 응답 가로채기(모의 API)다.** PC 1280 · mobile 390. 운영 API · 데이터에는 접근하지 않았다. 재생 검증은 브라우저에서 녹화한 실제 webm 을 사용했다.

| 시나리오 | 결과 |
|---|---|
| 동영상: 등록 버튼 위치, 제목→필터→표, 체크→ActionBar, 검색 변경 시 선택 정리, 무결과에 중앙 버튼 없음 | PASS |
| 동영상 등록: `O4O 영상 등록 / 외부 영상 연결`, 직접 URL | PASS |
| 재생목록: 만들기 버튼 위치, '상세 관리' · '저장한 재생목록 선택' 제거, 동영상 수 · 총 재생시간 | PASS |
| 재생목록: 이름 클릭→상세, 체크→수정→상세, 없는 ID 직접 URL | PASS |
| 재생목록 삭제: 서버 실패 시 항목 유지 → 재시도 → 서버 결과로 갱신 | PASS |
| 빈 목록: 상단 · 중앙 같은 버튼 | PASS |
| 지속 403(재생목록 목록 · 상세 항목 · 동영상): 빈 목록 위장 없이 오류 + 다시 시도, 복구 후 재조회 | PASS |
| 폐기 경로 `/schedules` → 디스플레이 재생, 매장 일정 표기 없음 | PASS |
| 디스플레이: 선택→재생 시작→`/play/:id`, 두 탭 서로 다른 재생목록 유지 | PASS |
| 재생: 버튼 제스처 전체화면 진입, 음소거 자동재생, `a>b>a` 순서 반복 | PASS (headless Chromium) |
| 재생: 실패 영상 건너뛰기, 전체 실패 안내, 다시 재생 복구 | PASS |
| 다른 소비처 `commerce/local-products` · `library/contents` | 렌더 · 머리 버튼 · 가로 넘침 PASS. 표 행 동작은 미확인(아래 미해결 3) |

첫 실행의 FAIL 은 모두 원인을 확인했다.

- 버튼 이름을 잘못 찾은 시나리오 오류(`수정` → `선택 재생목록 수정`)는 시나리오를 고쳐 PASS.
- 1회성 403 주입은 다음 호출이 복구해 목록이 나온 것이어서 판정에 쓸 수 없었다. 거절을 유지하는 시나리오로 교체해 위 표의 결과를 얻었다. 최종 전체 실행의 잔여 FAIL 4건이 이 폐기된 1회성 시나리오이다.
- 디스플레이 선택 화면에서 확정 용어와 어긋난 제품 문구(`플레이리스트` · `재생` · `항목 수`)를 발견해 수정했다.

## Consumer Impact Matrix

전체 소비처 분류는 [TODO §5](../work-orders/TODO-O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md#5-소비처-표) 가 정본이다. 집계: 전환 23 · 준수 20 · 읽기 전용 예외 51 · 목록 업무 아님 7 · 하위 표 2.

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
|---|---:|---|---|---|---|
| web-store | 사용 | 사이니지 재구성, 화면 전환 | 신규 `videos/new` · 폐기 경로 redirect, 권한 변경 없음 | typecheck + test + 모의 브라우저 | PASS |
| web-neture | 사용 | 화면 3개 배치 | 없음 | typecheck + test | PASS, 브라우저 미실행 |
| web-pharmacy-coop | 사용 | 관리 화면 배치 | 없음 | typecheck + test | PASS, 브라우저 미실행 |
| admin-dashboard | 사용 | 화면 4개 배치 | 없음 | typecheck + 관련 test | PASS, 브라우저 미실행 |
| operator-core-ui 소비 서비스 | 사용 | 공통 콘솔 배치 | 없음 | package test | PASS, 브라우저 미실행 |
| api-server | 사용 | 재생목록 응답 필드 추가, 접근 없음 403, #945 누락 포팅 | API 응답 additive · 접근 거절 명확화 | typecheck + boundary test | PASS, SQL 실행 미검증 |

`check-literal-consumers`: `ListWorkspace` · `GuideBlock` 경로 리터럴 0, `ActionBar` 는 기록 문서만. 원문 소스를 읽는 계약 테스트는 위 테스트 실행에서 통과했다.

## 미해결

1. **재생목록 집계 SQL 실행 미검증.** 운영 DB 접속과 로컬 임시 PostgreSQL 실행을 모두 수행하지 않았다(후자는 도구 권한에서 거절). 컬럼 · 타입은 마이그레이션과 대조했다. 병합 전 read-only 또는 CI 에서 실행 확인이 필요하다.
2. **실서버 · 실기기 미검증.** YouTube/Vimeo embed 재생, 실제 TV 브라우저의 자동재생 · 전체화면 제약은 확인하지 못했다.
3. **다른 소비처의 행 동작 미확인.** `commerce/local-products` 는 모의 응답 형식이 맞지 않아 오류 상태에서 머리 · 재시도 표시만 확인했다. web-neture · coop · admin 은 브라우저 실행이 없다.
4. **내 자료함은 첫 화면에 목록이 보이지 않는다.** 상단 오른쪽 버튼은 맞췄지만 탭 · 안내 · 필터가 여러 단이다. 탐색 구조 개편이라 후속 WO 후보로 남긴다.
5. **셸 AI 입력.** `StoreAiAssistant` 한 줄 입력은 `StoreWorkspaceShell` 기본 위치라 유지했고 정본에 예외로 기록했다. mobile 390 에서는 셸 영역 때문에 첫 행이 화면 아래쪽(y≈797)에 온다.
6. **`ListWorkspace` 직접 채택.** 사이니지 외 화면은 배치만 계약에 맞췄다. 컴포넌트 채택은 후속 WO 후보다.
