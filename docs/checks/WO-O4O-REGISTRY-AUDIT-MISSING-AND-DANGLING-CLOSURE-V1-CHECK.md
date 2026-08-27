# WO-O4O-REGISTRY-AUDIT-MISSING-AND-DANGLING-CLOSURE-V1 — CHECK

- **작업일**: 2026-08-27
- **기준 commit**: `81a36fcd8` (local main) / `origin/main = e485baba9`
- **선행 WO**: [generator canonicalization](WO-O4O-REGISTRY-AUDIT-GENERATOR-CANONICALIZATION-V1-CHECK.md)
- **결론**: **block 축 CLOSED (checker exit 0)** / **shortcode 축 부분 CLOSED — 잔여 2건은 별도 WO 로 분리(§22 중지 조건 발동)**
- **DB schema change 0 / migration 0 / production write 0 / production 조회 0**

---

## 1. 시작 수치가 WO 기재와 달랐다 (먼저 보고)

WO §1 의 baseline 은 `block 33/2/1`, `shortcode 33/2/0` 이었다. 실측은 달랐다.

| 축 | WO 기재 | HEAD `81a36fcd8` 실측 (Windows) |
|---|---|---|
| block | registered 33 / missing 2 / dangling 1 | files 33 / registered 32 / **missing 2 / dangling 1** |
| shortcode | registered 33 / missing 2 / dangling 0 | files 35 / registered **3** / **missing 32 / dangling 2** |

원인은 §2 의 첫 번째 scanner 결함이다. WO 의 숫자는 **Linux 실행 결과와 일치**한다.
즉 이 audit 은 그 시점까지 **실행 머신에 따라 다른 답을 내고 있었다.**

---

## 2. 실제로 발견한 것 — findings 대부분이 scanner 결함이었다

| # | 결함 | 증상 | 조치 |
|---|---|---|---|
| S1 | exclude 판정 입력이 `path.join` 결과 | exclude 패턴은 `/\/index\.ts$/` 처럼 `/` 로 앵커돼 있어 **Windows 에서 목록 전체가 무력화** | 판정 입력을 repo-relative POSIX 로 canonicalize (`probePath`) |
| S2 | block 이름을 **파일명에서 유추** | `SlideBlock.tsx` → `o4o/slide-block` ≠ 선언 `o4o/slide` | 소스의 `name:` 선언값을 정본으로 읽는다 |
| S3 | 등록 이름을 **import 변수명에서 유추** | `socialBlockDefinition` → `o4o/social` ≠ 선언 `o4o/social-links` | import 대상 정의 파일을 찾아 선언값 사용 |
| S4 | alias 를 표현 못함 | `login_form` · `oauth_login` (소스에 `(alias)` 명시, 모두 `component: SocialLogin`) 이 dangling | 등록 블록의 `component:` 식별자로 구현 존재를 판정 |
| S5 | 인프라 모듈을 컴포넌트로 오인 | `metadata.ts` · `utils/shortcodeNaming.ts` 가 missing | scanner 를 좁힌다 (`/\/metadata\.ts$/`, `/\/utils\//`) |

S1 은 선행 WO 가 고친 출력 canonicalization 과 **같은 계열의 결함**이다. 선행 WO 는
report 의 *출력* 을, 이번 WO 는 *판정 입력* 을 같은 방식으로 정규화했다.

**실제 코드 결함은 단 1건이었다 — `o4o/buttons` 미등록.**

---

## 3. 항목별 판정 (WO §5~§8, §11)

### 3-1. Block

| 항목 | 판정 | 근거 |
|---|---|---|
| `o4o/buttons` (missing) | **VALID_FINDING · ACTIVE_MISSING_REGISTRATION → REGISTER_ACTIVE** | 정의 완전(`buttons.tsx:53`) / `packages/block-renderer/src/renderers/index.ts:116` 이 이미 렌더 / `scripts/cms/normalize-blocknames.ts` 가 저장 콘텐츠를 이 키로 **정규화** / `useBlockPatterns.ts:300` 참조 / 단수 `o4o/button` 과 별개 |
| `o4o/slide` (dangling) | **FALSE_POSITIVE (scanner)** | 구현 `SlideBlock.tsx:79`, 등록 `blocks/index.ts:75`. S2 + `/\/SlideBlock\.tsx$/` exclude 가 가린 것 |
| `o4o/social-links` / `o4o/social` | **FALSE_POSITIVE (scanner)** | S3 수정 과정에서 드러난 같은 원인의 missing+dangling 한 쌍 |

`o4o/buttons` 는 **legacy key 가 아니라 정규화 목적지**다(`'core/buttons' → 'o4o/buttons'`).
따라서 등록은 저장 콘텐츠를 깨지 않고, 지금까지 렌더되지 못하던 콘텐츠를 살린다.
**삭제·마이그레이션 0.**

### 3-2. Shortcode

| 항목 | 판정 | 근거 |
|---|---|---|
| `login_form` (dangling) | **ACTIVE_COMPAT_ALIAS → FALSE_POSITIVE** | `auth/index.ts:56` 소스 주석 `(alias)`, `component: SocialLogin` |
| `oauth_login` (dangling) | **ACTIVE_COMPAT_ALIAS → FALSE_POSITIVE** | `auth/index.ts:75` 동일 |
| `metadata` (missing) | **FALSE_POSITIVE** | shortcode 메타데이터 정의 모듈. 등록 대상이 아니다 |
| `shortcode_naming` (missing) | **FALSE_POSITIVE** | 명명 규칙 helper |
| 나머지 28건 (missing) | **FALSE_POSITIVE** | S1 로 exclude 가 무력화돼 `parser.ts` · `registry.ts` · `cache.ts` · `provider.tsx` · `renderer.ts` · `template/helpers/*` 등이 전부 컴포넌트로 잡혔다 |
| `approval_queue` (missing) | **UNKNOWN → 별도 WO** | §4 참조 |
| `product_shortcodes` (missing) | **UNKNOWN → 별도 WO** | §4 참조 |

---

## 4. §22 중지 조건 발동 — shortcode registry SSOT 불명확

조사 중 **WO 범위를 넘는 구조 문제**가 확인됐다. §22 의 "registry SSOT 불명확" ·
"UNKNOWN 발생" 에 해당하므로 이 축은 **고치지 않고 분리**한다.

**shortcode 등록 메커니즘이 3개 공존한다:**

1. `packages/shortcodes/src/auth/index.ts` — `registerShortcode({name:'…'})` 객체 리터럴
2. `packages/shortcodes/src/preset/index.ts:44` — `registerShortcode(presetShortcodeDefinition)` **식별자 형태** (audit regex 가 볼 수 없다)
3. `apps/admin-dashboard/src/utils/shortcode-loader.ts:110` — `import.meta.glob('../components/shortcodes/**/index.{ts,tsx}')` + `registerLazyShortcode`

**그리고 그 위에 미해결 사실이 얹힌다:**

| 사실 | 확인 방법 |
|---|---|
| **`registerAuthShortcodes()` 에 호출자가 없다** — 정의(`auth/index.ts:13`)와 re-export(`packages/shortcodes/src/index.ts:70`) 뿐 | 저장소 전역 `git grep` |
| 즉 audit 이 "registered 3" 으로 세는 `social_login` · `login_form` · `oauth_login` 은 **런타임에 등록되지 않을 가능성이 높다** | 위와 동일 |
| `registerPresetShortcode()` 는 살아 있다 | `register-dynamic-shortcodes.ts:12` ← `App.tsx:23` |
| `components/shortcodes/admin/index.ts` 는 `ShortcodeDefinition` 을 **내보내지 않는다** (평범한 component map `adminShortcodes`) → loader 가 여기서 등록하는 것이 0 | 파일 전문 확인 |
| 그 map 의 키는 `admin_approval_queue` 인데 scanner 기대값은 `approval_queue` — **명명 축도 어긋난다** | `admin/index.ts:14` |
| `productShortcodes.tsx` 는 `ShortcodeDefinition[]` 를 내보내지만 **`index.*` 파일이 아니라 loader glob 밖**이다 | glob 패턴 대조 |

**따라서 `approval_queue` · `product_shortcodes` 를 등록하는 것은
"어느 registry 가 SSOT 인지 모르는 상태에서 숫자만 0 으로 만드는 것"** 이 된다.
WO §10 의 금지 사항이다. **손대지 않았다.**

> 후속 WO 후보: `WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1`
> — 3개 메커니즘 중 SSOT 확정 / `registerAuthShortcodes` 미호출 판정
> (`ACTIVE_MISSING_WIRING` vs `DEAD_REGISTRY`) / loader glob 계약 정리.

---

## 5. §9 Registry SSOT 기록

| 축 | canonical registry | 상태 |
|---|---|---|
| **Block** | `apps/admin-dashboard/src/blocks/index.ts` → `blockRegistry.register(...)` | **단일 · 확정.** 이름의 정본은 각 정의 파일의 `name:` 선언값 |
| **Shortcode** | — | **미확정** (§4). 이번 WO 에서 구조 재설계 없음 |

---

## 6. 실제 수정 (5 파일)

| 파일 | 변경 |
|---|---|
| `scripts/audit/check-block-registry.ts` | S1 · S2 · S3 · `SlideBlock.tsx` exclude 제거 |
| `scripts/audit/check-shortcode-registry.ts` | S1 · S4 · S5 |
| `apps/admin-dashboard/src/blocks/definitions/buttons.tsx` | `require('../registry/DynamicRenderer')` → 정적 ESM import |
| `apps/admin-dashboard/src/blocks/index.ts` | `buttonsBlockDefinition` import + `register` |
| `apps/api-server/src/__tests__/registry-audit-missing-and-dangling-closure.spec.ts` | **신규** 계약 테스트 18건 |

`buttons.tsx:39` 의 `require()` 는 blocks 트리의 **유일한** `require()` 였고 Vite(ESM)
번들에는 런타임이 없다. 등록되지 않은 동안 드러나지 않던 결함이라, 등록 **전에**
선행 수정했다. `DynamicRenderer` 는 `BlockRegistry` 만 참조하므로 `blocks/index.ts`
와 **순환하지 않는다**(import 목록 확인).

placeholder component 0 / dead route 복원 0 / fake alias 0 / registry 구조 재설계 0.

---

## 7. 최종 수치

| 축 | files | registered | missing | dangling | mismatches | exit |
|---|---:|---:|---:|---:|---:|---|
| Block | 33 | 33 | **0** | **0** | — | **0** ✅ |
| Shortcode | 3 | 3 | 2 | **0** | 0 | 1 |

WO §17 의 "두 checker 모두 exit 0" 은 **달성하지 못했다.** shortcode 의 잔여 2건은
§4 의 이유로 의도적으로 열어 두었다 — 닫으려면 존재하지 않는 SSOT 를 임의로
정해야 한다. §12 의 실제 기준(`unexplained = 0`)은 충족한다.

| §12·§25 기준 | 결과 |
|---|---|
| block unexplained missing / dangling | **0 / 0** ✅ |
| shortcode unexplained missing / dangling | **0 / 0** ✅ (잔여 2건은 §4 로 설명·분리) |
| registry SSOT 미확정 | **1건 (shortcode)** — 별도 WO 로 명시 |
| scanner false-positive 미판정 | **0** ✅ |
| persisted-content 위험 미조사 | **0** ✅ (§8) |
| 문서 수치 drift | **0** ✅ (§9) |
| generated report 재실행 dirty | **0** ✅ |
| DEAD_REFERENCE | **0** |
| UNKNOWN | **2건** — 은폐하지 않고 §4 에 기재 |
| foreign WIP 변경 | **0** ✅ |

---

## 8. Persisted Content 위험 조사 (WO §8)

| 리터럴 | 저장 콘텐츠 위험 | 판단 |
|---|---|---|
| `o4o/buttons` | 없음 — **정규화 목적지**이고 renderer 가 이미 지원. 등록은 순수 additive | 안전 |
| `o4o/slide` | 코드 변경 0 (scanner 오탐이었다) | 해당 없음 |
| `o4o/slide-block` | 실재하지 않는 유령 이름이었다. 콘텐츠 참조 0 | 해당 없음 |
| `approval_queue` / `product_shortcodes` | **코드 변경 0** — 삭제·등록 모두 하지 않았으므로 콘텐츠 영향 없음 | 해당 없음 |
| `login_form` / `oauth_login` / `social_login` | 코드 변경 0 | 해당 없음 |

이번 WO 는 **어떤 registry entry 도 제거하지 않았다.** 유일한 변경 방향이 "등록 추가"
이므로 저장 콘텐츠가 깨지는 경로가 존재하지 않는다. **production DB 조회 불필요**로
판단했고 조회하지 않았다 (read-only 조회도 수행 0, write 0).

---

## 9. 문서 수치 정합 (WO §14)

| 문서 | 이전 | 조치 |
|---|---|---|
| `scripts/audit/README.md` `## Current Status` | blocks 32/33 · missing 1 · dangling 1 / shortcodes 16/61 · missing 47 · dangling 5 | **실측으로 교체** + 잔여 2건의 성격 명시 |
| `scripts/audit/README.md` `## Next Steps` | "Register `buttons` block" 등 5단계 | 1번 완료 표기, 2번을 SSOT 확정으로 교체 |
| `scripts/audit/REGISTRY_AUDIT_REPORT.md` | 2025-11-21 스냅샷 (은퇴한 main-site 컴포넌트 47건 열거) | **헤더에 현행 수치 표 추가** + 본문 §2~§8 이 스냅샷임을 명시. 본문 열거는 미수정 (은퇴 이력 기록이고 재작성은 별도 범위) |

과거 CHECK / `docs/archive` 의 역사적 숫자는 **수정하지 않았다** (§14 · CLAUDE.md §16-1).

---

## 10. 검증

| # | 항목 | 결과 |
|---|---|---|
| 1 | block checker | **exit 0** ✅ |
| 2 | shortcode checker | exit 1 (잔여 2건, §7) |
| 3 | 두 report 2회 재실행 byte-identical | ✅ block `4ac8b4a98a7a73b7…` / shortcode `bcb9b16f8bcefe84…` 각 2회 동일 |
| 4 | report 경로 형식 | ✅ repo-relative POSIX, 절대경로·드라이브 문자 0 |
| 5 | 기본 실행 `timestamp` | ✅ 부재 (선행 WO 계약 유지) |
| 6 | 재생성 후 `git status --porcelain` | ✅ report 2개 미출현 (ignored 계약 유지) |
| 7 | `tsc --noEmit` (audit 스크립트 2개) | exit 0 ✅ |
| 8 | `tsc --noEmit -p` (admin-dashboard 전체) | exit 0 ✅ |
| 9 | `eslint` (변경 4파일) | exit 0 ✅ |
| 10 | 신규 계약 spec | **18 tests PASS** ✅ |
| 11 | 선행 WO spec 2종 (canonicalization · untrack) | **30 tests PASS** — 회귀 0 ✅ |
| 12 | api-server 전량 Jest | §10-A 참조 |

### 10-A. 전체 스위트

`npx jest` (apps/api-server) — **214 suites / 3594 tests, 213 suites · 3593 tests PASS.**

**실패 1건은 이번 변경과 무관한 사전 실패다:**

```text
FAIL src/__tests__/encryption-key-rotation-runner.spec.ts
  ● rotateCell › 어느 키로도 못 읽으면 HOLD — 삭제하거나 새 값으로 덮어쓰지 않는다
    Expected: "HOLD_UNREADABLE"   Received: "ROTATED"
```

이 spec 의 import 는 `../scripts/encryption-key-rotation.js` 와 `../utils/crypto.js`
뿐이고, 이번 WO 가 건드린 5개 파일 중 어느 것도 그 경로에 없다. **숨기지 않고
그대로 보고한다** — 별도 조사 대상이며 이번 WO 에서 고치지 않았다(범위 밖 수정 금지).

---

## 11. Build · Smoke (WO §19 · §20)

- **admin-dashboard `tsc --noEmit` exit 0** — `buttons.tsx` 의 ESM import 전환과
  신규 등록이 타입 경계를 깨지 않음을 확인했다.
- `o4o/buttons` 등록은 **editor 에 보이는 변경**이므로 block editor / render smoke
  대상이다. 배포 후 확인 항목: ① 편집기 블록 목록에 Buttons 노출 ② Buttons 안에
  inner Button 추가 시 `DynamicRenderer` 정상 동작(과거 `require()` 경로가 죽던 자리)
  ③ 기존 `o4o/buttons` 저장 콘텐츠 렌더.
- main-site full CI build 재등록은 **하지 않았다** (§19).
- **production DB write 0.**

---

## 12. Git 안전 보고

| 항목 | 결과 |
|---|---|
| autostash | **0** — pull / rebase 미수행 |
| rebase · `--amend` | **0** |
| foreign staged/unstaged 상태 변경 | **0** |
| `git add .` | 미사용 |
| staged scope guard | PASS (`scripts/git/check-staged-scope.mjs`) |
| commit 방식 | path-specific (`git commit -F - -- <경로>`) |
| commit 자체 delta 검증 | PASS — 6 modified + 2 added, 범위 밖 0 |
| 분기 처리 | 최신 `origin/main` 기준 **임시 worktree cherry-pick** |
| commit hash | 본문 하단 완료 보고 참조 (local commit → 임시 worktree cherry-pick) |

---

## 13. 후속 후보

1. **`WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1`** (§4) — 이번 WO 의
   직접 파생. 3개 등록 메커니즘 중 SSOT 확정, `registerAuthShortcodes` 미호출 판정,
   `admin_approval_queue` vs `approval_queue` 명명 축 정리.
2. `REGISTRY_AUDIT_REPORT.md` §2~§8 본문 재작성 (은퇴한 main-site 열거 제거).
3. 두 checker 의 CI gate 등재 여부 판단 — block 축은 이제 exit 0 이라 게이트로
   쓸 수 있는 상태가 됐다. shortcode 축은 1번 완료 후.
