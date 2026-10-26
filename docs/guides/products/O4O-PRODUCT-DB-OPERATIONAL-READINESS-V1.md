# 상품 DB 관리자 운영 준비 V1

상태: 개발·검증 중, main 미병합 · 2026-10-26

## 현재 운영과 이번 개발

P1/P2·설명서 갱신·예약 관리·일반 편집 연결은 PR #816, 기준 초안·상품별 이력·독립 worker는 PR #822 및 이미지 문맥 보완 PR #823으로 병합됐다. 공식 Promote [40249872295](https://github.com/Renagang21/o4o-platform/actions/runs/40249872295)가 API·관리자 배포를 완료했다. worker bundle 배포와 Job/Scheduler 운영 연결은 다르다. 외부 정기 호출과 서버 휴면 중 실행은 아직 확인되지 않았다.

이번 branch는 관리자 관측 표시와 **비실행 연결 계획**을 보완한다. 기존 권한·API·DB 저장 계약·상품 반영 경로를 바꾸지 않는다. 외부 AI 연결은 다른 담당이다.

## 관리자에서 운영 확인

관리자 → O4O 상품 DB → 데이터 정비 → 정기 관리 현황을 불러온다. 실행 성공 기록 없음, 5분 이상 오래된 성공, 최근 실행 실패와 예정 시각이 지난 예약을 구분한다. 5분은 화면의 관측 안내 기준이며 Scheduler SLA·자동 장애 판정이 아니다. 최신 성공 조회 시각을 함께 보고 새로고침한다. 화면이 열려 있다는 이유로 기록을 주기적으로 갱신하거나 작업을 실행하지 않는다.

최근 독립 job 성공도 Scheduler 활성화의 증거는 아니다. API 서버 성공 기록이 최근 독립 작업 관측을 덮을 수 있으므로 heartbeat 하나로 과거 독립 실행 전체 이력을 판단하지 않는다. 실패 시 상품 재반영으로 해결하지 말고 기존 실행 오류·cursor·예약 회차와 연결 상태를 확인한다.

최초 운영은 다음 묶음으로 확인한다.

1. 기준의 상품군·검색·전문인/AI 지원/소비자 목적·유형·언어·주기를 검토하고 사용 여부를 명시한다. 예제 기준은 입력 초안이며 자동 활성화하지 않는다.
2. 좁은 상품군에서 후보 점검 → 상품 선택 → 근거·출처 등록 → 변경안 비교까지 진행한다. 후보 검색을 오류 확정으로 보지 않는다.
3. 실제 상품 수정이 필요한 경우 관리자가 승인한 항목만 선택 반영한다. 운영 검증용 가짜 상품·예약을 만들지 않는다. 반영과 설명서 갱신 검토 종료·게시를 구분한다.
4. 기준 버전·원문 충돌·근거 대기·보류·다음 점검일·상품별 이력 연결을 확인한다. 이 경로의 자동 전수 수정은 없다.

## 독립 실행 연결 계획 — 실행하지 않음

```sh
node scripts/operations/product-correction-execution-plan.mjs --help
node scripts/operations/product-correction-execution-plan.mjs --config /tmp/product-correction-plan.local.json
```

도구는 로컬 JSON만 읽으며 CLI·네트워크·DB·credential을 호출하지 않는다. 출력은 `PLAN_ONLY`, `applied:false`다. `--apply`를 지원하지 않는다. 결과는 검토용이며 그대로 적용하는 배포 명령이 아니다.

설정 필수 항목:

| 항목 | 값 |
|---|---|
| project / region / job | 기존 운영 프로젝트·리전, 이번 전용 Job 이름 |
| image | 같은 프로젝트·리전 Artifact Registry의 검증 완료 API 이미지 `@sha256:<64 hex>` |
| workerAccount / invokerAccount | 같은 프로젝트의 서로 다른 기존 전용 서비스 계정 |
| cloudSqlInstance | 같은 프로젝트·리전의 `project:region:instance` |
| database / username | 기존 실행 환경의 DB 이름·역할. 비밀번호 값 입력 금지 |
| passwordSecret | `{ "name": "기존-secret-이름", "version": "고정-숫자-버전" }` |
| intervalMinutes | 5, 10, 15, 20, 30, 60 중 선택; 한국시간 |
| maxSeconds / maxTicks | 1~600초 / 1~1000 tick |
| timeoutSeconds | 실행 예산+최소60초 이상, 최대3600초. 실제 page timeout·종료 여유를 더해 확인 |

비밀 값·임의 환경변수·태그 이미지·타 프로젝트 참조·추가 키를 거부한다. 실제 설정 파일과 생성 결과는 로컬에 두고 공개 저장소에 넣지 않는다. 오류 시 입력 내용은 출력하지 않는다.

계획은 worker entry 하나·task/parallelism1·자동 Job 재시도0·Cloud SQL socket·DB secret 참조·OAuth 인증 Scheduler와 필요한 IAM 범위를 제시한다. DB 내부 tick mutex와 committed cursor 복구를 재사용한다. 기존 migration job을 재사용하지 않는다. 이미지 존재·digest CI·IAM 실제 보유·DB 접속·비용·resource 제한은 오프라인 검증으로 확인할 수 없다.

## main 통합 이후 운영 담당 체크리스트

- 최종 main CI와 API 이미지 digest, 기존 Cloud SQL/secret/서비스 계정 및 예산을 확인한다. 자원 생성과 활성화는 별도 운영 단계다.
- 계획의 최소 접근 범위를 검토한다. invoker의 Job 단위 run.invoker, worker의 Cloud SQL 접속·해당 secret 접근 외에 Scheduler service agent의 OAuth token 권한도 기존 설정과 대조한다. Editor/Owner를 부여하지 않는다.
- Scheduler는 의도하지 않은 최초 실행이 발생하지 않는 생성·중지 절차를 확정한다. 계획 JSON이 예약을 중지시켜 준다고 가정하지 않는다. 운영 승인 전 활성화하지 않는다.
- 격리 환경에서 서버를 쉬게 한 뒤 예약 실행, 동시 중복 호출, 실패 후 재개, 강제 종료 후 committed cursor 복구를 검증한다. 최초 운영은 승인된 후보 점검만 실행하고 상품 반영·AI 호출은 하지 않는다.
- 실패 시 Scheduler 호출을 중지하고 Job 상태·최종 committed cursor·heartbeat를 확인한다. 진행 중 transaction의 완료/rollback을 확인한 뒤 재개한다. 이력·예약·상품을 삭제하지 않는다.
- 실제 계정 운영 검증은 SETUP.md의 비공개 테스트 계정 정본과 대상/정리 범위를 확인한 뒤 수행한다. 이번 합성 테스트가 실계정·휴면 실행 검증을 대체하지 않는다.
