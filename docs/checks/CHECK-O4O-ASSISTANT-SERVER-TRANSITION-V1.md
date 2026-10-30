# Main 업무 도우미 — 서버 기준 전환 검증

> 상태: IN_PROGRESS · 작성일: 2026-10-30 · [TODO](../work-orders/TODO-O4O-ASSISTANT-SERVER-TRANSITION-V1.md)
> 개발 검증 기록. main 병합·운영 migration·배포·실 약국 PC 실행의 증거가 아니다.

## 변경

- 기존 동의 테이블에 `storage_mode`, `source_device_id`, `transfer_error`만 추가한다. 새 원장·Core·인증·Task·정산 체계 없음.
- 로컬 이용→지정 PC에서 이전 중→서버 기준 이용. 전송은 기존 PC session/업로드 journal을 쓰고 완료 handshake 전에는 서버 조회·분석·사용자 수정을 거부한다. 계정·소유 주체·epoch·단일 수집 PC·CAS·mutation 재시도 경계를 유지한다.
- PC 0.6.0 / SQLite v10은 서버 기준 전환 capability를 보고한다. 이전 클라이언트는 새 grants/업로드 프로토콜에 참여하지 않는다. v9 이하 데이터는 백업과 순차 migration으로 보존한다.
- 서버 수정의 PC download·병합·충돌 staging 실행 경로를 제거했다. PC는 업로드 확인만 반영하며 원격 payload를 받으면 전체 처리를 거부한다. 과거 migration/복구 table은 삭제하지 않는다. 이전 mirror가 같은 epoch로 전환할 때 알려진 server version과 원본은 유지하고 기존 충돌 대기를 재전송 대상으로 전환한다.
- 서버에서 새로 시작한 후 수집 PC를 연결해도 이전 checkpoint를 자동 복원하지 않는다. 이후 프로그램에서 수집한 자료만 업로드한다. PC에 남은 이전 checkpoint는 일반 업무 조회/교정/restore로 쓰지 않는다.
- 철회는 기존 서버 업무 자료 삭제+`stopped`이며 로컬 복귀가 아니다. 재동의는 빈 서버 자료로 시작하며 과거 PC 자동 재업로드를 막는다.
- Main의 보관 선택은 주문 메뉴 밖에 노출한다. 실행 중 요청은 현재 단계가 끝날 때 처리하고, 미저장 수정은 먼저 저장한다. 실패하면 입력을 유지한다. 이전 중 처리 건수·PC 연결·충돌 상태를 표시하고 서버 전환 후에는 PC 가져오기/보관 동작을 숨긴다. 서버 이용자는 다음 접속 시 자료를 자동 연결한다.
- 실제 업무를 먼저 수행하는 기존 Planner/사용자 도움/Experience 재사용을 유지한다. 사전 파일/매뉴얼 등록을 요구하는 안내는 제거했다. 가변 Dataset과 업무 행을 재사용하며 AI 임의 DDL·화면 원문 자동 보관·새 무제한 데이터 수집은 추가하지 않는다. 프로그램 화면 조작은 기존 PC runtime이며 모바일 원격 화면 조작 기능을 새로 주장하지 않는다.

## 로컬 검증

| 항목 | 증거/결과 |
|---|---|
| 실제 격리 PG 15 | Main fixture 19 PASS; 빈 신규 migration down/up, 모든 기존 prefix/new fingerprint, 최종 schema 복원, fixture DB 잔존 0 |
| 새 schema | `e6fd46ae64b9aed8e41ad05927bc14968f8f840f483142ec69a53760af44fa19`, 7409 lines; 기존 상태 registry 변경 없음 |
| PC SQLite/명령/기존 실행 | native 전체 회귀와 신규 authority 검사; 최종 수치는 PR 인계 기록에 연결 |
| API 실행/노드/경험 재사용 | 8 suites 133 PASS; 별도 PG 결과와 중복 합산하지 않음 |
| Main 화면/파일 | 화면·보관 전환·진행 중 예약·저장 실패 보존·자료 파일 회귀 PASS; 최종 수치는 PR 인계 기록 |
| 실제 Chromium | 합성 API로 desktop/mobile × 서버 시작/진행 중 전환 4흐름 PASS. 서버 저장/중단, 역 PC 접근 없음, 콘솔 page error 없음, 가로 넘침 없음. 사용자/운영 계정 사용 없음 |
| API/Web 타입·실제 빌드 | 타입 검사와 API tsc→database backup→tsup→restore·신규 migration/main/migrate syntax/artifact PASS; Neture production build 확인 |
| guard | migration 계약 21 PASS, 문서 민감정보·ESLint·diff 확인. 최종 PR CI/Codex는 동일 HEAD로 추적 |

기존 account-erasure writer gap 13개는 이번 migration 이전/이후 동일하며 추가 0이다. 이번 작업이 전체 계정 삭제를 완성했다고 보고하지 않는다. 기존 타 도메인 보존 정책·운영 DB를 변경하지 않는다.

## Shared Module Change Verification

변경 공통 모듈은 Node capability와 기존 work-data 보관 계약이다. 공통 메뉴·역할·결제·Core 실행 계약은 바꾸지 않는다.

| 소비처 | 영향 | 검증 |
|---|---|---|
| Main browser | 단방향 선택·전환·서버 기준 조회/저장·중단 | Vitest·실제 Chromium desktop/mobile·types/build |
| API Main/agent routes | 사용자/조직 권한·지정 PC/epoch·이전 중 거부·완료/철회 | 실제 PG HTTP/서비스 검사·API 회귀 |
| PC Node/CLI | SQLite v10·교정 동결·source 업로드·ack만 처리 | 격리 native suite·백업/migration·호환/전송 재시도 |
| 기존 PC 0.5 이하 | capability 미보고·grants 미참여·전환 업데이트 안내 | capability/HTTP 테스트 |
| 일반 Work runtime/다른 서비스 | 선택적 capability의 기존 분기 유지. 공통 menu/권한 변경 없음 | 기존 노드 선택·Task dispatch·도움/회복·경험 재사용 회귀 |
| 계정 삭제 | 기존 consent/record table writer fence 재사용 | PG writer gap 비교·기존 domain purge/FK 회귀 |

## 미실행과 정합

실제 약국 Windows PC 설치·네트워크 약국 프로그램 화면·원본 export mapping·실 주문 사이트·실제 모델 품질/비용은 NOT_RUN이다. 실제 테스트 계정 SSOT 파일이 현재/기준 checkout에 없어 운영 계정 테스트를 대체하지 않았다. 업로드된 사용자 업무 자료는 공개 fixture/문서/저장소에 복사하지 않았다. 운영 업무 데이터를 생성하지 않았다.

문서 정합: Personal Assistant V2 §6-3·Evolution §25·약국 자료 설계를 사용자 결정에 맞춰 수정했다. 기존 양방향 mirror의 과거 WO/CHECK/배포 증거는 당시 기록으로 보존하며, 현재 저장 계약은 본 TODO와 정본을 따른다. 최종 CI·Codex·Git 상태는 같은 PR에 기록한다.

리뷰 보완: [PR #888](https://github.com/Renagang21/o4o-platform/pull/888)의 참조 재수집 지적을 실제 SQLite로 재현했다. 서버에서 새로 시작한 후 명시적으로 재수집한 미확인 참조 행은 payload가 같아도 업로드하고, 과거 checkpoint의 자동 복원은 계속 차단한다. 알려진 자료 오류는 권한 재확인 후 기록해 백그라운드 반복을 멈추며, 사용자가 같은 지정 PC로 명시적으로 재시도할 때만 재개한다. 재수집/일시중단/원본 PC 유지 검사를 추가했다.

배포 호환성: 구버전 API가 `enabled`만 변경한 기록은 상태를 정규화해 이전 안내 또는 중단으로 판정한다. 중단 기록은 구버전 flag 변경만으로 재개되지 않고, 명시적 서버 새 시작에서는 과거 사본을 복원하지 않는다. 실제 격리 PG로 legacy grant/off/regrant 상태를 검증한다.

2026-10-30 사용자 후속 지시: Main의 데이터 정비 버튼·전용 폼·정형 prompt 조립 코드를 제거한다. 일반 대화의 수정 입력·같은 run 재개·첨부/범위·로그인 경계를 유지하며, 관리자 상품 DB 정비 화면과 내부 검증/교정은 이 제거 대상이 아니다.

Main 정비 폼 제거 검증: 일반 대화의 수정·기존 run 재개/첨부·로그인 경계 3 PASS. 실제 Main을 Chromium 1365/390px에서 확인해 버튼/폼 부재·대화 입력·가로 넘침 없음·page error 없음 2흐름 PASS. ESLint와 Neture 타입/production build PASS. 전용 폼 단위 검사는 소비처 삭제와 함께 제거하고 실제 대화 회귀는 유지했다.
