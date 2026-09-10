# CHECK-O4O-LOCAL-AGENT-LNA-UX-CLOSURE-V1

> **WO**: `WO-O4O-LOCAL-AGENT-LNA-UX-CLOSURE-V1`
> **상태**: PASS
> **작성일**: 2026-09-10
> **선행**: `WO-O4O-LOCAL-WORK-AGENT-V0` = CLOSED · `WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1` = CLOSED
> **commit**: `734d4c130` (코드·테스트) · 본 문서

---

## 0. 한 줄 요약

`http://127.0.0.1` 로 나가는 fetch 가 실패하는 **세 가지 서로 다른 이유**를 브라우저가
전부 같은 `TypeError: Failed to fetch` 로 돌려주고 있었고, 화면은 그것을 언제나
"Agent 가 실행되고 있지 않습니다" 라고 읽었다. `navigator.permissions.query({ name:
'local-network-access' })` 가 원인을 가르는 근거가 된다는 것을 production Chrome 143
에서 확인하고, 그 근거 위에서 안내를 갈랐다. 근거가 없으면 확정하지 않는다.

---

## 1. Production 재현 결과 (§4)

`https://neture.co.kr` 에서 실제 Chrome(Playwright Chromium **143.0.7499.4**) 으로
loopback 요청을 세 상태에서 측정했다. `deadport` 는 아무도 듣지 않는 47999 포트다.

| 상태 | health@1500ms | health@10000ms | pair@10000ms | deadport |
|---|---|---|---|---|
| 권한 허용 + agent 실행 | **200** (13ms) | **200** (3ms) | 403 (7ms) | TypeError (2033ms) |
| 권한 미허용(prompt) + agent 실행 | TypeError (3ms) | TypeError (1ms) | TypeError (1ms) | TypeError (2015ms) |
| 권한 허용 + agent 종료 | AbortError (1512ms) | TypeError (527ms) | TypeError (261ms) | TypeError (2029ms) |

확인된 사실:

- **fetch rejection 여부** — 권한 미허용은 `TypeError: Failed to fetch` 다. agent 미실행도
  똑같은 `TypeError: Failed to fetch` 다. **예외 타입만으로는 구분되지 않는다.**
- **timeout 여부** — 권한 미허용은 timeout 이 아니다. **1~3ms 만에** 끝난다. 브라우저가
  연결을 시도조차 하지 않기 때문이다.
- **browser console 메시지** — 권한 미허용일 때만 나온다:
  `Access to fetch at 'http://127.0.0.1:47821/health' from origin 'https://neture.co.kr'`
  `has been blocked by CORS policy: Permission was denied for this request to access the`
  `` `unknown` address space ``
  원인은 여기 분명히 적혀 있지만 **페이지 JS 는 이 문자열을 읽을 수 없다.** 판정 근거로 못 쓴다.
- **permission prompt 노출 시점** — headless 에서는 대화상자가 뜨지 않고 즉시 거부된다.
  headed 에서 대화상자가 떠 있는 동안은 요청이 **보류**되어 timeout 으로 관측된다.
  이 보류 상태의 권한 값은 `prompt` 이므로 아래 판정에서 권한 안내로 간다 — 맞는 안내다.
- **network error type** — 세 상태 모두 `TypeError` 이거나 abort 다. 구분 정보가 없다.

**앞선 세션의 기록을 정정한다.** "LNA 차단 시 loopback fetch 가 조용히 멈춘다" 고
적혀 있었으나, 권한이 **거부**된 상태에서는 멈추지 않고 1~3ms 만에 실패한다.
멈추는 것은 권한 대화상자가 **떠 있는(pending)** 상태이고 이는 다른 상태다.

---

## 2. LNA 동작 확인 — 구분 가능한 범위 (§8)

결정적 신호를 하나 찾았다. **Chrome 143 은 권한 상태를 페이지에 알려준다.**

```
navigator.permissions.query({ name: 'local-network-access' })
  → 허용된 컨텍스트 : { state: 'granted' }
  → 기본 컨텍스트   : { state: 'prompt' }
```

이 API 는 **상태를 읽기만 한다.** 권한 대화상자를 열지 않고, 자동 승인하지 않으며,
Chrome 설정을 바꾸지 않는다 (§3 · §6 준수). 허용은 오직 사용자가 한다.

이 신호와 실패 모양을 곱해 판정한다 — `classifyLocalAgentFailure()` 한 곳에만 있다.

| 실패 모양 \ 권한 | `granted` | `prompt` · `denied` | `unknown` |
|---|---|---|---|
| 응답 없음(network) | **AGENT_NOT_RUNNING** | **PERMISSION_REQUIRED** | INDETERMINATE |
| timeout | INDETERMINATE | **PERMISSION_REQUIRED** | INDETERMINATE |
| 응답은 왔으나 비정상 | CONNECTION_FAILED | CONNECTION_FAILED | CONNECTION_FAILED |

**확정하지 않는 칸을 일부러 남겼다** (§8):

- 권한 상태를 모르면(`unknown` — Permissions API 부재) 아무것도 확정하지 않는다.
- 권한이 허용된 상태의 timeout 은 "꺼져 있다" 고 말하지 않는다. 느린 것일 수 있다.

두 경우 모두 중립 문구로 간다: **"Agent가 실행 중이 아니거나 브라우저 연결 권한이
필요합니다."**

한때 검토했다가 **버린 신호**: 실패까지 걸린 시간(권한 미허용 1~3ms vs agent 미실행
261~527ms). 재현 가능한 차이는 있지만 기기·부하에 따라 흔들리는 heuristic 이고,
§8 의 "억지로 확정하지 않는다" 에 어긋난다. 채택하지 않았다.

---

## 3. UX 변경 (§5 · §7)

`services/web-neture/src/api/localAgent.ts`

- `probeLocalAgent()` 가 `LocalAgentHealth | null` → `ProbeOutcome` (성공 또는 **이유가
  붙은 실패**) 를 돌려준다. 모든 실패를 `null` 로 뭉개던 `catch { return null }` 이 사라졌다.
- `queryLocalNetworkPermission()` — 권한 상태 읽기. 예외·미지원은 `unknown`.
- `classifyLocalAgentFailure()` — 순수 함수. 판정 규칙은 여기 한 곳뿐이다.
- `describeLocalAgentUnavailable()` — 원인 → 문구.
- `connectThisPc()` 의 `/pair` 실패도 같은 근거로 갈린다 (기존 `AGENT_UNREACHABLE` 대체).
- `PROBE_TIMEOUT_MS` 1500 → **3000**. 실측에서 첫 요청이 1512ms 에 abort 된 사례가 있었고,
  그 abort 를 "미실행" 으로 읽으면 오답이다.

`services/web-neture/src/components/mypage/LocalAgentCard.tsx`

- 상태 `absent`/`offline` 두 갈래를 **`unavailable` 한 갈래 + 원인 문구**로 바꿨다.
- 오류 상태에 **`[ 다시 연결 ]`** 버튼 (§7). 재관측과 연결을 한 번에 잇는다 —
  권한을 허용한 사용자가 버튼을 두 번 누르지 않아도 된다.
- 연결 실패 시 `health` 를 버린다. **실패한 1회용 nonce 로 다시 누를 수 있는 버튼을
  남기지 않는다.**

문구 (§5 원문 그대로):

| 원인 | 문구 |
|---|---|
| A · AGENT_NOT_RUNNING | Local Work Agent가 실행되고 있지 않습니다. Agent를 실행한 뒤 다시 연결해 주세요. |
| B · PERMISSION_REQUIRED | 브라우저에서 이 PC 연결 권한을 허용해 주세요. 권한을 허용한 뒤 다시 연결을 눌러 주세요. |
| C · CONNECTION_FAILED | 이 PC의 Local Work Agent에 연결할 수 없습니다. Agent 실행 상태를 확인한 뒤 다시 시도해 주세요. |
| 중립 · INDETERMINATE | Agent가 실행 중이 아니거나 브라우저 연결 권한이 필요합니다. Agent 실행 상태와 브라우저 연결 권한을 확인한 뒤 다시 연결해 주세요. |

**제거한 것**: `refresh()` 안의 `fetchLocalAgentDevices()` 호출. 서버가 이 계정의 PC 를
아는지 여부는 "설치 안 함 / 켜지 않음" 을 갈랐지만 **권한 문제는 전혀 가르지 못하고**,
두 갈래 모두 §5 의 A 문구로 수렴한다. 함수 자체는 남겨 두었다.

---

## 4. Retry 동작 (§7)

`[ 다시 연결 ]` → `refresh(autoPair = true)`:

1. health 재관측
2. 실패하면 → 새 원인으로 문구 갱신 (버튼 유지)
3. 성공 + 이미 연결됨 → `이 PC 연결됨`
4. 성공 + 미연결 → **곧바로 승인권 발급 + pair 까지 진행**

§13 Case D 에서 실측 확인: 권한 미허용 안내 → (사용자 허용) → `[ 다시 연결 ]` 한 번 →
`이 PC 연결됨`.

---

## 5. 보안 경계 (§6 · §9 · §10)

| 항목 | 값 | 확인 방법 |
|---|:---:|---|
| public inbound port | 0 | agent 미변경 · `local-agent-oneclick-pairing.spec.ts` 통과 |
| LAN bind | 0 | 동 spec: `server.listen(LOCAL_AGENT_PORT, '127.0.0.1'` · `.listen(` 1회 |
| wildcard CORS | 0 | 동 spec: `'Access-Control-Allow-Origin': '*'` 부재 · origin 은 https 만 |
| password storage | 0 | 프론트는 승인권만 다룬다 |
| browser cookie transfer | 0 | 모든 loopback 요청 `credentials: 'omit'` — 테스트가 전 호출 순회 단언 |
| shell execution | 0 | agent 미변경 · 동 spec: `child_process`·`exec(`·`spawn(`·`eval(` 부재 |
| file access | 0 | agent 미변경 · 동 spec: `node:fs` 부재 |
| 브라우저 permission dialog 자동 클릭 | 0 | `permissions.query` 만 호출 · `request` 미호출을 테스트가 단언 |
| Chrome 설정 · OS 정책 · registry · enterprise policy 변경 | 0 | 변경 파일 5개 전부 `services/web-neture/**` |

**Local Agent 구조 미변경 (§9)**: `tools/o4o-local-agent/**` 커밋 변경 0건. health/status
응답 보강도 하지 않았다 — 필요가 없었다. 판정 근거는 브라우저 쪽에 있었다.

---

## 6. 테스트 (§12)

`services/web-neture/src/components/mypage/__tests__/LocalAgentCard.lna.test.tsx` — 12 tests, **전부 PASS**.

카드를 **실제로 렌더링**하고 브라우저 경계 두 곳(`fetch` · `navigator.permissions`)만
mock 한다. 판정 · 문구 선택 · 재시도는 실제 코드가 수행한다.

| §12 항목 | 테스트 | 결과 |
|---|---|---|
| 1. agent 실행 + 권한 허용 → connected | `1. agent 실행 + 권한 허용 → 연결된다` | PASS |
| 2. agent 미실행 → 올바른 안내 | `2. agent 미실행(권한은 허용됨) → Agent 실행 안내가 나온다` | PASS |
| 3. 권한 미허용 → 권한/중립 안내 | `3. 권한 미허용 …` · `3-b. denied …` | PASS |
| 4. retry → 성공 | `4. 권한을 허용한 뒤 [ 다시 연결 ] …` | PASS |
| 5. 원인 불명 → 일반 안내 | `5. 원인을 알 수 없는 localhost 실패 …` · `5-b. 비정상 응답 …` | PASS |
| 6. 기존 connected 회귀 0 | `6. 이미 연결된 PC 는 그대로 …` | PASS |
| 7. pairing grant replay 회귀 0 | `실패해도 1회용 nonce 를 재사용하지 않는다` + api-server spec | PASS |
| 8. origin validation 회귀 0 | api-server `local-agent-oneclick-pairing.spec.ts` (실제 서버 기동) | PASS |

추가 2건: loopback 요청의 `credentials: 'omit'`·고정 origin 전수 단언 / 권한 조회가
읽기 전용임(`request` 미호출) 단언.

검증 명령과 결과:

```
npx vitest run --config services/web-neture/vitest.config.mjs   → 12 passed (12)
cd apps/api-server && jest local-agent --maxWorkers=1           → 245 suites / 4053 tests passed
cd services/web-neture && tsc --noEmit -p tsconfig.json         → 변경 파일 오류 0
eslint (변경 3파일)                                              → 0
```

`tsc` 는 저장소 전체로는 38건이 나오지만 **전부 이번 변경과 무관한 기존 오류**다
(30건 TS2307 = `@o4o/*` dist 부재 · 8건 TS7006 = 그 결과의 implicit any).
변경한 3개 파일에서 나온 오류는 **0건**이다.

테스트 의존성은 **루트에 이미 설치된 vitest / jsdom / @testing-library** 를 쓴다.
`services/web-neture/package.json` · lockfile 은 변경하지 않았다.
`tsconfig.json` 에는 테스트 파일 `exclude` 만 추가했다 — 앱 빌드가 루트 전용
테스트 의존성을 타입 해석하려다 실패하는 것을 막는다.

---

## 7. Production smoke (§13)

`https://neture.co.kr/mypage/settings` · 실제 Windows PC · Chrome 143 · 배포 `734d4c130`
(deploy-web-services run `34439964518` = success).

| 케이스 | 조건 | 화면 | 판정 |
|---|---|---|---|
| **A** | Agent 실행 + 권한 허용 (미연결에서 시작) | `[ 이 PC 연결 ]` → **이 PC 연결됨 / 이 PC 가 연결되었습니다.** | **PASS** |
| **B** | Agent 종료 | **Local Work Agent가 실행되고 있지 않습니다. Agent를 실행한 뒤 다시 연결해 주세요.** + `[ 다시 연결 ]` | **PASS** |
| **C** | Agent 실행 + 권한 미허용 | **브라우저에서 이 PC 연결 권한을 허용해 주세요. 권한을 허용한 뒤 다시 연결을 눌러 주세요.** + `[ 다시 연결 ]` | **PASS** |
| **D** | C 상태에서 권한 허용 → `[ 다시 연결 ]` | **이 PC 연결됨** | **PASS** |

**C 가 이 WO 의 핵심이다.** 같은 시각 agent 로그는 살아 있었다:

```
[o4o-agent] 2026-09-10T05:16:56.832Z 연결 대기 창구 http://127.0.0.1:47821 (loopback 전용)
[o4o-agent] 2026-09-10T05:16:56.979Z 연결되었습니다.
```

이전 코드였다면 이 상태에서 "Agent 가 실행되고 있지 않습니다" 가 떴을 것이다.
켜져 있는 프로그램을 다시 켜라는 안내였다. 이제는 권한 안내가 뜬다.

A 의 pairing 은 사용자가 **코드를 하나도 입력하지 않고** 완료됐다 (입력 UI 부재는
api-server spec 이 `<input` 부재로 단언).

---

## 8. 회귀 (§16)

| 항목 | 결과 | 근거 |
|---|:---:|---|
| ONE-CLICK PAIRING REGRESSION | **0** | smoke A · D 에서 실제 pairing 성립 · api-server spec 4053 tests PASS |
| SECURITY REGRESSION | **0** | §5 표 · agent 파일 변경 0건 |
| 기존 connected 상태 | **정상** | smoke B 직전 관측 · 단위 테스트 6 |

---

## 9. Known limitations

1. **`local-network-access` 권한 조회는 Chromium 계열 전제다.** 이 이름을 모르는
   브라우저에서는 `unknown` → 중립 문구로 간다. V1 대상은 Chrome on Windows 이고
   (§11), Firefox/Safari 는 범위 밖이다. 다만 그 브라우저에서도 **틀린 안내는 하지
   않는다** — 확정을 포기할 뿐이다.
2. **권한이 허용된 상태의 timeout 은 원인을 못 가른다.** 중립 문구로 간다.
   느린 PC 와 응답하지 않는 agent 를 in-page 신호로 가를 방법을 찾지 못했다.
3. **`prompt` 와 `denied` 를 같은 문구로 안내한다.** 사용자가 할 일(브라우저에서
   허용)이 같기 때문이다. `denied` 는 주소창 자물쇠에서 되돌려야 하지만, 그 경로를
   문구에 넣으면 대다수인 `prompt` 사용자에게 혼란이 된다.
4. **이 서비스의 vitest 는 아직 CI 에 연결돼 있지 않다.** `services/**` 를 실행하는
   step 이 `ci-pipeline.yml` 에 없다. 연결하려면 workflow 수정이 필요한데 이는
   CLAUDE.md 중지 조건("Docker · CI · build 인프라 변경")이라 **손대지 않았다.**
   승인되면 기존 package-level step 과 같은 형태 한 줄이면 된다:
   `npx vitest run --config services/web-neture/vitest.config.mjs`
5. **smoke A 에서 이전 deviceId 의 device row 가 서버에 남는다.** 미연결 상태를
   만들기 위해 로컬 `credentials.json` 을 지웠고, agent 는 새 UUID 로 다시 연결했다.
   기능에 영향은 없으나 목록에 유령 항목이 하나 늘어난다. 연결 해제 UI 는 이번
   범위 밖이다.
6. **console 의 CORS 메시지는 원인을 정확히 말해 주지만 페이지 JS 가 읽을 수 없다.**
   더 정확한 판정을 원한다면 이 정보가 스크립트에 노출돼야 하는데, 그것은 브라우저
   쪽 사정이고 O4O 가 할 수 있는 일이 아니다.

---

## 10. Commit

| SHA | 내용 |
|---|---|
| `734d4c130` | `fix(neture): Local Agent 연결 실패 원인을 구분해 안내` |

변경 파일 (전부 `services/web-neture/**`):

| 파일 | 변경 |
|---|---|
| `src/api/localAgent.ts` | 원인 구분 · 권한 조회 · 문구 매핑 |
| `src/components/mypage/LocalAgentCard.tsx` | 원인별 안내 · `[ 다시 연결 ]` · nonce 재사용 차단 |
| `src/components/mypage/__tests__/LocalAgentCard.lna.test.tsx` | 신규 · 12 tests |
| `vitest.config.mjs` | 신규 · 루트 vitest 사용 (의존성 추가 없음) |
| `tsconfig.json` | 테스트 파일 exclude |

`tools/o4o-local-agent/**` · `apps/api-server/**` 변경 **0건**.
