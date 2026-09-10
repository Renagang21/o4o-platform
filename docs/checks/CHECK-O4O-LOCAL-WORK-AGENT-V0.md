# CHECK-O4O-LOCAL-WORK-AGENT-V0

> **WO**: `WO-O4O-LOCAL-WORK-AGENT-V0`
> **작업일**: 2026-09-10
> **상태**: 구현 완료 · 서버측 검증 PASS · 프로덕션 smoke 미실행(배포 후)
> **범위**: O4O AI ↔ 사용자 로컬 PC 사이의 **최소 Local Execution Runtime V0**

---

## 1. 이번 V0 가 만든 것 / 만들지 않은 것

이번 작업의 목적은 약국 프로그램 자동조작이 **아니다.** 연결 · 인증 · 명령 · 허용목록 ·
왕복 실행이라는 **기반 계약**을 production 수준에서 먼저 고정하는 것이다.

| 만든 것 | 만들지 않은 것 |
|---|---|
| pairing → device 등록 (5분 · 1회용) | 사용자가 복사·붙여넣는 장기 API key |
| 기기 자격증명 → 단명 세션 토큰 | user password 저장 · JWT refresh 재사용 · 쿠키 복사 |
| outbound 명령 큐 + 결과 회수 왕복 | cloud → PC inbound 접속 · 포트 포워딩 |
| allowlist 2개 (read-only) | 임의 shell · 임의 파일 · 레지스트리 · 브라우저 · 데스크톱 제어 |
| AI Tool 2개 (server 1 · local 1) | `local.read` / `local.write` / `browser` / `desktop` capability |
| Windows 전용 zero-dependency agent | GUI · 설치 프로그램 · 서비스 등록 · 자동 업데이트 |

---

## 2. §50 STOP 조건 census — 해당 없음

WO §50 이 열거한 중지 조건을 착수 전에 전수 확인했다.

| STOP 조건 | 실측 | 판정 |
|---|---|---|
| 기존 Local Agent 계층과 충돌 | Electron · Tauri · local-agent · computer-use 코드 **0건** | 충돌 없음 |
| 별도 신규 identity system 필요 | 기존 `users.id` 에 device 를 매다는 구조로 충족 | 불필요 |
| browser computer use 필요 | V0 tool 2개 모두 불필요 | 불필요 |
| 약국 프로그램 접근 필요 | V0 범위 밖 | 불필요 |
| 임의 shell 불가피 | `os.arch()` · `os.release()` 로 충족 | 불필요 |
| PC inbound port 필요 | outbound 폴링으로 충족 | 불필요 |
| 민감정보 저장 필요 | 저장 필드가 전부 비민감 | 불필요 |

**→ STOP 조건 0건. 계속 진행함.**

기존 device pairing 구조도 저장소에 없었다. `ws` 는 의존성으로만 존재하고 **마운트된
WebSocket 서버가 없다** — 이것이 3번 transport 판단의 근거다.

---

## 3. Transport 판단 — 왜 WebSocket 이 아니라 HTTPS 폴링인가

| 후보 | 판정 |
|---|---|
| cloud → PC 직접 접속 | **불가.** §16 금지. 포트 개방·공인 IP 를 사용자에게 요구하게 된다 |
| WebSocket 상시 연결 | **보류.** 저장소에 마운트된 WS 서버가 없고, Cloud Run 에서 장수 연결을 유지하려면 별도 인프라 판단이 필요하다 (WO 범위 밖) |
| **outbound HTTPS 폴링** | **채택.** 기존 인프라(Express + Cloud Run) 재사용, NAT·방화벽 무관, 추가 인프라 0 |

agent 가 5초마다 `POST /heartbeat` 로 찾아와 "살아 있다 + 할 일 있나" 를 한 번에 묻는다.
endpoint 를 늘리지 않으면서 생존 신호와 명령 배달을 동시에 해결한다.

---

## 4. 두 tool 의 executionMode 가 다른 이유 (설계 판단)

WO 는 tool 2개를 요구했지만, **둘의 실행 위치를 다르게 잡았다.** 근거를 남긴다.

| Tool | executionMode | 근거 |
|---|---|---|
| `local.get_agent_status` | **`server`** | 답(등록됐나 · 마지막 heartbeat 언제인가)이 **전부 서버 DB 에 있다.** "깨어 있니?" 를 묻기 위해 PC 를 깨우는 것은 무의미하고, 무엇보다 **PC 가 꺼져 있을 때에도 답할 수 있어야** §41 의 "연결되어 있지 않습니다" UX 가 성립한다 |
| `local.get_system_info` | `local` | 실제 PC 에서만 알 수 있는 값. **왕복 계약을 실제로 소진하는 것은 이쪽 하나다** |

즉 tool 1 은 "연결 상태 조회", tool 2 는 "왕복 실행 검증" 으로 역할이 갈린다.
tool 1 을 `local` 로 두었다면 offline 일 때 상태를 답할 방법이 사라진다.

---

## 5. agent 를 `tools/` 에 둔 이유 (배치 판단)

`pnpm-workspace.yaml` 의 glob 은 `apps/*` · `packages/*` · `packages/@o4o-apps/*` ·
`services/*` 다. agent 를 `apps/` 아래 두면 **workspace 로 잡혀 lockfile 변경이 발생**하고,
이는 CLAUDE.md 중지 조건(`package.json` · lockfile · dependency 변경)에 해당한다.

`tools/o4o-local-agent/` 는 어느 glob 에도 걸리지 않는다. agent 는 의존성이 0개이므로
install 대상이 될 필요도 없다.

**→ lockfile 변경 0건. `package.json` 변경 0건.**

---

## 6. 변경 파일

### 서버 (신규)

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/services/local-agent/local-agent-protocol.ts` | 프로토콜 계약 · allowlist · 안전 필드 화이트리스트 |
| `apps/api-server/src/services/local-agent/local-agent-service.ts` | pairing · 세션 · device 선택 · 명령 큐 · 결과 회수 (서버측 SSOT) |
| `apps/api-server/src/routes/local-agent.routes.ts` | 6 endpoint (사용자 축 2 · agent 축 4) |
| `apps/api-server/src/database/migrations/20270402000000-CreateLocalAgentTables.ts` | 4 테이블 |
| `apps/api-server/src/__tests__/local-agent-runtime.spec.ts` | §43 계약 테스트 |

### 서버 (수정)

| 파일 | 변경 |
|---|---|
| `.../ai-tools/ai-tool-contract.ts` | capability 2 · tool 2 추가, `EXECUTABLE_MODES` 게이트(`browser` 제외) |
| `.../ai-tools/ai-tool-router.ts` | executor 2 · 로컬 의도 인식 · §41 렌더링 |
| `.../routes/ai-proxy.routes.ts` | `/home-chat` 에서 로컬 의도일 때만 device 상태 파생 |
| `.../bootstrap/register-routes.ts` | `/api/local-agent` 등록 |
| `.../__tests__/ai-capability-tool-routing.spec.ts` | local tool 추가에 따른 기존 단언 3건 갱신 (아래 12번) |

### Agent (신규 · `tools/o4o-local-agent/`)

| 파일 | 역할 |
|---|---|
| `src/handlers.mjs` | PC 측 allowlist. **`node:os` 만 import** |
| `src/credentials.mjs` | 자격증명 저장. agent 에서 `fs` 를 쓰는 **유일한** 파일 |
| `src/index.mjs` | `pair` / `run` 진입점. outbound HTTPS 전용 |
| `README.md` | 사용자 설명 — 무엇을 못 하는지 · 무엇을 보내는지 |

---

## 7. 데이터 모델 (4 테이블)

| 테이블 | 보관 | 보관하지 않음 |
|---|---|---|
| `local_agent_devices` | userId · 표시이름 · platform · 버전 · **credential 해시** | credential 원문 · hostname · MAC · IP |
| `local_agent_pairings` | **code 해시** · 만료 · 소모 시각 | code 원문 |
| `local_agent_sessions` | **token 해시** · 만료 | token 원문 |
| `local_agent_commands` | commandId · action · status · 시각 | **`args` 컬럼이 없다** · 결과는 회수 즉시 NULL |

`local_agent_commands` 에 **`args` 컬럼을 두지 않은 것은 의도적이다.** 명령에 실을 내용이
없으므로 명령이 곧 action 이름이고, 저장할 인자도 없다.

`deviceId` 는 서버가 만든 random UUID 다 (§10). MAC · 디스크 시리얼 · CPU id 에서
파생하지 않는다. agent 를 재설치하면 새 device 가 되는 편이 하드웨어를 식별해 두는 것보다 낫다.

---

## 8. 보안 메커니즘

| 요구 | 구현 |
|---|---|
| pairing 단명 · 1회용 (§12) | TTL 5분 + `WHERE id=$1 AND consumed_at IS NULL RETURNING id` 조건부 UPDATE. 동시 요청 중 **정확히 하나만** row 를 받는다 |
| 자격증명 평문 미보관 (§13) | 전부 SHA-256 해시만 저장. 비교는 `timingSafeEqual` |
| client 주장 불신 (§14) | 세션 토큰 → `(deviceId, userId)` 가 **모든 agent 요청의 유일한 신원 출처.** 요청 본문의 deviceId 는 읽지 않는다 |
| replay 방어 (§18) | `WHERE ... status IN ('pending','delivered')` 조건부 UPDATE. **종결 상태가 곧 잠금이다** — 별도 nonce 테이블이 필요 없다 |
| 만료 방어 (§18) | timeout 시 명령을 `expired` 로 못박아 **뒤늦게 도착한 결과가 쓰이지 못하게** 한다 |
| 정보 최소화 (§21·§36) | `pickSafeSystemInfo` 가 **두 번** 실행된다 — 저장 직전(`submitCommandResult`)과 프롬프트 직전(`executeGetLocalSystemInfo`). 변조된 agent 도 추가 필드를 밀어 넣지 못한다 |
| 결과 미보존 (§37) | 회수 즉시 `result_data = NULL`. 감사에는 commandId · action · status · 시각만 남는다 |
| 다중 기기 (§33) | online 이 2대 이상이면 `ambiguous` → capability 미부여. **임의로 한 대를 고르지 않는다** |
| 이중 allowlist (§29) | 서버 `isAllowedLocalAction` + PC `HANDLERS`. 서버가 침해돼도 PC 가 마지막 방어선 |

### 이중 allowlist 가 "정책" 이 아니라 "구조" 인 이유

`tools/o4o-local-agent/src/handlers.mjs` 는 `node:os` 하나만 import 한다.
`child_process` 도 `fs` 도 없다. 즉 shell 실행과 파일 접근이 **금지되어 있는 게 아니라
가능하지 않다.** 정책은 우회할 수 있지만 없는 코드는 우회할 수 없다.

프로토콜 쪽도 같다 — `LocalCommand.args` 의 타입이 `Record<string, never>` 이므로
**명령 문자열을 실을 필드가 타입 레벨에서 존재하지 않는다.**

---

## 9. Endpoint (6개 · 두 인증 축)

| Endpoint | 인증 | 용도 |
|---|---|---|
| `POST /api/local-agent/pair` | 사용자 JWT | 1회용 코드 발급 (코드는 로그에 남기지 않는다) |
| `GET /api/local-agent/devices` | 사용자 JWT | 연결된 PC 목록 |
| `POST /api/local-agent/register` | **없음** — 코드 자체가 자격 | device 등록 + credential 발급 |
| `POST /api/local-agent/connect` | credential | 단명 세션 토큰 |
| `POST /api/local-agent/heartbeat` | 세션 토큰 | 생존 신고 **겸** 명령 수령 |
| `POST /api/local-agent/result` | 세션 토큰 | 결과 제출 (거부 시 200 아닌 **409**) |

agent 경로는 사용자 JWT 를 쓰지 않는다. agent 는 사용자의 로그인 토큰을 본 적도,
가질 수도 없다 (§13).

---

## 10. AI 통합

`/home-chat` 은 **로컬 의도가 감지될 때만** `resolveTargetDevice` 를 호출한다.
평범한 대화가 device 테이블을 건드리지 않게 하기 위해서다.

capability 는 서버가 매 요청 파생한다 — 클라이언트가 `localAgentStatus` 를 보내도 읽지 않는다.

**§41 미연결 UX**: 연결이 없으면 프롬프트에 다음이 들어간다.

```
- 현재 이 PC 의 Local Work Agent 가 연결되어 있지 않습니다.
- PC 의 실제 상태·파일·프로그램 정보는 확인할 수 없습니다. 추측해서 답하지 마세요.
```

다중 기기일 때는 "임의로 한 대를 고르지 마세요" 가 명시된다.

### 한글 의도 인식 — 번들 회귀 방지

직전 WO(`WO-O4O-AI-CAPABILITY-TOOL-ROUTING-V0`, commit `a2203886f`)에서 확인된
production 결함이 있다. **`tsup charset: 'ascii'` 는 문자열 리터럴은 이스케이프하지만
정규식 리터럴은 그대로 둔다** → 한글 정규식이 번들 후 매칭에 실패한다.

이번에 추가한 한글 키워드는 **처음부터** `\uXXXX` 이스케이프 문자열 + 공백 제거
`includes()` 로 작성했고, 소스가 ASCII 로 유지되는지 테스트가 지킨다.

---

## 11. 검증 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| type-check | `tsc --noEmit` | **이번 WO 파일 오류 0건**. 잔여 219건은 전부 미빌드 workspace 패키지(`@o4o/*` · `@o4o-apps/*`)의 TS2307 계열 기존 오류 |
| 단위 테스트 (신규) | `jest local-agent-runtime` | **PASS** |
| 전체 테스트 | `jest` | **243 suites / 3,971 tests 전부 PASS · 회귀 0건** |
| lint | `eslint` (변경 파일) | **오류 0건** |
| 프로덕션 번들 | `tsup` (dist/main.js 7.80 MB) | **PASS** — 아래 11-1 참조 |
| agent 문법 | `node --check src/*.mjs` | **3개 파일 PASS** |
| lockfile | `git status` | **변경 0건** |

### 11-1. 번들 검증 — 한글 키워드 11개 전수 생존

직전 WO 의 production 결함(한글 정규식이 번들 후 죽음)이 재발하지 않았는지를
**소스가 아니라 실제 산출물 `dist/main.js` 에서** 확인했다.

```
LOCAL_INTENT_KEYWORDS_KO  7개 → 전부 \uXXXX 로 이스케이프되어 생존
SYSTEM_INFO_KEYWORDS_KO   4개 → 전부 생존
BUNDLE KEYWORD CHECK: PASS
```

번들 결과물의 실제 모양:

```js
var LOCAL_INTENT_KEYWORDS_KO = [
  "\uB0B4PC", "\uC774PC", "\uC81CPC", "\uB0B4\uCEF4\uD4E8\uD130", ...
];
```

**문자열 리터럴은 esbuild 가 안전하게 이스케이프한다.** 정규식 리터럴이었다면 한글이
그대로 남아 깨졌을 것이다 — 이번 코드가 처음부터 `includes()` 를 쓴 이유다.

`tsup.config.ts` 에 `charset` 설정이 없다(= esbuild 기본값 `ascii`). 즉 **이 저장소에서
비ASCII 정규식 리터럴은 앞으로도 위험하다.** 보류된 `WO-O4O-API-BUNDLE-NONASCII-REGEX-CENSUS-V1`
이 다룰 영역이며, 이번 WO 는 신규 코드가 그 함정을 밟지 않게 하는 데까지만 한다.

### 11-2. 범위 밖 발견 — `build:deps` 목록 누락 (수정하지 않음)

신규 worktree 에서 `pnpm run build:api:full` 이 실패했다. 원인은 이번 변경이 아니라
`apps/api-server` 의 `build:deps` 체인에 **실제로 import 하는 워크스페이스 패키지 7개가
빠져 있는 것**이다.

```
@o4o/content-editor   (@o4o/utils 가 의존)
@o4o/security-core
@o4o/market-trial
@o4o/platform-core
@o4o/asset-copy-core
@o4o/ai-core
@o4o-apps/digital-signage-core
```

기존 체크아웃에서는 이들의 `dist/` 가 과거 빌드로 이미 존재해 **결함이 드러나지 않는다.**
이번엔 해당 패키지를 먼저 빌드해 번들을 완성했고, **`package.json` 은 수정하지 않았다**
(범위 밖 · CLAUDE.md 중지 조건). 별도 WO 로 제안한다.

### §43 테스트 항목 대응

신규 spec 30개 테스트가 §43 의 20개 요구를 덮는다.

| # | 요구 | 대응 |
|:--:|---|---|
| 1~3 | pairing 성공 · 무효/만료 거부 · 소유권 | 7 tests (코드/credential 평문 미저장 포함) |
| 4~6 | agent 인증 · heartbeat · offline 판정 | 8 tests (해지 시 세션 동시 무력화 포함) |
| 7~8 | local tool 허용 · capability 없으면 차단 | 4 tests |
| 9~12 | 왕복 · unknown action 거부 · replay · 만료 | 7 tests |
| 13 | timeout 정규화 | 1 test (늦게 온 결과 무효 포함) |
| 14 | 다중 기기 ambiguity | 2 tests |
| 15~16 | 임의 shell 불가 · 임의 파일 접근 불가 | 5 tests (import 목록 · 타입 · 프로토콜 필드 단언) |
| 17~18 | 위조 무효 · secret 유출 0 | 4 tests (변조 agent 의 추가 필드 차단 포함) |
| 19~20 | Tool Routing 회귀 0 · Home AI 회귀 0 | 9 tests + 기존 spec 전량 PASS |

---

## 12. 기존 테스트 단언 3건을 갱신한 근거

local tool 이 추가되면서 **기존 spec 의 "server 만 존재한다" 류 단언이 사실과 어긋나게** 됐다.
숨기지 않고 명시한다.

| 기존 단언 | 갱신 후 | 근거 |
|---|---|---|
| `registry 의 executionMode 는 전부 'server'` | `'server' \| 'local'` 허용 + **`browser` 는 0** 을 명시 | WO 가 요구한 것은 "server 만" 이 아니라 §22·§24 의 "browser·write 없음" 이다 |
| `home scope 에서 tool 은 workscope 1개` | 매장 tool 미노출 + status tool 노출 + **system-info tool 미노출** | 인증만으로 "PC 연결됐나" 는 답할 수 있고, 실제 PC 를 깨우는 tool 은 여전히 닫혀 있다 |
| `deriveAiCapabilities` 정확 목록 2건 | `READ_ONLY_LOCAL_AGENT_STATUS` 추가 | 위와 같은 이유 |

**단언을 약화한 것이 아니라 보호 대상을 정확히 다시 지목한 것이다.** browser tool 0 ·
write tool 0 · 미연결 시 local tool 차단은 모두 그대로 유지되며, 오히려 명시적으로 늘었다.

---

## 13. TypeScript narrowing 주의 (재발 방지 메모)

`apps/api-server` 는 `strictNullChecks: false` 다. 이 설정에서는
**boolean 리터럴 판별자(`ok: true | false`)의 부정 좁히기가 동작하지 않는다.**

```ts
if (!outcome.ok) { outcome.reason }      // ❌ TS2339
if (outcome.ok === false) { outcome.reason }  // ✅
```

`if (outcome.ok) {...} else {...}` 의 else 절도 좁혀지지 않는다. 이 저장소에서
discriminated union 결과 타입을 다룰 때는 **`=== false`** 를 쓴다.

---

## 14. 미실행 항목 (숨기지 않고 기록)

| 항목 | 상태 | 사유 |
|---|---|---|
| §44 Windows 로컬 smoke A~E | **미실행** | 실제 PC 연결 smoke 는 배포된 API 가 필요하다. 배포 후 수행 |
| §45 프로덕션 smoke | **미실행** | 같음 |
| CI 결과 | **미확인** | push 후 확인 |
| migration 프로덕션 실행 | **미실행** | main 배포 시 CI/CD 자동 실행 (PRODUCTION-MIGRATION-STANDARD) |

**배포 전 이 WO 를 CLOSED 로 선언하지 않는다.**

---

## 15. §47 보안 리뷰 — 8개 항목 명시 확인

| 확인 항목 | 결과 | 근거 |
|---|:--:|---|
| no inbound PC port | ✅ | agent 에 listen 코드 없음. 전 통신이 agent → cloud outbound |
| no arbitrary shell | ✅ | `child_process` import 0건 (서버·agent 양쪽). allowlist 2개 전부 `os` 조회 |
| no arbitrary file access | ✅ | `fs` 는 `credentials.mjs` 의 `credentials.json` 한 경로. handler 에 전달되지 않음 |
| no browser control | ✅ | browser capability·tool 미정의. `EXECUTABLE_MODES` 가 `browser` 를 실행 대상에서 제외 |
| no patient data | ✅ | 전송 필드 5개(`osName` · `osVersion` · `architecture` · `agentVersion` · `deviceName`) 전부 비민감. 화이트리스트 이중 적용 |
| no credential reuse | ✅ | password · JWT · refresh token · 쿠키 사용 0. 기기 전용 credential → 단명 세션 토큰 |
| no client capability trust | ✅ | capability 는 서버가 매 요청 파생. 요청 본문의 상태 필드를 읽는 경로 0 |
| no AI direct agent access | ✅ | AI 는 tool 을 고를 뿐. 명령 발행은 서버가 `isAllowedLocalAction` 통과 후에만 수행하고, action 은 서버 상수에서 나온다 |

---

## 16. 다음 단계 (이번 WO 범위 밖)

1. **배포 후 §44·§45 smoke** — 실제 Windows PC 연결 · 왕복 · unknown action 거부 · offline 감지
2. **연결 UI** — 현재는 `POST /pair` API 만 있고 화면이 없다. "이 PC 연결" 버튼과 코드 표시
3. **device 해지 UI** — 백엔드는 `status` 컬럼으로 준비되어 있으나 해지 endpoint·화면 미구현
4. 그 다음에야 실제 파일·약국 프로그램 연동을 논의할 수 있다

---

## 17. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

기준 문서(`docs/baseline/` · `docs/architecture/` · `docs/rules/`)에서 낡거나 어긋난 서술은 발견하지 않았다. 별도 WO 제안 1건은 문서가 아니라 빌드 스크립트 결함이다 (위 11-2).
