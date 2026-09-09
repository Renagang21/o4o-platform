# CHECK-O4O-AI-CAPABILITY-TOOL-ROUTING-V0

- **WO**: WO-O4O-AI-CAPABILITY-TOOL-ROUTING-V0
- **일자**: 2026-09-09
- **선행**: COMMON-HOME-PHASE1 · WORK-SCOPE-V0 · STORE-RESOLUTION-V0 · HOME-AI-INPUT-V0 (전부 CLOSED)
  · MULTI-PROVIDER-RUNTIME-V0 (NOT CLOSED — OpenAI quota 잔여. 런타임은 ESTABLISHED 라 차단 아님)
- **작업 브랜치**: `work/ai-capability-tool-routing-v0` (AI 전용 worktree `C:/tmp/o4o-work-scope`)
- **범위**: capability → tool 자격 → 안전한 실행 경계. read-only tool 2개. Local Agent·브라우저 실행 없음.

---

## 1. 기존 capability 구조 조사

**이름이 "capability" 인 축이 이미 둘 있었고, 둘 다 tool 자격 판정에 쓸 수 없다.**

| 축 | 실체 | 저장 | tool 자격에 쓸 수 있나 |
|---|---|---|---|
| `@o4o/capabilities` `StoreCapability` | **매장 기능 등재부** — `B2C_COMMERCE`/`TABLET`/`KIOSK`/`SIGNAGE`/`QR_MARKETING`/`POP_PRINT`/`BLOG`/`LIBRARY`/`AI_CONTENT`/`LOCAL_PRODUCTS` | `store_capabilities(organization_id, capability_key, enabled, source)` | ❌ **매장 단위 entitlement 다.** "이 매장이 태블릿 기능을 켰는가" 이지 "이 사용자가 무엇을 할 자격이 있는가" 가 아니다 |
| `WorkScope.capabilities` | 프런트 **서술용** — `navigate\|read\|draft\|local_read\|local_write\|browser` | 없음 (클라이언트가 계산해 전송) | ❌ 그 계약이 "인가 판정에 쓰지 않는다" 고 **명시**하고, 클라이언트발이라 신뢰 대상이 아니다 |

근거:
- `packages/capabilities/src/registry.ts:12` `StoreCapability`, `apps/api-server/src/modules/store-core/services/store-capability.service.ts:19` `StoreCapabilityService` (헤더: "매장(Store) 단위 기능 활성화/비활성화 관리", `isEnabled(organizationId, capability)`)
- `services/web-neture/src/lib/work-scope/types.ts:99-106` — "V0 capability — **서술(descriptor)이지 권한이 아니다** … 인가 판정에 이 값을 쓰지 않는다"
- 서버는 실제로 클라이언트 capability 를 판정에 쓰지 않는다: `apps/api-server/src/routes/ai-proxy.routes.ts` 는 이를 프롬프트 서술로만 싣는다.

**실제 인가 SSOT** 는 `role_assignments`(F9) + `service_memberships` + store 해석이며,
그 셋을 이미 조합한 것이 `resolveWorkScopeStore()` 다.

## 2. 기존 AI / tool·action 구조 조사

**LLM tool/function calling 은 저장소에 존재하지 않는다.**

- `packages/ai-core/src/orchestration/types.ts:105-114` — provider 계약이 `complete(systemPrompt, userPrompt, config)` 뿐. `AIProviderConfig`(`:93-102`)에 tools 필드 없음.
- gemini/openai adapter 모두 요청 body 에 `tools`/`tool_choice` 를 싣지 않고, gemini 파서는 `parts[0].text` 만 읽어 **`functionCall` 파트가 오면 조용히 버린다**.

이름이 비슷하지만 tool 시스템이 **아닌** 것들:

| 대상 | 실체 |
|---|---|
| `ACTION_KEYS` (`ai-core/orchestration/action-keys.ts:12`) | Hub 버튼·감사 로그용 **문자열 상수 SSOT** (`asset.copy.cms` 등). 파라미터·스키마·핸들러 없음 |
| `mapActions` (`action-mapper.ts`) | AI 추천 문구를 한국어 부분일치로 Hub 트리거에 붙이는 **후처리 매퍼**. 헤더에 "AI는 실행하지 않는다" 명시 |
| `common/action-queue` `ExecuteHandler` · `POST /actions/execute/:actionId` | 운영자 대시보드용 **쓰기 액션** 실행기 (승인 처리, 읽음 표시 등) |
| `platform-hub.controller.ts` `TRIGGER_WHITELIST` | cross-service **트리거 프록시** (쓰기 계열) |
| `packages/action-log-core` | **감사 로그 sink** — `ActionLog` 엔티티에 row 를 쓴다 |

→ 앞의 셋은 **쓰기 액션** 축이라 read-only 컨텍스트 tool 인 이번 V0 의 재사용 대상이 아니다.
→ `action-log-core` 는 tool 호출 로깅에 쓸 수 있었으나 **DB row 를 쓴다.** §24(DB write 0)·§27(새 usage DB 금지)에 걸려 **사용하지 않았다.** 로깅은 `logger` 로만 한다.

## 3. canonical 결정

§7 은 "기존 canonical capability 가 있으면 그것을 우선한다" 였다. **조사 결과 동등물이 없다**(§1).
그래서 §7 의 권장 이름을 그대로 쓰되, **새 권한 체계가 되지 않도록** 다음을 지켰다.

```text
AiCapability = READ_ONLY_AI_CONTEXT | READ_ONLY_STORE_CONTEXT   (2개뿐)

저장 0 · DB 테이블 0 · grant 절차 0 · 관리 화면 0
→ 기존 인가 사실(session · membership · role_assignments · store resolution)의
  **서버측 투영(projection)** 일 뿐이다.
```

파생 규칙은 의도적으로 단순하다. 복잡해지는 순간이 "새 권한 체계" 가 되는 지점이다.

```text
인증됨                      → READ_ONLY_AI_CONTEXT
store 가 resolved + org 확정 → READ_ONLY_STORE_CONTEXT
  (none / ambiguous 는 부여하지 않는다 — ambiguous 에서 임의 매장을 고르지 않는
   STORE-RESOLUTION-V0 계약을 그대로 승계)
```

쓰기·로컬·브라우저 capability 는 **이름조차 정의하지 않았다.** 미리 만들어 두면
"있으니 곧 열어도 된다" 는 압력이 생긴다(§22·§23).

세 축의 관계 정리:

```text
StoreCapability      → tool 의 *결과 데이터* (어떤 매장 기능이 켜져 있는지)
WorkScope.capabilities → 판정에 쓰지 않음 (프런트 서술)
AiCapability          → tool 자격 판정 (유일)
```

## 4. Tool Registry contract

`apps/api-server/src/services/ai-tools/ai-tool-contract.ts`

```ts
interface AiToolDefinition {
  name: string;                         // '{domain}.{action}' — 기존 ACTION_KEYS 점 표기 관행
  description: string;
  requiredCapabilities: AiCapabilityKey[];
  executionMode: 'server' | 'local' | 'browser';   // V0 registry 에는 server 만 등록
  readOnly: boolean;                                // V0 registry 는 read-only 만
}
```

등록된 tool 2개 (§8):

| name | capability | mode | readOnly |
|---|---|:---:|:---:|
| `workscope.get_context` | `READ_ONLY_AI_CONTEXT` | server | ✅ |
| `store.get_context` | `READ_ONLY_STORE_CONTEXT` | server | ✅ |

`local`/`browser` 는 **타입에만 남긴 계약 자리**다(§21). registry 에 그 값을 가진 tool 이 없고,
`resolveAvailableTools`/`assertToolAllowed` 가 `executionMode !== 'server'` 를 후보에서 제외한다 —
누가 나중에 실수로 등록해도 실행 후보가 되지 않는다.

## 5. eligibility logic

```ts
resolveAvailableTools(ctx) → AiToolDefinition[]   // 모델에게 보여줄 목록
assertToolAllowed(name, ctx) → { allowed, tool?, reason? }   // 실행 직전 최종 판정
```

**이중 차단(§13)**: 자격 없는 tool 은 ① 목록에 노출하지 않고 ② 실행 직전에 또 막는다.
둘 중 하나만 하지 않았다.

deny 사유 코드: `UNKNOWN_TOOL` · `CAPABILITY_MISSING` · `NOT_READ_ONLY` ·
`EXECUTION_MODE_NOT_ALLOWED` · `INVALID_ARGUMENTS`.

## 6. server revalidation (§14)

```text
요청 → 인증 세션(userId)
     → resolveWorkScopeStore()로 membership·매장 재확정   ← 클라이언트 workScope 아님
     → VerifiedToolContext 구성 (서버 사실만)
     → capability 파생
     → eligibility
     → 인자 검증
     → executor
```

`VerifiedToolContext` 에는 클라이언트발 값이 **들어가지 않는다.** 라우트는 클라이언트
workScope 에서 `workspace`/`serviceKey` 힌트만 취하고, 매장은 서버가 다시 확정한다.
모델이 tool 이름이나 인자를 만들었다는 이유로 실행하지 않는다.

## 7. 실제 V0 tools

**`workscope.get_context`** — workspace / serviceKey / storeResolved / capabilities.
식별자(userId·organizationId·storeId) **미반환**. DB 조회 0.

**`store.get_context`** — 확정된 매장에서 **활성화된 기능 라벨 목록**.
기존 `store_capabilities` 를 read-only SELECT 로 읽어 `getCapabilityLabel()` 로 라벨화한다.
새 테이블을 만들지 않는다.

반환하지 **않는** 것: UUID · 사업자번호 · 주소 · 대표자 · 전화번호 · 조직명,
그리고 처방 · 환자 · 보험청구 · 개인정보 계열 일체 — 해당 테이블을 **애초에 조회하지 않는다**(§8·§23).

### 인자를 받지 않는다 (§15)

```text
금지:  get_store_context({ storeId: '<모델/클라이언트가 준 UUID>' })
채택:  get_store_context({})  → 서버가 세션에서 매장 확정
```

`validateToolArguments()` 는 **빈 객체만** 허용한다. `{storeId}`·`{organizationId}`·
배열·원시값은 전부 `INVALID_ARGUMENTS` 다. 식별자를 넘기려는 시도가 구조적으로 막힌다.

## 8. provider integration 방식 — §19-B (deterministic pre-tool)

**provider-native function calling 을 쓰지 않았다.** 이유는 선택이 아니라 구조다:

`AIProvider.complete(systemPrompt, userPrompt, config)` 에 tools 인자가 없고
`AIProviderConfig` 에도 tools 필드가 없다. native tool calling 을 하려면
**F1 Frozen 인 `@o4o/ai-core` 의 provider 인터페이스와 `AIProviderResponse` 를 구조 변경**해야 한다.
§19 가 "과도한 변경이면 B 로 닫아도 된다" 고 했고 §20 이 agent loop 를 금지하므로 B 로 갔다.

```text
요청 → 서버 scope 재확정 → 결정론적 tool 선택(최대 1개)
     → 서버에서 tool 실행 → 결과를 요약 문장으로 프롬프트에 주입
     → LLM 1회 호출 → 텍스트 응답
```

- **agent loop 0** — tool 실행은 요청당 최대 1회. 모델 응답을 보고 다시 tool 을 부르지 않는다.
- tool 계약은 **provider 중립**이라(§11) 나중에 native function calling 을 붙일 때 adapter 가 변환만 하면 된다.
- 선택은 결정론적이다(§12): 매장 지시어(`내 매장`/`우리 약국`/`my store` …) **그리고** 자격 통과일 때만 매장 tool 을 고른다. 자격이 없으면 tool 을 고르지 않고 그대로 텍스트 응답으로 간다.

## 9. security boundaries (§16)

| 원칙 | 구현 |
|---|---|
| client storeId/organizationId 불신 | 인자 자체를 받지 않는다. 서버가 세션에서 확정 |
| client capability 불신 | `VerifiedToolContext` 에 클라이언트 값이 들어가지 않는다 |
| AI-generated permission 불신 | 등록부 없는 이름 = `UNKNOWN_TOOL`. capability 재확인 후에만 실행 |
| cross-service leakage 0 | 매장 후보는 `resolveWorkScopeStore` 가 serviceKey 로 스코프. `ambiguous`/`none` 이면 tool 미부여 |
| internal UUID 출력 최소화 | 두 tool 모두 UUID 미반환. 프롬프트에도 식별자 미주입 |
| provider 직접 실행 금지 | provider 는 텍스트만 만든다. DB·브라우저·로컬 경로가 존재하지 않는다 |
| 민감 데이터 | executor 가 해당 테이블을 조회하지 않는다 |

프롬프트 주입도 구조체가 아니라 **사람이 읽는 요약 한두 줄**이다(§17).

## 10. tests

`apps/api-server/src/__tests__/ai-capability-tool-routing.spec.ts` — **23건 PASS** (LLM·실DB 없음).

| §25 | 케이스 | 결과 |
|---|---|---|
| 1 | capability 있음 → tool available | PASS |
| 2 | capability 없음 → 목록에서 숨김 **+** 실행 단계 차단 | PASS |
| 3 | store resolved → store tool 가능, 확정 org 로만 조회 | PASS |
| 4 | store `none`/`ambiguous` → 차단, **DB 질의 0건** | PASS |
| 5 | cross-service leakage 0 (미확정 시 질의 자체 없음) | PASS |
| 6 | 위조 storeId/organizationId 인자 → `INVALID_ARGUMENTS` | PASS |
| 7 | 클라이언트발 capability 가 판정에 닿지 않음 | PASS |
| 8 | 등록부 밖 이름(`local.file_read`·`browser.navigate` 등) 차단 | PASS |
| 9 | 인자 스키마 검증 (배열·원시값·비어있지 않은 객체 거부) | PASS |
| 10 | executor SQL 이 SELECT 전용, write 키워드 0 | PASS |
| — | registry 전체가 server·read-only 임을 고정 | PASS |
| — | resolved 인데 org 없는 반쪽 상태 → capability 미부여 | PASS |
| — | tool 결과가 구조체가 아닌 요약 문장으로 변환됨 | PASS |

회귀 동시 실행(§25-11): `home-chat-ai-input` · `ai-multi-provider-runtime` ·
`work-scope-store-resolution` · `security/ai-orchestration`
→ **5 suites / 111 tests PASS**.

§25-12(OpenAI quota 가 테스트를 막지 않음): 신규 테스트는 LLM 을 호출하지 않으므로 quota 무관하다. 확인됨.

```text
apps/api-server  npx tsc --noEmit  → 내 파일 오류 0 (잔여 61 = 기존 baseline)
eslint (신규·변경 4파일)            → PASS (0)
```

> 구현 중 발견: 이 저장소는 `strictNullChecks: false` 라 **discriminated union narrowing 이 동작하지 않는다.**
> 처음 작성한 union 형태(`{allowed:true}|{allowed:false;reason}`)가 호출부에서 TS2339 를 냈다.
> 저장소 설정에 맞춰 optional field 를 가진 평평한 interface 로 바꿨다(런타임 형상 동일).

## 11. production smoke — Case A PASS · Case B 결함 발견·수정 후 재확인 대기

배포: `Deploy API Server` success (`ec84246ea`) · CodeQL success. 서빙 revision 이 해당 커밋을 포함함을
응답 필드(`tool`/`toolOutcome` 키 존재)로 확인했다.

| Case | 요청 | 결과 | 판정 |
|:-:|---|---|:---:|
| A | 일반 질문(`약국 POP 기본 원칙…`) | 200 · `tool=null` · 정상 텍스트 | ✅ PASS |
| B | `내 매장 기준으로 …` (store resolved 계정) | 200 · **`tool=null`** — 한글 지시어 미매칭 | ❌ 결함 |
| B′ | `List the features available in my store` (동일 계정) | 200 · **`tool=store.get_context`** · `outcome=allowed` | ✅ PASS |
| C | store 미확정 경로 | 자격 미부여로 tool 미선택 (§10 테스트로 고정, 프로덕션은 B′ 대비군) | ✅ |

### Case B 결함 — 한글 정규식 리터럴이 번들 후 매칭되지 않는다

**capability/eligibility/실행 체인 자체는 정상이었다.** 같은 계정·같은 배포에서 영어 지시어(B′)는
tool 을 정확히 선택·실행했고, 모델 답변이 `renderToolContext` 의 한글 출력
("현재 매장에서 활성화된 기능이 없습니다.")과 **글자 그대로 일치**했다.
즉 한글 **문자열**은 모델까지 정상 전달됐고, 한글 **정규식**만 죽었다.

로컬 jest(.ts 직접 실행)에서는 한글 패턴이 통과한다. 차이는 번들링뿐이다 —
esbuild 기본 `charset: 'ascii'` 는 문자열 리터럴의 비-ASCII 를 `\uXXXX` 로 이스케이프하지만
**정규식 리터럴은 그렇게 하지 못한다**(`apps/api-server/tsup.config.ts` 에 `charset` 미지정).

수정(커밋 `a2203886f`): 한글 의도 키워드를 정규식에서 빼고 `\uXXXX` 이스케이프 문자열 +
`includes()` 로 바꿔 **소스를 순수 ASCII 로** 유지한다. 비교 전 공백을 제거해
"내 매장"/"내매장"/"내  매장" 변형을 함께 흡수한다. 영어 패턴은 ASCII 라 정규식 그대로 둔다.
회귀 고정: 선언부가 한글 없이 유지되는지 + (주석 제외) 정규식 리터럴에 한글이 재유입되지 않는지 검사.

> **이 부류는 로컬 테스트로 잡히지 않는다.** 프로덕션 smoke 를 실제로 돌렸기 때문에 드러났다.

### 관측 사실 — 테스트 계정 매장의 활성 기능이 0개

B′ 에서 tool 은 정상 실행됐으나 `store_capabilities` 에 enabled 행이 없어
`enabledFeatureCount: 0` 을 반환했다. **계약은 동작하고 데이터가 비어 있는 상태**다
(도구 결함 아님). 기능이 등록된 매장 계정으로는 목록이 채워진다.

### 남은 검증 (배포 완료 후 1회)

```text
a2203886f 배포 완료 → Case B 한글 재호출
기대: tool=store.get_context · outcome=allowed
```

Case A / B′ 는 이미 PASS 이므로 이 1건만 확인하면 §26 이 닫힌다.

## 12. DB migration / write

```text
DB migration      0
DB write          0   (executor 는 SELECT 전용 — 테스트로 고정)
신규 테이블        0   (tool registry 는 코드 상수)
신규 usage DB      0   (action-log-core 미사용 — DB row 를 쓰기 때문)
공통 package 변경  0   (packages/** 무변경)
신규 dependency    0
```

`jest.config.cjs` 에 `@o4o/capabilities` → src 매핑 1줄 추가(테스트 인프라 정렬,
기존 security-core/ai-core 등과 동일 패턴). 프로덕션 동작 무관.

## 13. known limitations

1. **provider-native function calling 없음** — 모델이 스스로 tool 을 고르지 않는다. 선택은 서버의 결정론적 규칙(한국어/영어 매장 지시어 패턴)이다. 패턴 밖 표현("저희 가게는…")은 tool 을 트리거하지 않고 일반 텍스트 응답으로 간다.
2. **tool 2개뿐이고 둘 다 read-only** — 쓰기 tool 은 의도적으로 없다.
3. **`store.get_context` 는 매장 *기능 목록* 만** 준다. 주문·재고·매출 같은 운영 데이터는 포함하지 않는다.
4. **Neture 에서는 매장 tool 이 열리지 않는다** — Neture 는 organization 미연결 서비스라 `storeStatus` 가 `STORE_IDENTITY_NOT_SUPPORTED`(none) 이다. 매장 tool 은 KPA/K-Cos/PharmacyHub 계열에서만 성립한다(STORE-RESOLUTION-V0 기록 그대로).
5. **tool 호출이 DB 에 남지 않는다** — §24/§27 준수의 대가다. 사용량·감사 추적이 필요해지면 `action-log-core` 도입을 별도로 결정해야 한다.
6. **Local/Browser 는 타입 슬롯만** — 실행 경로 0, grant 0.
7. **비-ASCII 정규식 리터럴은 이 저장소의 api-server 번들에서 안전하지 않다** (§11 실측).
   슬러그 생성 계열에 같은 형태가 남아 있다 — `services/forum/ForumRequestService.ts:26`,
   `services/store/store-pop.service.ts:80`, `services/store/store-blog.service.ts:60`,
   `services/store/store-local-products.service.ts:69`.
   **검증하지 않았다** — 한글 슬러그가 그동안 정상 동작해온 정황이 있어, 문자 *범위*(`가-힣`)는
   리터럴 시퀀스와 다르게 살아남을 가능성이 있다. 범위 밖이라 손대지 않았고 확인 대상으로만 남긴다.
   근본 해결은 `apps/api-server/tsup.config.ts` 에 `charset: 'utf8'` 지정이나, build 인프라
   변경이라 별도 판단이 필요하다(§30 · CLAUDE.md 중지 조건).

## 14. 후속 단계

1. **Local Work Agent V0** — 이번에 만든 `executionMode: 'local'` 슬롯 위에서 설계. capability/eligibility/재검증 골격을 그대로 재사용할 수 있다.
2. **provider-native function calling** — ai-core provider 인터페이스에 tools 를 추가하는 **구조 변경**이라 F1 Frozen 해제 WO 가 선행돼야 한다. 그때 이번 `AiToolDefinition` → provider schema 변환 adapter 를 붙인다.
3. **쓰기 tool** — 기존 `action-queue` `ExecuteHandler` / `TRIGGER_WHITELIST` 가 이미 쓰기 실행기라 그 위에 capability 를 얹는 형태가 자연스럽다. 승인·감사(action-log-core)가 동반돼야 한다.
4. **tool 호출 감사 로깅** — 위 §13-5.
5. **비-ASCII 정규식 리터럴 전수 점검 + `tsup charset` 결정** — 위 §13-7. 슬러그 생성 계열 4곳 확인 필요.
5. **OpenAI quota closure** — 직전 WO 잔여(별도 운영 후속).

## 15. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- `docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md` — AI 실행 인프라 서술에 provider 다변화(직전 WO)와 tool routing(이번 WO)이 아직 반영돼 있지 않다. 기준 문서의 내용 변경은 §16-4 상 인라인 금지라 **보고만** 한다.

## 16. 완료 기준 대조 (WO §29)

| 기준 | 결과 |
|---|---|
| CAPABILITY CONTRACT = ESTABLISHED | 충족 |
| TOOL REGISTRY = ESTABLISHED | 충족 (2 tools, server·read-only) |
| TOOL ELIGIBILITY = PASS | 충족 (이중 차단) |
| SERVER REVALIDATION = PASS | 충족 |
| READ-ONLY TOOL = PRODUCTION PASS | **부분** — 영어 경로 PASS(tool 실행 실증). 한글 경로는 번들 결함 수정 후 재확인 대기. §11 |
| CROSS-SERVICE LEAK = 0 | 충족 |
| DB MIGRATION = 0 | 충족 |
| DB WRITE = 0 | 충족 |
| AGENT LOOP = 0 | 충족 (요청당 최대 1회) |
| LOCAL EXECUTION = 0 | 충족 |
| BROWSER EXECUTION = 0 | 충족 |
| tests / type-check / build / CI | 충족 — 4 suites / 86 tests PASS · type-check 내 파일 0 · eslint 0 |
| production smoke | **부분** — Case A·B′ PASS / Case B(한글) 재확인 1건 잔여. §11 |
| CHECK 작성 · commit/push | 충족 |
