# WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1 — CHECK

- **작업일**: 2026-08-27
- **시작 commit**: `e21ae63bc` (local main) / 작업 중 `origin/main = c2b7eb505` 로 선행 이동
- **선행 WO**: [missing·dangling 폐쇄](WO-O4O-REGISTRY-AUDIT-MISSING-AND-DANGLING-CLOSURE-V1-CHECK.md) ·
  [generator canonicalization](WO-O4O-REGISTRY-AUDIT-GENERATOR-CANONICALIZATION-V1-CHECK.md)
- **판정**: SSOT = **`CANONICAL_SINGLE_REGISTRY`** / 잔여 2건 = **`AUDIT_FALSE_POSITIVE`**
- **§19 경우 판정**: **E — audit 만 잘못됐다.** runtime 코드 변경 0
- **DB schema change 0 / migration 0 / production write 0 / production 조회 0**

---

## 0. 한 문장 결론

> shortcode 의 SSOT 는 `packages/shortcodes/src/registry.ts` 의 **`globalRegistry`
> 단일 `DefaultShortcodeRegistry` 인스턴스**이며, renderer 와 editor 가 모두 그
> 인스턴스만 조회한다. audit 의 canonical key 는 **runtime resolver 가 조회하는
> key**(= 정의에 선언된 `name:`)이고, **파일 존재는 등록 근거가 아니다.**

UNKNOWN 0건. §28 중지 조건 해당 없음.

---

## 1. 등록 방식 3축 census (§4)

| 방식 | 정의 파일 | registry 접근 | caller | runtime reachable | 판정 |
|---|---|---|---|---|---|
| object registry (`registerShortcode({name:…})`) | `packages/shortcodes/src/auth/index.ts` | `globalRegistry` | **0** | ❌ | `DEAD_INITIALIZER` |
| identifier registry (`registerShortcode(<def>)`) | `packages/shortcodes/src/preset/index.ts` | `globalRegistry` | bootstrap | ✅ | LIVE |
| dynamic `import().then(register)` | `packages/shortcodes/src/dynamic/index.ts` | 인자로 받은 registry | bootstrap | ✅ | LIVE |
| `import.meta.glob` + `registerLazyShortcode` | `apps/admin-dashboard/src/utils/shortcode-loader.ts` | `globalRegistry` | `App.tsx` | ✅ (등록 결과 0) | LIVE·EMPTY |
| plain component map `adminShortcodes` | `…/components/shortcodes/admin/index.ts` | 없음 | **0** | ❌ | `DEAD_REGISTRY` |
| `metadata.ts` | `packages/shortcodes/src/metadata.ts` | 없음 | 문서·AI | ❌ | 문서(registry 아님) |

**선언 token 14건 — 미분류 0.**

| token | 정의 파일 | 등록 |
|---|---|:--:|
| `preset` | `packages/shortcodes/src/preset/index.ts` | ✅ |
| `cpt_list` · `cpt_field` · `acf_field` · `meta_field` | `packages/shortcodes/src/dynamic/*.tsx` | ✅ |
| `social_login` · `login_form` · `oauth_login` | `packages/shortcodes/src/auth/index.ts` | ❌ `DEAD_INITIALIZER` |
| `product` · `product_grid` · `add_to_cart` · `product_carousel` · `featured_products` · `product_categories` | `apps/admin-dashboard/src/components/shortcodes/productShortcodes.tsx` | ❌ `UNMOUNTED_DEFINITION_BUNDLE` |

---

## 2. Runtime bootstrap call graph (§5)

```text
apps/admin-dashboard/src/main.tsx
  └ globalRegistry 를 window.__shortcodeRegistry 로 노출만 (등록 0)

apps/admin-dashboard/src/App.tsx:23
  └ import '@/utils/register-dynamic-shortcodes'      ← side-effect import
        └ register-dynamic-shortcodes.ts:18  registerDynamicShortcodes()  ← 모듈 자기호출
              ├ registerDynamic(globalRegistry)   → cpt_list · cpt_field · acf_field · meta_field
              └ registerPresetShortcode()         → preset

apps/admin-dashboard/src/App.tsx:116,123
  └ await import('@/utils/shortcode-loader') → loadShortcodes() → 등록 0 (§5-1)
```

| registration 함수 | DEFINED | EXPORTED | IMPORTED | CALLED | RUNTIME_REACHABLE |
|---|:--:|:--:|:--:|:--:|:--:|
| `registerDynamicShortcodes` (package) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `registerPresetShortcode` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `loadShortcodes` | ✅ | ✅ | ✅ | ✅ | ✅ (등록 결과 0) |
| **`registerAuthShortcodes`** | ✅ | ✅ | **0** | **0** | ❌ |

**shortcode 를 bootstrap 하는 앱은 admin-dashboard 하나뿐이다** — "runtime bootstrap 이
서비스별로 다름" 중지 조건 해당 없음.

---

## 3. Registry SSOT 후보 (§6)

| 후보 | write | read | renderer | editor | 판정 |
|---|---|---|:--:|:--:|---|
| `globalRegistry` (`registry.ts`) | 3개 initializer | `get` · `getAll` | ✅ | ✅ | **SSOT** |
| `services/ai/shortcode-registry.ts` | `metadata.ts` 파생 | AI 프롬프트 | ❌ | ❌ | `DERIVED_REGISTRY` |
| `metadata.ts` | 수기 | 문서·AI | ❌ | ❌ | `DIVERGENT_REGISTRY` (문서 전용) |
| `ShortcodeReference.tsx` · `pages/documentation/Shortcodes.tsx` | 하드코딩 | 화면 안내 | ❌ | ❌ | `DUPLICATED_REGISTRY` (문서 전용) |
| `adminShortcodes` map | 하드코딩 | **없음** | ❌ | ❌ | `DEAD_REGISTRY` |

`DefaultShortcodeRegistry` 인스턴스 생성은 소스 전체에서 **1회**뿐이다(계약 테스트로 고정).

---

## 4. Renderer lookup 경로 (§7)

```text
content → defaultParser.parse() → globalRegistry.get(name) → definition.component
```

| 질문 | 답 |
|---|---|
| registry 에 없으면? | `console.warn` 후 unknown 처리 |
| fallback registry? | **없다** |
| lookup 시점 lazy load? | **없다** (lazy 는 등록 시점에 `lazy(loader)` 로 감싼다) |
| unknown 출력 | `UnknownShortcodeComponent` 또는 원문(`fullMatch`) 그대로 |
| error? | throw 하지 않는다 |

`packages/block-renderer/.../ShortcodeBlock.tsx` 는 `[{name}] not found` 를 그린다.

---

## 5. Editor/Admin lookup 경로 (§8)

| 경로 | 조회 대상 | 판정 |
|---|---|---|
| `admin-dashboard/.../editor/blocks/ShortcodeBlock.tsx` | `getAllShortcodes()` = `globalRegistry` | **`SAME_SSOT`** |
| 같은 파일의 `SHORTCODE_TEMPLATES` | 하드코딩 (삽입 편의) | 삽입 전용 · lookup 아님 |
| `services/ai/shortcode-registry.ts` | `metadata.ts` | `DERIVED_FROM_SSOT` 아님 → `DERIVED_REGISTRY`(문서 축) |
| `ShortcodeReference.tsx` | 하드코딩 | `DUPLICATED_REGISTRY` |

**renderer 와 editor 는 같은 registry 를 쓴다.** 분기 없음.

### 5-1. Lazy loader 실제 계약 (§12) — 코드로 증명

```text
glob                        = ../components/shortcodes/**/index.{ts,tsx}
matched files               = 1   (apps/admin-dashboard/src/components/shortcodes/admin/index.ts)
files with ShortcodeDefinition[] = 0
registered definitions      = 0
```

`admin/index.ts` 는 컴포넌트 2개와 `adminShortcodes` **객체 map** 만 export 한다.
loader 는 `isShortcodeDefinitionArray` 를 통과한 export 만 등록하므로 0 이다.
이 수치는 report 의 `lazyLoaderContract` 에 그대로 기록된다.

---

## 6. `approval_queue` 판정 (§9)

**`AUDIT_FALSE_POSITIVE`.**

- 문자열 `approval_queue` 는 소스·seed·fixture 어디에도 **없다**. 과거 audit 이
  파일명 `ApprovalQueue.tsx` 에서 유추한 이름이었다.
- 실제 키 `admin_approval_queue` 는 저장소에 **정확히 1회** — 소비처 0 인
  `adminShortcodes` map 안. → 그 키 자체는 **`DEAD_SHORTCODE`**.
- `admin_approval_queue` vs `approval_queue` 는 key 불일치가 아니라 **한쪽이 실재하지
  않는다**. `ACTIVE_KEY_MISMATCH` 아님.

---

## 7. `product_shortcodes` 판정 (§10)

**이름 축은 `AUDIT_FALSE_MODEL`, 파일 축은 `UNMOUNTED_DEFINITION_BUNDLE`.**

- `product_shortcodes` 라는 shortcode 는 존재하지 않는다. 파일명 유추 결과다.
- 파일은 실제로 6개 token 을 선언한다: `product` · `product_grid` · `add_to_cart` ·
  `product_carousel` · `featured_products` · `product_categories`.
- 파일이 `index.*` 가 아니라 **loader glob 밖**이고, 이 파일을 import 하는 모듈이
  **0** 이다 → 번들에 들어가지 않는다. `LOADER_PATTERN_BUG` 아님(glob 은 의도대로 동작).

> **이번 WO 에서 등록하지 않는다.** `add_to_cart` · `product_grid` 는 소비자 commerce
> 표면이고, [`O4O-STORE-COMMERCE-BOUNDARY-V1`](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)
> 의 "O4O 자체 소비자 전자상거래 없음" 과 충돌한다. 등록 여부는 **사업 경계 판단**이지
> audit 판단이 아니다 → §12 후속 후보.

---

## 8. `registerAuthShortcodes()` 생명주기 (§11)

`DEFINED` + `EXPORTED` + barrel 재export ✅ / `IMPORTED` 0 / `CALLED` 0
→ **`DEAD_INITIALIZER`**.

외부 소비 가능성도 확인했다 — 저장소 전체에서 호출부 0, 다른 package 의 참조 0.
**삭제는 하지 않았다.** public barrel export 제거는 공유 계약 변경이라 이번 최소 범위를
넘는다(§20). 대신 "되살아나지 않음" 을 테스트로 고정하고 후속 WO 후보로 남긴다.

---

## 9. Alias 정책 · persisted content (§14 · §15)

| 항목 | 결과 |
|---|---|
| `login_form` · `oauth_login` | 소스상 `SocialLogin` 의 `COMPAT_ALIAS` 표기이나, 3건 모두 미등록이라 **runtime 효력 0** |
| 신규 alias 추가 | **0** — persisted content 근거가 없으면 만들지 않는다(§14) |
| `approval_queue` · `product_shortcodes` 리터럴 | 소스 0 · seed 0 · fixture 0 |
| `admin_approval_queue` | 소스 1회(dead map) · content 근거 0 |
| production DB 조회 | **수행하지 않았다.** 위 리터럴들이 애초에 저장 콘텐츠에 나타날 수 없는 구조(등록된 적 없음)라 read-only 조회 필요성도 없다고 판단 |
| production write | **0** |

---

## 10. runtime vs audit 비교 (§16 · §21)

| | 집합 |
|---|---|
| **runtime registered** (실행 검증) | `acf_field` · `cpt_field` · `cpt_list` · `meta_field` · `preset` |
| **audit `runtimeRegistered`** | 동일 5건 |
| mismatch | **0** |

runtime 값은 grep 이 아니라 **실행**으로 얻었다 —
`apps/admin-dashboard/src/tests/shortcode-runtime-registration.test.ts` 가
App.tsx 와 같은 side-effect import 를 수행하고 `getRegisteredShortcodes()` 를 읽는다.

audit 은 부작용을 피하기 위해 runtime 을 import 하지 않고 **source-level deterministic
model** 을 쓰되(§17), 위 테스트가 두 값의 일치를 계약으로 고정한다.

---

## 11. audit before / after

| | before (`e21ae63bc`) | after |
|---|---|---|
| 기준 | 파일 33개(파일명 유추) | **선언 token 14** |
| registered | 3 (전부 dead auth 등록) | **5 (실제 bootstrap 도달)** |
| missing | 2 (`approval_queue` · `product_shortcodes`) | **0** |
| explained gaps | 개념 없음 | **9** (DEAD_INITIALIZER 3 · UNMOUNTED_DEFINITION_BUNDLE 6) |
| dangling | 0 | **0** |
| exit | 1 | **0** |

`missing = 0` 은 등록을 늘려서가 아니라 **존재하지 않는 이름을 세지 않게 되어서**다.
가짜 registration 0건(§2 원칙).

---

## 12. 변경 파일

| 파일 | 변경 |
|---|---|
| `scripts/audit/check-shortcode-registry.ts` | audit 모델 교체 (파일 존재 → runtime 도달) |
| `apps/api-server/src/__tests__/shortcode-registry-ssot-and-runtime-reachability.spec.ts` | **신규** — SSOT·bootstrap·판정 계약 |
| `apps/admin-dashboard/src/tests/shortcode-runtime-registration.test.ts` | **신규** — 실행 기반 등록 집합 검증 |
| `apps/api-server/src/__tests__/registry-audit-missing-and-dangling-closure.spec.ts` | 선행 WO 의 `expectedName` 단언을 새 report 형태로 정합 |
| `scripts/audit/README.md` · `scripts/audit/REGISTRY_AUDIT_REPORT.md` | 현행 수치·모델 정합 |
| `packages/shortcodes/README.md` | 등록 계약(SSOT · side-effect 아님) 명시, 존재하지 않는 shortcode 목록 정정 |

**runtime · renderer · editor 코드 변경 0.**

---

## 13. 검증

| # | 항목 | 결과 |
|---|---|---|
| 1 | shortcode audit | **exit 0** (defined 14 / registered 5 / explained 9 / missing 0 / dangling 0) |
| 2 | audit 2회 실행 byte 비교 | **byte-identical** ✅ |
| 3 | report 절대경로 · 기본 timestamp | 0 · 없음 ✅ |
| 4 | 재생성 후 `git status --porcelain` | 변화 0 (git-ignored 유지) ✅ |
| 5 | `tsc --noEmit` (audit 스크립트) | exit 0 ✅ |
| 6 | `tsc --noEmit` (admin-dashboard) | exit 0 ✅ |
| 7 | 신규 SSOT spec + 관련 registry spec 4종 | **70 tests PASS** ✅ |
| 8 | admin-dashboard vitest (runtime 등록) | **4 tests PASS** ✅ |
| 9 | api-server 전량 Jest | **219 suites / 3688 tests PASS** ✅ |
| 10 | eslint (변경 파일) | 신규·수정 코드 0 error ✅ |

> eslint 는 `registry-audit-missing-and-dangling-closure.spec.ts:68` 에서
> `no-useless-escape` 2건을 보고한다. **이번 변경과 무관한 선행 라인**이며
> (HEAD 원본과 동일) 범위 외라 손대지 않았다.

### 13-1. Production smoke (§24)

**불필요.** 이번 변경은 §19 경우 **E(audit-only)** 이고 등록·renderer·editor 동작
변경이 0 이다. WO §24 의 "단순 audit-only 수정이면 smoke 불필요" 에 해당한다.

### 13-2. 선행 WO Buttons smoke (§25) — **별도 항목 · 미완료**

선행 [`WO-O4O-REGISTRY-AUDIT-MISSING-AND-DANGLING-CLOSURE-V1`](WO-O4O-REGISTRY-AUDIT-MISSING-AND-DANGLING-CLOSURE-V1-CHECK.md)
의 `Buttons editor 노출` · `inner Button DynamicRenderer` · `기존 저장 콘텐츠 렌더`
smoke 는 **여전히 미완료**다. 이번 WO 는 admin-dashboard 배포를 유발하지 않으므로
같이 확인하지 못했다. **이번 WO 의 변경과 무관한 선행 항목으로 남긴다.**

---

## 14. Git 안전 보고

| 항목 | 결과 |
|---|---|
| autostash | **0** |
| rebase · `pull --autostash` · `--amend` | **0** |
| `git add .` | **미사용** |
| foreign staged/unstaged 상태 변경 | **0** (작업 트리의 변경 7건 전부 이번 WO 산출물) |
| staged scope guard | PASS (`scripts/git/check-staged-scope.mjs`) |
| commit 방식 | path-specific (`git commit -F - -- <경로>`) |
| commit 자체 delta 검증 | PASS |
| `origin/main` 이동 | 작업 중 `e21ae63bc → c2b7eb505` 로 선행. dirty 상태라 pull 하지 않고 **최신 `origin/main` 기준 임시 worktree cherry-pick** 경로 사용 |

---

## 15. 후속 후보 (이번 범위 밖)

1. **`registerAuthShortcodes()` 은퇴 판단** — `DEAD_INITIALIZER` 확정. barrel export
   제거는 공유 계약 변경이라 별도 WO.
2. **product shortcode 번들의 존폐** — `add_to_cart` · `product_grid` 는 소비자
   commerce 표면. `O4O-STORE-COMMERCE-BOUNDARY-V1` 기준의 **사업 경계 WO** 로 판단한다.
   audit 숫자를 이유로 등록하지 않는다.
3. **`adminShortcodes` map · `AdminPlatformStats` placeholder 정리** — 소비처 0.
4. **`metadata.ts` 의 정의 없는 10 token**(`cart` · `checkout` · `order_detail` ·
   `wishlist` · `login` · `signup` · `account` · `find_id` · `find_password` ·
   `business_register`) — 문서 축 divergence. 상당수가 소비자 commerce 축이라 2번과
   함께 다루는 편이 맞다.
5. **선행 Buttons smoke 소진** (§13-2).
