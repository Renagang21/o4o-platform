# Main 업무 도우미 — 사용 중 축적·단방향 서버 전환

> 상태: ACTIVE · 작성일: 2026-10-30 · 개발 종료점: main 병합 전

## 사용자 확정과 검증 보완

- 사용자의 실제 업무를 먼저 수행한다. 사전 매뉴얼·상품 매칭·완성된 DB 설계는 시작 조건이 아니다. 기존 Task/Experience/사용자 도움/SQLite를 재사용하고, 누적 패턴의 구조 정비는 원본을 보존하는 별도 검증된 migration으로 한다. 임의 SQL을 AI에 허용하지 않는다.
- 기본은 연결 PC의 SQLite. 자동화용 PC에서 약국 프로그램의 네트워크 다중 사용자 기능을 이용한다. 조제 PC 화면과 동시에 입력하지 않는다. 소량 사용량 변화 때문에 주문 자료를 재조회하지 않는다.
- 시작 또는 작업 중 명시적 동의로 서버를 선택한다. 로컬→전환 중→서버의 단방향 상태다. 완료 전 PC 자료를 동결·전송하고 서버 자료의 조기 사용을 막는다. 전환 실패는 재시도하며 기존 자료를 삭제하지 않는다.
- 완료 후 서버가 업무 자료의 기준이다. 모바일/다른 PC는 서버 자료로 후속 업무를 수행한다. 원격 화면 조작을 새로 지원한다는 뜻이 아니다. PC 프로그램 수집은 지정 PC의 업로드만 사용하며 서버 수정의 PC 역동기화/로컬 복귀는 제공하지 않는다.
- 동의 철회는 서버 이용 중단·서버 자료 삭제이며 로컬 업무로 자동 복귀하지 않는다. PC의 이전 checkpoint는 복구 근거로 보존하되 일반 업무 조회·수정에는 사용하지 않는다. 기존 동의 이용자도 지정 수집 PC와 전환 완료를 확인한다.
- 기존 인증/Core/Extension/Task/Memory/quota를 중복 생성하지 않는다. 공급자 상품 등록 AI·최종 외부 주문/결제·운영 DB 적용·병합/배포는 범위 밖.

## TODO

- [x] 최신 main·정본·소비처 조사: 기존 동의 table, sync journal, Main panel, authenticated Node command, 분석 branch.
- [x] 검증 보완: 구버전 PC 거부·지정 PC만 업로드·전환 중 편집 동결·서버→PC 미다운로드·철회 후 fallback 거부·중간 저장 완료 후 전환·재시도/계정 전환 보존을 완료 기준에 추가.
- [x] 기존 동의 table/SQLite journal에 최소 상태 필드를 추가하고 구버전 capability를 분리.
- [x] 서버 전환/중단·업로드 완료 handshake·단일 저장 기준을 API/PC에 연결.
- [x] Main 시작/중간 전환·진행 표시·서버 기준 저장/조회·중단을 실제 화면 흐름에 연결.
- [x] 기존 경험/실행과 자료 축적 연결의 범위를 확인하고 시작을 막는 안내를 제거.
- [x] 정본의 양방향 보관 안내를 이번 사용자 결정과 정합. 과거 WO/CHECK는 보존.
- [ ] 격리 SQLite/PG·API·desktop/mobile 화면·타입/build/CI·Codex 검증 후 같은 branch/PR로 main 병합 전 인계.

## 소비처와 검증

Node pharmacy data/sync/CLI·Main 주문 panel/데이터 API·API browser routes/agent routes/분석·구버전 PC capability·계정 삭제 fence가 소비처다. 다른 서비스의 공통 menu/인증/정산은 변경하지 않는다. 합성 자료만 사용하고 사용자 업로드 엑셀은 공개 저장소/테스트 fixture에 넣지 않는다. 실제 약국 PC/실주문·유료 모델 검증과 격리 검증을 구분한다.

로컬 결과: 실제 PG 19 PASS, API 실행/경험 회귀 8 suites 133 PASS, PC native 222개 중 220 PASS/Windows 전용 2 SKIP, 화면 19 PASS·자료 파일 2 PASS, desktop/mobile Chromium 4흐름 PASS. 서버→PC 병합/staging 실행 코드는 제거하고 전송 확인만 유지한다. 상세·미실행 범위는 [CHECK](../checks/CHECK-O4O-ASSISTANT-SERVER-TRANSITION-V1.md).

리뷰 보완: [PR #888](https://github.com/Renagang21/o4o-platform/pull/888)의 참조 재수집 지적을 실제 SQLite로 재현했다. 서버에서 새로 시작한 후 명시적으로 재수집한 미확인 참조 행은 payload가 같아도 업로드하고, 과거 checkpoint의 자동 복원은 계속 차단한다. 알려진 자료 오류는 권한 재확인 후 기록해 백그라운드 반복을 멈추며, 사용자가 같은 지정 PC로 명시적으로 재시도할 때만 재개한다. 재수집/일시중단/원본 PC 유지 검사를 추가했다.

배포 호환성: 구버전 API가 `enabled`만 변경한 기록은 상태를 정규화해 이전 안내 또는 중단으로 판정한다. 중단 기록은 구버전 flag 변경만으로 재개되지 않고, 명시적 서버 새 시작에서는 과거 사본을 복원하지 않는다. 실제 격리 PG로 legacy grant/off/regrant 상태를 검증한다.

2026-10-30 사용자 후속 지시: Main의 데이터 정비 버튼·전용 폼·정형 prompt 조립 코드를 제거한다. 일반 대화의 수정 입력·같은 run 재개·첨부/범위·로그인 경계를 유지하며, 관리자 상품 DB 정비 화면과 내부 검증/교정은 이 제거 대상이 아니다.
