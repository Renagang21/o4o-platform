# Main 자동화 — 누적 자료·서버 업무·사용 중 개선 검증

> 상태: IN_PROGRESS · 작성일: 2026-10-29
> 범위: [Main 리팩터링 TODO](../work-orders/TODO-O4O-MAIN-AUTOMATION-EVOLUTION-V1.md)
> 종료점: main 병합 전. 이 문서는 운영 migration·배포·실계정 검증의 증거가 아니다.

## 변경과 경계

- SQLite v9는 원본/교정 lane을 행으로 누적하며 v8 workspace와 백업을 보존한다. 전송 배치와 전체 보관량을 분리했다.
- Main↔PC는 기존 인증 명령을 사용한다. 명령 큐의 일시 전달과 동의한 업무 사본의 지속 서버 보관은 구분한다. 새 인증·Task·Memory·주문·정산 원장을 만들지 않았다.
- 서버 보관은 기본 해제다. 소유 범위·허가 epoch·행 version·mutation을 검사하며 철회 시 서버 사본을 삭제하고 PC 자료를 유지한다. 충돌은 자동 덮어쓰기하지 않고 로컬 교정을 보존·분리한다. 충돌 없는 대기 자료는 이후 동기화를 계속할 수 있다.
- 서버 사본의 구매/반품·사용량·판매량 집계는 단위별로 나눈다. 프로그램 주문과 매입 입고를 합치지 않으며 현재 재고/자동 주문량으로 확정하지 않는다.
- 내부 콘텐츠 조회·미공개 초안은 기존 도메인 adapter/권한과 기존 AI 예약·정산을 사용한다. 공급자 상품 DB 등록 AI를 변경하지 않는다. 로그인·외부 최종 주문·결제·게시 확정은 수행하지 않는다.
- 대기 Task는 기존 Task/coordination에서 요청자·업무 범위·만료를 확인해 찾는다. 요청 원문을 별도 대화 원장에 복제하지 않는다. 오래된 goal_summary 영속 저장은 제거하고 같은 프로세스의 한정된 재생 입력만 메모리에 둔다. 재시작 뒤 재생 입력이 없으면 탐색으로 돌아간다.
- 공통 방법 추천은 업무 자료 보관과 별도 선택 동의다. 공개 사이트의 독립된 검증 기여에서 동작 enum 순서만 집계한다. 사용자 ID·label·목표/질문·화면 글·거래 값·자격정보를 추천에 전달하지 않는다. 추천은 결정적 재생이나 실행 권한이 아니다.

## 검증 증거

| 검증 | 실제 결과 | 범위/한계 |
|---|---|---|
| native 전체 `node --test tools/o4o-local-agent/test/*.test.mjs` | 214건 중 212 PASS · Windows 2 SKIP | 격리 SQLite/합성 bridge. 실제 사용자 PC와 구분 |
| SQLite 누적/이행/동기화 | PASS | 12,000개 누적·페이지 조회, 원본/교정·중복·revision, v8 이행/손상 rollback/백업, grant 없는 무전송·재전송·철회, in-flight 수정 보존·충돌 격리 |
| PostgreSQL 15 전용 fixture | 9 PASS · 생성 DB 삭제 확인 | baseline/모든 prefix fingerprint·신규 empty down/up, 허가/철회·소유권·멱등성·충돌·교정·단위별 집계·추천 선택 동의, HTTP의 합성 인증 principal과 Task 타인/만료 차단 |
| Main 주문 준비 Vitest | 11 PASS | 기존 주문 준비/직접 접수 경계, 자동 저장 실패 입력 보존·반복 재시도 중지·사용자 재시도, 두 종류 동의 분리 |
| Main home/첨부/재개 관련 Vitest | 8 suite · 65 PASS | 위 11건을 포함. 중복 합산하지 않음 |
| Main 실제 Chromium | desktop/mobile PASS | 전체 Main 화면·보관 선택·자동 저장·기기 전환 서버 조회·가로 넘침/페이지 오류 없음. 합성 API이며 실제 PC/사이트 아님 |
| 서버 콘텐츠 실행 unit | 5 PASS | 기존 adapter 재사용, 미승인 공간·요청하지 않은 쓰기 거절, 저장 transaction에서 권한 재검사 |
| API 확장 회귀/최종 타입·build·정적 guard | 초기 확장 회귀 21 suite PASS, 발견된 2 suite 보완·재검증 PASS. API 타입/Main build·guard PASS | 최신 main 정렬 후 인계 HEAD에서 재확인 |
| Windows native 설치/runtime | NOT_RUN (로컬 Linux) | PR Windows runner 결과로 별도 확인 예정 |
| 실계정·실제 모델·약국 export Mapping·실제 주문 사이트 | NOT_RUN | 현행 계정 SSOT 파일이 현재/기준 checkout에 없음. 이전 계정/운영 credential로 대체하지 않음 |

합성 테스트는 실제 계정이나 비용·모델 품질·모든 업무 완결성 검증으로 승격하지 않는다. 매뉴얼은 기존 브라우저 자료함/요청 발췌 경로를 유지하며 업무 자료 보관 동의를 PDF·매뉴얼 동기화 동의로 확대하지 않는다. 미등재 외부 사이트의 자동 조작은 무제한 허용하지 않았다. 처음 만난 접점은 현재 자료로 가능한 안내를 하고 실제 화면·메뉴·사용 중인 주문 주소의 최소 도움으로 이어간다.

## Shared Module Change Verification

### Changed shared module

- Module: 순수 약국 자료 계약, PC 명령/capability, Assistant ExecutionIntent의 선택적 추천.
- Package: 새 공통 Core/package 없음. 기존 Node/Main/API 경계에서 재사용.
- Direct consumers: `tools/o4o-local-agent`, `web-neture`, `api-server`.
- Indirect consumers: Main Assistant를 쓰는 기존 화면. 선택 필드는 종전 실행·완료/권한 계약을 바꾸지 않는다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | 검증 방식 | 결과 |
|---|---:|---|---|---|
| PC Node | 직접 | v9·누적 자료·동의된 증분 sync·0.5.0 capability | native suite·기존 installer 계약 | Linux PASS / Windows 후속 |
| Main Neture | 직접 | 자료 연결·자동 저장·별도 동의·대기 업무 선택 | Vitest·desktop/mobile Chromium·build | 화면/build PASS |
| API Assistant | 직접 | 서버 업무/집계·권한·공개 방법 추천·일시 명령 | PG fixture·unit·기존 runtime 회귀 | fixture/unit PASS / 확장 회귀 보완 PASS |
| KPA/K-Cosmetics 등의 매장 menu/layout | 해당 없음 | 공통 메뉴·역할 map·가시성 정책 변경 없음 | 소비처/route 검색 | 이번 UI 범위 밖 |
| 병원약국 surface | 간접 | 기존 분기가 새 Main 콘텐츠 분기보다 우선 | unified-request HTTP 회귀 | PASS |
| Chrome Extension | 간접 | 새 명령은 Node data handler 전용. DOM/site allowlist 변경 없음 | native bridge/DOM 계약 회귀 | PASS |

### Route / role / capability check

- Route existence: `/api/ai/work-data/*`, `/api/local-agent/work-data/{grants,sync}`. debug/test route가 아니다.
- Role guard: 기존 사용자 authenticate/Neture 회원·실제 조직 소속, 기존 PC session principal. body owner/device/org ID를 권한으로 사용하지 않는다.
- Capability map: 선택적 `pharmacyData`; 구버전은 false로 처리하고 자료 실행 시 업데이트 안내. 다른 PC 기능은 유지.
- Visibility/filter: Main의 기존 로그인/정책 수락 경계 안에서 노출. 신규 공통 서비스 메뉴 없음.
- Empty group/block removal: 해당 없음.

### Smoke result

- Neture: 합성 API로 실제 desktop/mobile Chromium PASS.
- PC: 격리 SQLite/합성 bridge PASS; 실제 Windows 사용자 PC NOT_RUN.
- KPA/K-Cosmetics: 메뉴/layout 변경 없음; 이 작업에서 서비스별 browser smoke 미실행.

## 문서 정합과 Git 인계

Evolution §25의 오래된 census 표를 당시 조사 링크와 현재 원칙으로 교체했다. Personal Assistant·Memory placement·약국 자료 설계·SETUP의 관련 안내를 이번 개발 계약과 맞췄다. 과거 WO/CHECK의 당시 실행 증거는 다시 쓰지 않았다. 적용된 운영 정책·배포 상태로 오인하지 않게 TODO/branch 구현·미검증 범위를 구분한다.

PR·인계 HEAD·CI Gate·Codex review는 최종 검증 후 기록한다. merge·auto-merge·배포·운영 DB 적용은 수행하지 않는다.
