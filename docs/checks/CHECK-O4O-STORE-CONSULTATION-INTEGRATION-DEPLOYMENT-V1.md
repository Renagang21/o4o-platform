# 내 매장 상담·컨텐츠·채널 main 통합·운영 배포 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **작업**: [통합 WO](../work-orders/WO-O4O-STORE-CONSULTATION-INTEGRATION-DEPLOYMENT-V1.md)
> **정본**: [데이터 범위](../design/DESIGN-O4O-STORE-CONSULTATION-DATA-SCOPE-V1.md)
> **선행 증거**: [개발 CHECK](CHECK-O4O-STORE-CONSULTATION-CONTENT-CHANNEL-COMPLETION-V1.md) · [배포 연결 CHECK](CHECK-O4O-STORE-CONSULTATION-CLEANUP-DEPLOYMENT-V1.md)

## 1. 통합 범위·검토

[PR #813](https://github.com/Renagang21/o4o-platform/pull/813)의 최종 source는 `5bdf961f3fa3a9f672eff0529010e25a9e0c2ecb`다. 선행 상담 사용성·전문 판단 지원·상품 원문 확인/삽입·다국어 안내에서 QR 연결·태블릿/사이니지 수정과 만료 상담 정리의 production 설정을 하나의 branch로 통합했다. 최신 기준 main `42dddc91b5ee18605c62b9c3e55091137dcd2b7f`를 정상 merge했고, 기존 운영자 초대 정리 start/stop과 공통 AI의 최신 회계 절을 보존했다.

최종 HEAD의 required `CI Gate`를 포함한 [CI `40181378075`](https://github.com/Renagang21/o4o-platform/actions/runs/40181378075)와 Codex 검토가 통과했다. Canonical 상품 설명 상태에 관한 P2 1건은 수정·회귀 검증 후 스레드를 해결했고 최종 HEAD 재검토는 지적 0건이다. `--match-head-commit`으로 검증한 HEAD만 main에 병합했다. 우회·force push·auto-merge는 사용하지 않았다. 병합 SHA는 `fda3f672d19f08c7eb43e1b464d690a500efbc82`다.

새 migration/schema·의존성/lockfile·공통 Core runtime·IAM/credential은 추가하지 않았다. API 배포 설정 변경은 LEVEL 3 / MANUAL-GATED로 처리한다. 기존 만료 상담의 현재 전달 상태 정리 apply는 사용자 승인 범위이며 기기 등록·게시 자산·업무 결과는 보존한다.

## 2. 발견·수정한 통합 실패

| 근거 | 원인·보완 | 결과 |
|---|---|---|
| CI `40177426528`, API shard 3 | 정적 계약이 모든 다국어 작성에서 translate 리터럴을 요구. 한국어 첫 원문/번역 분기를 검사하고, 기준 본문 없는 외국어도 결과 언어 지시를 유지 | 계약 113건·다국어 UI 39건 PASS, 이후 API 3개 shard PASS |
| CI `40179177758`, Store 848건 중 1 FAIL | 음성 이벤트 후 오래된 DOM 참조로 동기 조회. 인식 시작/React 갱신을 기다리고 현재 화면을 다시 조회. 기존 단언 유지·예기치 않은 abort 없음 추가 | 음성 18건의 순서 seed 5개 모두 PASS, 이후 웹 CI PASS |
| Codex P2, `521d375f44` | 상품 원문 endpoint는 canonical STORE 설명을 반환하지만 Picker가 published만 선택 | `5bdf961f3f`에서 canonical 계약·출처 문구와 언어 대체/빈 결과/실패/재시도 검증 보완. 최종 지적 0건 |

검사를 삭제/skip하거나 CI Gate를 낮추지 않았다. 로그 호스트는 클라우드 환경 허용 목록의 403으로 차단되어 사용자 제공 로그·GitHub annotation·로컬 재현으로 확인했다. 기존 네트워크 설정을 보존한 단일 호스트 추가 초안을 저장했으며 적용 완료로 표시하지 않는다.

## 3. 로컬 검증

| 검사 | 결과 |
|---|---|
| 설치·build | Node 22.18.0 / pnpm 10.25.0, frozen lockfile·무결성 유지. 전체 패키지·API·Store build PASS |
| API 업무·생명주기 | 29 suites / 217 PASS, 기존 조건부 14 suites / 187 SKIP |
| 편집기·경계 계약 | 3 suites / 113 PASS |
| 최종 Store 전체 | 77 files / 851 PASS. 다국어 39·Picker 6·음성 18은 이 수치의 부분집합 |
| 배포/환경 회귀 | 16 suites / 96 PASS. 실제 resolver CLI 합성 gcloud의 enabled 없음/false/true 보존·조회 실패 중단 4/4 PASS |
| 집중 lint | 마지막 페이지/Picker/음성 검사 수정 파일 오류·경고 0. 앞선 변경 전체 오류 0, 기존 `_next` 경고 1 |
| 데스크톱·모바일 | Chromium 1440×1000 / 1280×800 / 390×844, 51/51 PASS·pageerror 0 |

브라우저 검사는 실제 React/API client·Express 업무 route·Core prepare/parse에 합성 인증/SQL/provider를 연결했다. Canonical 실제 응답 envelope·언어 대체·명시 삽입·매대 음성 상태와 수정 동선을 포함한다. 실제 계정·유료 provider·현장 마이크/기기/약사 검수를 뜻하지 않는다. 격리 PostgreSQL SQL 5건은 선행 CHECK의 과거 실행 증거이며 이번 수치에 합산하지 않았다.

## 4. 운영 배포

| 단계 | 실행·결과 |
|---|---|
| 병합 후 CI | [`40182288786`](https://github.com/Renagang21/o4o-platform/actions/runs/40182288786) SUCCESS. CI Gate·API 3개 shard·웹 build·품질 PASS |
| 병합 후 CodeQL | [`40182288734`](https://github.com/Renagang21/o4o-platform/actions/runs/40182288734) SUCCESS |
| 자동 Delivery | [`40183053153`](https://github.com/Renagang21/o4o-platform/actions/runs/40183053153) SUCCESS. `HELD_LEVEL_3 · held: api(L3),store(needs-api)`로 실제 배포를 보류 |
| 승인된 Promote | [`40183174373`](https://github.com/Renagang21/o4o-platform/actions/runs/40183174373) SUCCESS, exact main `fda3f672d1`, 대상 `api,store` |
| 운영 결과 | Report가 실제 serving SHA를 재확인한 뒤 `production = success · DEPLOYED · deploy: api,store`. 배포 source는 `fda3f672d19f08c7eb43e1b464d690a500efbc82` |

배포 직전 main/CI·자동 판정과 다른 진행 중 운영 배포 0건을 재확인했다. 이전 production 성공 기록은 API `42dddc91b5`, Store `4ee5a8ecda`다. API→target에 신규 migration이 없고 Store 누적 변경에도 dependency/lockfile 변경이 없음을 대조했다. Store에 함께 들어오는 기존 패키지 변경은 이미 main에 병합된 공통 AI/강의 정비이며 이 작업에서 수정하지 않았다.

기존 migration job·현재 설정 조회/cleanup env 처리·API 새 리비전 readiness 검사·트래픽 전환 단계가 모두 SUCCESS다. production의 mode는 workflow에서 명시 apply로 전달하고 기존 enabled 중지 값은 보존한다. 로컬 기본 dry-run은 유지한다. 직접 GCP identity는 제공되지 않아 기존 production/WIF 경로의 검증 결과를 사용했다. 로그 호스트 접근이 차단되어 실제 현재 enabled 값과 Cloud Logging 정리 count/본문 파기는 확인하지 못했다. 설정 처리·배포 성공이 실제 정리 완료를 뜻하지 않는다.

배포 후 2026-10-25 10:14 UTC 공개 smoke **13/13 PASS**:

- API `/health/ready` 200·ready, `/health/live` 200·alive.
- 인증 없는 상담 지원 POST는 401. 유료 AI를 호출하지 않았으며 이 응답만으로 세부 역할 인가를 검증했다고 표시하지 않는다.
- Store 홈·독립 직원/고객 상담·매장 컨텐츠 작업 경로 shell 200. shell은 로그인 업무 검증을 대신하지 않는다.
- 새 웹 entry의 상담 지원 코드와 canonical 매장용 원문 표시, 다국어 편집·태블릿·사이니지 JS asset 조회 성공.

이 후속 기록은 문서-only이며 `DEPLOYMENT=NOT_APPLICABLE`이다. 문서가 더 최신 main에 반영되어도 실제 배포 SHA를 문서 commit으로 바꾸어 기록하지 않는다.

## 5. 미관측·후속

실기기·현장 음성·약사 언어/전문 품질 검수는 사용자 지시로 연기했다. 운영 계정의 업무 자료·역할/기능 설정·기기 pairing·유료 AI 요청·테스트 업무 데이터 생성은 실행하지 않았다.

정리는 기존 90초 연결 만료·프로세스 실행 중 60초 주기·회당 200행이다. Cloud Run의 scale-to-zero/CPU 중지·적체가 있어 90초 내 물리 파기 SLA나 독립 상시 스케줄러를 제공하지 않는다. 기본 dry-run과 production apply 설정, 기존 enabled=false 보존, 실제 실행 count/본문 파기는 각각 구분한다.

문서 정합: 발견 3건(다국어 작성 계약·음성 비동기 검증·canonical 원문 상태) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.

## 6. 후속 운영 정리 관측 — 2026-10-25 사용자 로컬 확인

**추가일: 2026-10-26.** 사용자가 로컬 환경에서 실제 GCP 상태를 읽기 전용으로 확인했고 이전 세션에서 검증 완료로 받아들인 결과를 인계받아 추가한다. 위 §4~5의 당시 미관측 기록은 유지한다. 이 절은 새 클라우드 작업공간에서 운영 상태를 다시 조회한 결과가 아니며 현재 운영 상태를 보장하지 않는다.

| 관측 항목 | 2026-10-25 확인 결과 |
|---|---|
| 운영 API 리비전·트래픽 | `o4o-core-api-04207-zof`, 해당 리비전 100% |
| 당시 배포 SHA | `fcae70f142` ([PR #815](https://github.com/Renagang21/o4o-platform/pull/815)); 상담 통합 `fda3f672d1`의 후속 커밋 |
| 상담 정리 MODE | `apply` |
| 성공한 apply 실행 | 31회 |
| unavailable 경고 | 0회 |
| 정리 대상 합계 | 0건 |
| 관측 인스턴스 | 1개 |

관측 범위에서 apply 실행은 확인됐으나 대상 합계가 0건이므로 실제 상담 본문이 삭제된 사례를 검증했다는 뜻은 아니다. 단일 인스턴스의 당시 관측을 전체 기간·모든 인스턴스의 보장이나 90초 내 물리 파기 SLA로 확대하지 않는다. GCP 확인은 사용자 로컬에 맡기며 이 기록을 위해 클라우드에 GCP 토큰을 추가하거나 운영 설정·데이터를 변경하지 않았다.

### 남은 현장 검수와 제품 범위

합의된 상담 개발·핵심 배포는 완료됐고 다음 검수는 사용자 지시로 계속 보류한다. 실제 운영 계정의 업무 데이터 변경과 유료 AI 호출은 해당 범위의 별도 지시 후 수행한다.

- 실제 태블릿 전체 상담 흐름, 한 화면 공유·직원/고객 두 화면의 연결·왕복·재연결.
- 상담 종료·다음 고객 전환과 이전 고객 정보 노출 여부.
- 현장 음성 인식·번역·약사 응답 품질 및 실제 AI 제공자의 지연·비용·할당량.
- 실제 약사·직원 계정의 권한 경계·접근 해제와 매장 간 격리.

[데이터 범위 정본](../design/DESIGN-O4O-STORE-CONSULTATION-DATA-SCOPE-V1.md)의 ‘상담 원문 없이, 확인한 상품·컨텐츠와 업무 결과를 재사용’ 방향을 유지한다. 상담 원문 영구 이력·Task/Memory 축적·학습 기능을 미완료 요구사항으로 추가하지 않는다. 이 후속 문서 기록은 `DEPLOYMENT=NOT_APPLICABLE`이며 재배포를 수행하지 않는다.

문서 정합: 당시 미관측 기록을 보존하고 사용자 로컬의 후속 관측과 남은 현장 검수만 추가했다. 정책·구현·canonical index 변경 없음.
