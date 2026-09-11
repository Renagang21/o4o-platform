# CHECK-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1

> WO: `WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1`
> 목적: cloud → Tool Router → Local Agent → Local SQLite → 결과 왕복을 닫아,
> `WO-O4O-LOCAL-DATA-SQLITE-V0` 이 만든 에이전트 측 Local Data Runtime 을 O4O AI 가
> 실제로 호출할 수 있는 로컬 업무 데이터 기반으로 승격한다.
> 상태: **PASS (자동 게이트·Windows 로컬 smoke 완료) / 프로덕션 실 PC smoke = 보류(§25·§26, 아래 12·13번)**
> 코드: `apps/api-server/src/services/ai-tools/ai-tool-contract.ts`(tool 3종 등재),
> `apps/api-server/src/services/ai-tools/ai-tool-router.ts`(결정적 라우팅·실행·렌더),
> `apps/api-server/src/services/local-agent/local-agent-protocol.ts`(action allowlist·arg 검증·출력 whitelist·error code),
> `tools/o4o-local-agent/src/handlers.mjs`(에이전트 측 재검증·데이터 핸들러),
> `apps/api-server/src/__tests__/local-data-bridge.spec.ts`(신규 19 테스트),
> `apps/api-server/src/__tests__/local-agent-runtime.spec.ts`·`computer-use.spec.ts`(allowlist 단언),
> `tools/o4o-local-agent/test/local-db.test.mjs`(arg 계약 테스트),
> `.github/workflows/ci-pipeline.yml`(agent node:test CI 배선, §22)

---

## 1. 배경 (왜)

`WO-O4O-LOCAL-DATA-SQLITE-V0` 은 매장 PC 의 Local Work Agent 안에 SQLite 런타임을 만들었지만,
그것은 **에이전트 안에만 존재하는 DB** 였다. cloud 의 O4O AI 가 그 데이터를 실제로 읽고 쓰려면
`Tool Router → Local Agent 명령 → 로컬 SQLite → 결과 반환` 배선이 있어야 한다. 이 WO 는 그 한
왕복을 닫되, **범용 자유 args·arbitrary SQL·arbitrary file access 를 만들지 않고** tool 별 좁은
structured args 만으로 닫는다.

## 2. 산출물 요약

| 구분 | 내용 |
|---|---|
| tool 3종 | `local.data.health`(readOnly) · `local.data.get_meta`(readOnly) · `local.data.set_setting`(write) |
| arg 계약 | health→none · get_meta→`{key}` · set_setting→`{key,value}` 만 (§6) |
| 전송 | 기존 one-shot arg 채널(Computer Use `result_data` ephemeral) 재사용 — **DB migration 0**(§7) |
| 검증 | 서버(local-agent-protocol) + 에이전트(handlers.mjs) **양측 재검증**(§14·§15) |
| 자동 테스트 | bridge spec 19 + agent node:test 18 + 기존 allowlist 단언 갱신 |

---

## 3. 항목별 검증 (14 items, §28)

| # | 검증 항목 | 근거 | 결과 |
|---|---|---|---|
| 1 | cloud 가 `local.data.*` tool 3종을 발행한다 (AI Tool Registry 등재·executionMode=local) | `ai-tool-contract.ts` AI_TOOL_NAMES 3개 + 3 registry def / bridge spec 10·11 | **PASS** |
| 2 | tool 별 좁은 structured args 만 전달 (health→none, get_meta→key, set_setting→key+value) | `ai-tool-router.ts` selectDataToolInvocation / bridge spec 5·6·7 | **PASS** |
| 3 | 범용 자유 args 없음 (`args: unknown`·arbitrary JSON 부재) | arg 계약 = 명시 필드만 / bridge spec 18 (server-agent cross-check) | **PASS** |
| 4 | arbitrary SQL 없음 (`execute_sql`/`query`/`raw` 미존재·거부) | allowlist 에 미등재 → `DENIED_UNKNOWN_ACTION` / smoke `execute_sql` DENY | **PASS** |
| 5 | arbitrary file access 없음 (`node:fs`/`node:child_process` 데이터 경로 부재) | bridge spec 18 소스 단언 (주석 제거 후) | **PASS** |
| 6 | set_setting key allowlist (locale·preferred_export_format·selected_source_profile) + per-key value schema | protocol `LOCAL_DATA_SETTING_KEYS`·`isValidLocalSettingValue` / handlers mirror / smoke locale=de DENY | **PASS** |
| 7 | get_meta key allowlist (비허용 키 → KEY_NOT_ALLOWED) | protocol·handlers `DATA_META_KEYS` / smoke local_db_id DENY = LOCAL_DATA_KEY_NOT_ALLOWED | **PASS** |
| 8 | 서버·에이전트 양측 검증 (§14·§15) | protocol validateData* + handlers validate* (독립 mirror allowlist) / bridge spec 18 | **PASS** |
| 9 | health 응답에 DB 경로 없음 (§19) | pickSafeDataInfo whitelist / bridge spec 1 / smoke LEAK(path)=false·LEAK(local.db)=false | **PASS** |
| 10 | get_meta 응답 = {key,value} (§19) | handlers dataGetMeta / bridge spec 2 / smoke {key:schema_version,value:"1"} | **PASS** |
| 11 | set_setting 응답에 value echo 없음 (§19) | 에이전트 {key,saved} 반환·렌더러 value 미출력 / bridge spec 3 / smoke {key,saved:true} | **PASS** |
| 12 | 안전 로그 필드만·setting value/DB path/raw/credential 미로그 (§20) | pickSafeDataInfo 출력 whitelist·router 로그 필드 / bridge spec 4 (dbPath·local_db_id·rawRows·credential strip) | **PASS** |
| 13 | error code 계약 (§21) 7종 매핑 | protocol LOCAL_AGENT_ERROR data codes / bridge spec 18-b failure render / smoke DENY 코드 | **PASS** |
| 14 | CI 에 agent node:test 배선 (§22) | `ci-pipeline.yml` "Run tests (o4o-local-agent node:test)" step (YAML 검증 통과) | **PASS** |

---

## 4. Windows 로컬 smoke (§24)

에이전트 `node --test` 18/18 통과가 §24 를 실질 충족하며, 추가로 `runAction` 직접 왕복 smoke 를 수행했다.

```text
health:                     {"status":"success","data":{"ok":true,"available":true,"schemaVersion":1,...}}
set_setting(locale=ko):     {"status":"success","data":{"key":"locale","saved":true}}
get_meta(schema_version):   {"status":"success","data":{"key":"schema_version","value":"1"}}
get_meta(local_db_id) DENY: {"status":"denied","errorCode":"LOCAL_DATA_KEY_NOT_ALLOWED"}
execute_sql DENY:           {"status":"denied","errorCode":"DENIED_UNKNOWN_ACTION"}
set_setting(locale=de) DENY:{"status":"denied","errorCode":"LOCAL_DATA_INVALID_ARGUMENT"}
LEAK(agent home path)? false
LEAK(local.db literal)? false
```

- positive 3종(health / set_setting / set→get_meta) 모두 성공, value echo 없음, DB 경로 누출 없음.
- negative(unknown key / arbitrary SQL / 잘못된 value) 모두 거부, 지정 error code 반환.

## 5. 자동 게이트 결과

| 게이트 | 명령 | 결과 |
|---|---|---|
| tsc | `tsc --noEmit -p apps/api-server/tsconfig.json` | **PASS (exit 0)** |
| jest | `jest local-data-bridge local-agent-runtime computer-use --maxWorkers=1` | **PASS (99/99)** |
| agent node:test | `node --test tools/o4o-local-agent/test/local-db.test.mjs` | **PASS (18/18)** |
| eslint | 변경 6개 소스 파일 | **PASS (exit 0)** |
| Windows smoke | `runAction` 직접 왕복 | **PASS (exit 0)** |

---

## 6. 보류 항목 (정직 보고)

| # | 항목 | 사유 |
|---|---|---|
| §25 | 프로덕션 실 PC + neture.co.kr 왕복 smoke (≥3) | 프로덕션에 페어링된 실 매장 PC agent 부재. CLAUDE.md STOP: 실제 계정·외부 서비스 승인 필요 |
| §26 | 프로덕션 negative smoke (unknown key/arbitrary SQL/file → deny) | 위와 동일 — 실 환경 인간 작업 단계 |

위 2건은 실 매장 PC 페어링 + 운영 승인 후 사람이 수행할 단계이며, 자동으로 대행하지 않는다.
코드·서버·에이전트 경로상 동일 거부 로직이 자동 테스트(bridge spec 18/18-b)·Windows smoke 에서
이미 검증되어 있으므로, 프로덕션 smoke 는 배선 정합의 **최종 확인**이지 미검증 위험이 아니다.

## 7. 계약 대비 편차 (deviation, 정직 보고)

| 항목 | WO 표기 | 구현 | 판단 |
|---|---|---|---|
| set_setting 응답 필드 | §19 `{updated}` | `{key, saved}` | 의미 동등(성공 flag) · value echo 없음 — §19 취지(값 미반환) 충족 |
| `LOCAL_DATA_TOOL_NOT_ALLOWED` (§21) | command errorCode | `assertToolAllowed` 단계 기존 `ToolDenyReason` 로 매핑 | tool 미허용은 명령 발행 이전 게이트에서 차단 — command errorCode 로 내려오지 않음 |

## 8. 결론

- 이 WO 의 3 목표(① cloud→agent `local.data.*` 발행 · ② tool 별 좁은 structured args · ③ 왕복+CI 검증)
  중 자동 검증 가능한 전부가 **PASS**.
- §25·§26 프로덕션 실 PC smoke 만 실 환경 승인 대기(보류).
- 완료 기준(§29) 자동 항목 충족 → `WO-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1` = **PASS**,
  `WO-O4O-LOCAL-DATA-SQLITE-V0` = **CLOSED** 로 판정(§30). 프로덕션 smoke 보류는 별도 후속 확인 항목으로 남긴다.
