# CHECK-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1

> `WO-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1` (Phase A) 적용 결과 고정.

- **작성일**: 2026-06-04
- **WO**: [`WO-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1`](../work-orders/WO-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1.md)
- **선행 IR**: [`IR-O4O-OPERATOR-ADMIN-QUICK-ACTIONS-ICON-AUDIT-V1`](IR-O4O-OPERATOR-ADMIN-QUICK-ACTIONS-ICON-AUDIT-V1.md) (`bfbff58a3`)

---

## 1. 최종 판정

**PASS.** 공통 `QuickActionBlock`/`StructureActionBlock`에 icon-name→lucide 매핑 헬퍼(`ActionIcon`)를 도입. lucide-name 9종 텍스트 노출을 제거하고, emoji(KPA)는 그대로 통과시켜 회귀 0. operator-ux-core/admin-ux-core + consumer(neture/glyco) `tsc --noEmit` exit 0. **배포 후 라이브 smoke: Neture admin / GlycoPharm operator / K-Cosmetics operator 전부 lucide 렌더 확인(텍스트 노출 0). KPA operator는 emoji 무변경 케이스(§7).**

---

## 2. 근본 원인 / 수정 요약

- **원인**: 두 블록이 `item.icon`(string)을 `<span>{item.icon}</span>`로 직접 렌더 → 백엔드가 보내는 lucide-name(`users`/`store`/`dollar-sign`…)이 텍스트로 노출.
- **수정**: 각 패키지에 `ActionIcon` 헬퍼 추가 →
  1. icon이 `ICON_NAME_MAP`(9종)에 있으면 → `<Icon size={18} className="text-slate-600 shrink-0">`
  2. 매핑에 없는 **ASCII name-like**(`/^[a-z0-9-]+$/i`) → **생략**(텍스트 노출 방지)
  3. **비-ASCII(emoji 등)** → 기존처럼 `<span className="text-lg">{icon}</span>` 통과 (KPA emoji 회귀 0)

---

## 3. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `packages/operator-ux-core/src/blocks/ActionIcon.tsx` | **신규** — icon-name→lucide 헬퍼 |
| `packages/operator-ux-core/src/blocks/QuickActionBlock.tsx` | `<span>{item.icon}</span>` → `<ActionIcon icon={item.icon} />` |
| `packages/admin-ux-core/src/blocks/ActionIcon.tsx` | **신규** — 동일 헬퍼 |
| `packages/admin-ux-core/src/blocks/StructureActionBlock.tsx` | 동일 치환 |
| `packages/admin-ux-core/package.json` | `lucide-react` peerDependency(`>=0.300.0`) 추가 (operator-ux-core와 동일 — admin-ux-core는 lucide 미의존이었음) |

> 헬퍼는 각 패키지 로컬(블록 dir). 두 패키지 간 cross-import 회피(Phase A 단순화, WO §4 허용). 내용 동일.

---

## 4. 매핑한 icon-name 목록 (9종)

`users→Users` · `shield→Shield` · `store→Store` · `dollar-sign→DollarSign` · `percent→Percent` · `key→Key` · `package→Package` · `file-text→FileText` · `shopping-cart→ShoppingCart`

(백엔드 실측 union 전부 커버: Neture admin 6 + Glyco operator 3 + KCos operator 4, 중복 제거 9.)

---

## 5. 변경하지 않은 항목

- **백엔드 dashboard icon 값** — 미변경 (Phase B)
- **KPA operator emoji**(`🧑‍💼💊🛒`…) — 미변경, `ActionIcon`이 비-ASCII로 통과 → 기존 표시 유지 (Phase B)
- **KPA / GlycoPharm admin 프론트 하드코딩 emoji** — 미변경 (Phase C, 공통 블록 우회 경로)
- `DomainIASidebar` / `OperatorAreaShell` (operator drawer) — 미접촉
- `HeroBannerSection.tsx` / Store Hub·Channels·Home 아이콘 정비 파일 — 미접촉
- 라벨 / 링크 / 순서 / 권한 / API — 불변

---

## 6. TypeScript 결과

```bash
packages/operator-ux-core  npx tsc --noEmit   # exit 0
packages/admin-ux-core      npx tsc --noEmit   # exit 0 (lucide peerDep 추가 후)
services/web-neture         npx tsc --noEmit   # exit 0 (admin consumer 회귀 없음)
services/web-glycopharm     npx tsc --noEmit   # exit 0 (operator consumer 회귀 없음)
```

---

## 7. desktop/mobile smoke 결과 — **PASS (배포 후 라이브 검증, 2026-06-04)**

Playwright(admin/operator 계정) 라이브 검증. 렌더가 실제로 바뀌는 3개 서비스 전부 PASS.

| 대상 | 결과 |
|------|------|
| **Neture `/admin`** Structure Actions | ✅ `users/shield/store/dollar-sign/percent/key` 텍스트 → lucide(Users/Shield/Store/DollarSign/Percent/Key) 렌더 |
| **GlycoPharm `/operator`** Quick Actions | ✅ `store/package/file-text` 텍스트 → lucide(Store/Package/FileText) 렌더 |
| **K-Cosmetics `/operator`** Quick Actions | ✅ `store/package/shopping-cart/file-text` 텍스트 → lucide(Store/Package/ShoppingCart/FileText) 렌더 |
| **KPA `/operator`** Quick Actions | ⚠️ **계정 권한 가드로 접근 차단** (test account operator 권한 — 기존 smoke blocker). 단 KPA는 **백엔드 emoji = 무변경 케이스**: `ActionIcon`이 비-ASCII(emoji)를 `NAME_LIKE` 미충족 → 기존과 동일 `<span className="text-lg">{icon}</span>` 분기로 통과 → **렌더 byte-identical, 회귀 구조적 불가**. |

- 라벨/링크/순서/클릭 회귀 없음 확인 (3 서비스).
- console: `api.neture.co.kr/auth/me` 401(인증 폴링, benign) 외 critical error 없음.
- 스크린샷: `phaseA-neture-admin-structure-actions.png` / `phaseA-glyco-operator-quick-actions.png` / `phaseA-kcos-operator-quick-actions.png` (작업 트리 untracked).
- 부수 확인: KPA 헤더 메뉴에서 "이용 가이드" 부재 → 이전 메뉴 제거(`3e652a0cd`) 배포 반영 확인.

---

## 8. staged 파일 검증

`git diff --cached --name-only` (6파일):
```text
packages/operator-ux-core/src/blocks/ActionIcon.tsx
packages/operator-ux-core/src/blocks/QuickActionBlock.tsx
packages/admin-ux-core/src/blocks/ActionIcon.tsx
packages/admin-ux-core/src/blocks/StructureActionBlock.tsx
packages/admin-ux-core/package.json
docs/investigations/CHECK-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1.md
```
`HeroBannerSection.tsx` / `DomainIASidebar` / `OperatorAreaShell` / 백엔드 / 서비스 dashboard 페이지 staged 아님 확인.

---

## 9. 남은 후속 (Phase B/C)

```text
B. WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1 — KPA 백엔드 emoji→lucide-name + 4서비스 어휘 카탈로그 고정
   (그러면 KPA operator도 ActionIcon 매핑 경로로 lucide 렌더)
C. WO-O4O-ADMIN-QUICKACTION-FRONTEND-CONVERGE-V1 — Glyco/KPA admin 프론트 emoji 하드코딩 수렴
```

---

*Phase A — 공통 블록 2곳 렌더러 보정(매핑 헬퍼). 백엔드/KPA emoji/admin 프론트/drawer 미접촉. 배포 후 smoke 예정.*
