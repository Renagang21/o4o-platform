# IR-O4O-PLAYWRIGHT-MCP-AND-TEST-ACCOUNT-SMOKE-BLOCKER-AUDIT-V1

> **조사 + 환경 정합성 확인 (Investigation).** 서비스 기능 코드/UI/API/DB 변경 없음.
> 허용 범위 내 로컬 전용 문서(`TEST-ACCOUNTS.local.md`, gitignored) 검증 노트만 정정.
> CLAUDE.md 앱 개발 규칙(조사 → 문제확정 → 최소 수정 → 검증 → 종료).

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 분류 | IR (Investigation) |
| 동기 | 직전 `CHECK-O4O-KCOSMETICS-STORE-HUB-LIVE-SMOKE-V1` 이 검증 환경 차단으로 CONDITIONAL PASS 종료 |
| 차단 요인 | (1) Playwright MCP 미로드 (2) K-Cosmetics store_owner 계정 미확보 |
| 결론(요약) | **(1) 설정 정상 — 세션 재시작이면 해결 / (2) 사용자 지적 일부 적중(비번 오기) + 일부 정정(cosmetics:store_owner 부재는 사실)** |

---

## 1. 전체 판정

**smoke 재실행 가능 (B→A 전환) — 단 store_owner *전용* 검증은 별도 RBAC 필요.**

- Playwright MCP 는 설치·설정·실행파일 모두 정상. 이번 세션 미로드는 **세션 시작 시점 미연결**일 뿐, 설정 결함 아님 → **세션 재시작 또는 MCP 재연결로 해결.**
- K-Cosmetics `/store` HUB live smoke 는 **`sohae2100` (operator-or-above)** 로 즉시 가능 (전 페이지 접근).
- 단 `cosmetics:store_owner` **전용** 권한 분기 검증은 해당 role 보유 계정이 없어 불가 (별도 RBAC WO).

---

## 2. Playwright MCP 상태

### 2.1 확인 결과

| 항목 | 결과 |
|------|------|
| node / npx | `C:\Program Files\nodejs` v24.12.0 / npx 정상 |
| pnpm | 10.27.0 |
| playwright | **1.57.0 설치됨** |
| `@playwright/mcp` | 캐시됨 (`mcp-0.0.75.tgz`), `@latest` resolve 정상 |
| 실행파일 동작 | `npx -y @playwright/mcp@latest --help` → **정상 출력, npm noise 0** (silent env 작동) |
| 이번 세션 tool 노출 | ❌ `mcp__playwright__*` 미로드 |

### 2.2 `~/.claude.json` 설정 (근본 원인 영역)

- 프로젝트 키가 **드라이브 문자 대소문자로 중복** 존재: `c:/Users/sohae/coding/o4o-platform` **및** `C:/Users/sohae/coding/o4o-platform` (각 1회).
- **두 키 모두** playwright MCP 등록 + `env.NPM_CONFIG_LOGLEVEL=silent` 포함:
  ```json
  {"type":"stdio","command":"npx","args":["-y","@playwright/mcp@latest"],
   "env":{"NPM_CONFIG_LOGLEVEL":"silent"}}
  ```
- 즉 과거 `feedback_claude_json_drive_case_split` 에서 진단된 처방(**양쪽 entry + silent env**)이 **이미 적용 완료**.
- workspace `.npmrc` 는 pnpm 전용 옵션 다수 보유(`node-linker=hoisted` 등)이나, `NPM_CONFIG_LOGLEVEL=silent` 가 stdout 오염을 차단 → 실행파일 probe 에서 **stderr/stdout noise 0 확인**.

### 2.3 원인 추정 (이번 세션 미로드)

설정·실행파일·stdout 청결성이 모두 정상이므로, 이번 세션 미로드는 **설정 결함이 아니라 세션 시작 시점에 MCP 가 연결되지 않은 상태**(예: 세션이 설정 확정 이전에 시작, 또는 첫 실행 npx cold-start 가 MCP init 타임아웃 초과)로 본다.

> ⚠️ 보조 메모: 본 IR 의 자체 node-spawn handshake probe 는 20초 무응답이었으나, 이는 **Windows `shell:true` + `npx.ps1/cmd` 래퍼의 stdin 파이핑 단절**이라는 *probe 하네스 아티팩트*다 (동일 명령 `--help` 는 정상 동작). Claude Code 의 MCP 클라이언트 실행 경로와 무관하므로 MCP 자체의 결함 근거가 아니다.

---

## 3. Playwright MCP 해결 방안

1. **즉시(권장): Claude Code 세션 재시작** → 설정이 이미 정상이므로 새 세션에서 `mcp__playwright__*` 노출 기대. (또는 `/mcp` 로 재연결 상태 확인.)
2. **간헐성 재발 방지(선택, 저위험 하드닝):** `args` 의 `@playwright/mcp@latest` → **버전 고정**(`@playwright/mcp@0.0.75`). `@latest` 는 매 기동 시 registry resolve 왕복이 있어 cold-start 변동성을 키운다. 고정 시 캐시 직행 → 기동 안정. (claude.json 양쪽 entry 동시 수정 필요. 본 IR 에서는 미적용 — 설정 변경이므로 사용자 확인 후.)
3. 문서: `feedback_claude_json_drive_case_split` 메모리는 유효. "처방 적용 완료 + 미로드 시 세션 재시작" 으로 갱신.

---

## 4. TEST-ACCOUNTS 확인 결과 (프로덕션 로그인 probe)

`POST https://api.neture.co.kr/api/v1/auth/login`, payload `{email, password, serviceKey:"k-cosmetics"}`.
(read-only 인증 검증 — CLAUDE.md §8 허용. 응답에서 role/code 만 추출, 비번/PII 미기록.)

| 계정 | 입력 비번 | status | code | k-cos membership | cosmetics:store_owner |
|------|-----------|:---:|------|:---:|:---:|
| `sohae2100` | `3Lz157727791!` (doc) | 200 | — | ✅ | ❌ (admin/operator/super_admin 보유) |
| `renagang21` | `seochuran1!` (**doc**) | **401** | INVALID_CREDENTIALS | — | — |
| `renagang21` | `3Lz157727791!` (**사용자 제시**) | **200** | — | ✅ | ❌ (`kpa:store_owner`·`glycopharm:store_owner`만) |

### 4.1 사용자 지적 검증

- ✅ **적중**: `renagang21` 실제 비밀번호는 `3Lz157727791!`. **문서의 `seochuran1!` 는 오기** → 정정함.
- ✅ **적중**: `renagang21` 은 K-Cosmetics **회원**이다 (membership 존재). 로그인 실패는 비번 문제였지 미가입이 아님.
- ❗ **정정**: 단, `renagang21` 은 `cosmetics:store_owner` role 을 **보유하지 않는다** (KPA/GlycoPharm store_owner 일 뿐). 따라서 "각 서비스 store_owner" 가 K-Cosmetics 에는 해당하지 않음.

### 4.2 serviceKey 오판 여부

- 로그인 serviceKey 는 `k-cosmetics` (membership 검증용, [AuthContext.tsx:98](../../services/web-k-cosmetics/src/contexts/AuthContext.tsx#L98)). role prefix 는 `cosmetics:`.
- 직전 CHECK 의 "store_owner 미확보" 는 **serviceKey 누락 오판이 아니라** 실제 `cosmetics:store_owner` role 부재가 원인 → 결론 자체는 유효, 단 "계정 미확보" 보다 "store_owner role 부재 + smoke 는 operator 로 가능" 이 정확.

---

## 5. K-Cosmetics store_owner 검증 가능 여부

`StoreOwnerGuard(serviceKey="cosmetics")` 통과 조건 ([StoreOwnerGuard.tsx:191-195](../../packages/store-ui-core/src/auth/StoreOwnerGuard.tsx#L191-L195)):
`hasDirectAccess = isOperatorOrAbove || isStoreOwnerByRole || isExtraRole || isStoreOwnerByMembership`

- cosmetics cfg: `membershipStoreOwnerRole: null` ([:70](../../packages/store-ui-core/src/auth/StoreOwnerGuard.tsx#L70)) → **membership 만으로는 통과 불가**.
- K-Cosmetics `StoreOwnerRoute` 는 `extraRoleMatcher`/`staleRecovery` 미주입 → `cosmetics:store_owner` role **또는** operator-or-above 만 통과.

| 계정 | `/store` 진입 | store_owner 전용 분기 검증 |
|------|:---:|:---:|
| `sohae2100` (operator/admin/super_admin) | ✅ | ❌ (operator 로 통과 — 순수 store_owner 경로 아님) |
| `renagang21` (cosmetics 회원, store_owner 아님) | ❌ | ❌ |

→ **전 페이지 smoke 는 `sohae2100` 로 가능. 순수 store_owner 전용 검증만 별도 RBAC 필요.**

---

## 6. 이전 CHECK 보고의 정정 사항

| 직전 CHECK 보고 | 본 IR 정정 |
|------------------|------------|
| "Playwright MCP 미가용 (도구 부재)" | 설정·실행 정상. 세션 미연결일 뿐 → **재시작이면 가용** |
| "K-Cosmetics store_owner 전용 계정 미확보 → CONDITIONAL" | `cosmetics:store_owner` role 보유 계정 부재는 **사실**이나, smoke 는 `sohae2100`(operator-or-above)로 **수행 가능** → 다음 회차는 CONDITIONAL 사유에서 "계정" 제거 |
| (renagang21 비번 언급 없음) | doc 비번 오기(`seochuran1!`→`3Lz157727791!`) 발견·정정 |

---

## 7. 코드 수정 여부

- **서비스 기능 코드/UI/API/DB 변경: 없음.**
- 문서만 수정: `docs/local/TEST-ACCOUNTS.local.md` (gitignored, 로컬 전용) — renagang21 비번 정정(3곳 + env 예시) + K-Cosmetics store_owner 부재 주의 블록 추가.
- 신규 IR 문서 생성: 본 파일.
- `~/.claude.json` 변경: **없음** (설정이 이미 정상 — §3-2 버전 고정은 제안만).

---

## 8. 후속 권장

1. **(즉시) Claude Code 세션 재시작 → `CHECK-O4O-KCOSMETICS-STORE-HUB-LIVE-SMOKE-V1` 재실행.**
   - store owner 화면군: **`sohae2100`** (operator-or-above 로 전 `/store/*` 접근).
   - operator forced-content: **`sohae2100`** (cosmetics:operator/admin).
2. (선택) `~/.claude.json` 양쪽 entry 의 `@playwright/mcp@latest` → `@0.0.75` 버전 고정으로 cold-start 안정화.
3. (선택) `cosmetics:store_owner` 전용 권한까지 검증하려면 테스트 계정에 해당 role 부여 — RBAC SSOT(`role_assignments`) 기반 별도 WO 승인 필요. (운영 DB write → 사용자 승인 필수.)

---

## 부록: 조사 산출물

- **서비스 코드 수정 없음.**
- 수정 문서: `docs/local/TEST-ACCOUNTS.local.md` (로컬 전용, commit 대상 아님)
- 생성 문서: 본 IR
- probe 방법: 프로덕션 `/api/v1/auth/login` read-only 호출(역할/코드만 추출), `npx @playwright/mcp --help` 실행, `~/.claude.json`·`.npmrc` 정적 분석
- commit/push: 미수행
