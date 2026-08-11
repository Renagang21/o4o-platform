# CHECK-O4O-OPERATOR-MENU-ROLE-FILTER-COMMONIZATION-G3A-V1

**WO**: `WO-O4O-OPERATOR-MENU-ROLE-FILTER-COMMONIZATION-G3A-V1` (G3-A `filterMenuByRole` 공통화 구현)
**일자**: 2026-08-11
**판정**: **PASS** — 4 서비스 전환 완료, 메뉴 노출 결과 불일치 0건
**선행 조사**: [CHECK-O4O-SERVICE-MENU-LAYOUT-CORE-EXTENSION-AUDIT-V1](CHECK-O4O-SERVICE-MENU-LAYOUT-CORE-EXTENSION-AUDIT-V1.md)

---

## 1. 범위

`filterMenuByRole` 과 그 입력 타입 `UnifiedMenuItem` 만 `@o4o/ui` (operator-shell) 로 공통화.

| 항목 | 처리 |
|---|---|
| `filterMenuByRole` 구현 (4벌) | → `@o4o/ui` 1벌 |
| `UnifiedMenuItem` 타입 (4벌) | → `@o4o/ui` 1벌 |
| 서비스별 `UNIFIED_MENU` 정의 | **보존** (서비스별 유지) |
| `isAdmin` 산출 방식 | **보존** (각 wrapper 유지) |
| Neture `filterMenuByRole(UNIFIED_MENU, false)` 고정 정책 | **보존** |
| `filterContextualNav` · 권한 정책 · route · capability | **미수정** |

---

## 2. 전환 전 실측 — 4 구현의 동일성

| 서비스 | 구현 | adminOnly 키 제거 | 빈 그룹 제외 |
|---|---|:---:|:---:|
| kpa-society | `filter` + rest 분해 | O | O |
| glycopharm | 동일 (byte-identical) | O | O |
| neture | 동일 (byte-identical) | O | O |
| **k-cosmetics** | **rest 분해 없음** (cast 후 filter) | **X** | O |

K-Cosmetics 만 반환 객체에 `adminOnly` 키가 남는 차이가 있었다. 다만

- K-Cosmetics `UNIFIED_MENU` 의 `adminOnly` 항목은 **0건** → 실제 반환값에 차이 없음
- 소비처 `DomainIASidebar` 는 `label` / `path` / `exact` / `sectionLabel` 만 읽는다
  (`packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` — "capability + adminOnly 필터: 호출처(wrapper) 가 사전 수행")

→ 공통 구현은 다수(3벌) 동작인 **rest 분해(키 제거)** 를 정본으로 채택했다. 서비스별 분기는 두지 않았다.

---

## 3. 변경 내용

### 신규 · 공통

- `packages/ui/src/operator-shell/filterMenuByRole.ts` (신규) — 정본 구현. 계약 4개를 주석으로 명문화:
  adminOnly 통과 규칙 / `adminOnly` 키 제거 / 항목 순서 보존 / 빈 그룹 제외.
  **권한 판정은 하지 않는다 — `isAdmin` 산출은 호출처 책임.**
- `packages/ui/src/operator-shell/types.ts` — `UnifiedMenuItem extends OperatorMenuItem { adminOnly?: boolean }` 추가 (additive).
- `packages/ui/src/operator-shell/index.ts` — 위 2개 export 추가 (기존 export 변경 없음).

### 서비스 (4)

각 `src/config/operatorMenuGroups.ts` 에서 local `UnifiedMenuItem` interface + `filterMenuByRole` 함수 제거,
`import type { ..., UnifiedMenuItem } from '@o4o/ui'` 로 교체.

각 LayoutWrapper 는 `filterMenuByRole` 을 **`@o4o/ui` 에서 직접 import**.
config 에 위임 재수출(alias)을 두지 않았다.

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/config/operatorMenuGroups.ts` | −37 |
| `services/web-glycopharm/src/config/operatorMenuGroups.ts` | −22 |
| `services/web-k-cosmetics/src/config/operatorMenuGroups.ts` | −22 |
| `services/web-neture/src/config/operatorMenuGroups.ts` | −32 |
| LayoutWrapper 4종 | import 줄만 |

합계 **+38 / −112 (net −74줄)**, 구현 4벌 → 1벌. 신규 패키지 0 · `package.json` · lockfile · Dockerfile 변경 0.

Neture `AdminLayoutWrapper` 의 `getAdminMenu()` 는 `filterMenuByRole` 을 쓰지 않으므로 미변경.

---

## 4. 검증 — 전환 전후 메뉴 결과 대조

각 서비스 `UNIFIED_MENU` 에 대해 `isAdmin=false` / `isAdmin=true` 두 경우의
**그룹 키 · 그룹 순서 · 항목 순서 · label · path · exact · sectionLabel** 전체를 JSON 직렬화하여 대조.
Neture 는 `getAdminMenu()` 결과도 함께 포함.

| 서비스 | 그룹 | 항목(operator) | 항목(admin) | adminOnly 노출 차 | 전후 diff |
|---|---:|---:|---:|---:|:---:|
| kpa-society | 12 | 35 | 37 | 2 | **0** |
| glycopharm | 12 | 33 | 36 | 3 | **0** |
| k-cosmetics | 12 | 30 | 30 | 0 | **0** |
| neture | 10 | 22 | 42 | 20 | **0** |

- 대조 결과 **전체 파일 diff 0** (`menu-before.json` == `menu-after.json`).
- 2단계로 나누어 검증했다.
  1. 서비스 코드 수정 **전**, 공통 함수 결과 vs 각 서비스 기존 함수 결과 → 동일 (함수 등가성)
  2. 서비스 코드 수정 **후**, 재산출 → 동일 (`UNIFIED_MENU` 정의 무변경 확인)
- Neture 의 operator sidebar 는 `isAdmin=false` 고정이므로 위 표의 `항목(operator)=22` 가 실제 노출값이다.
  adminOnly 20건이 operator 화면에 나오지 않는 것은 **기존과 동일한 의도된 정책**이며 본 작업에서 변경하지 않았다.

### 빌드 · 타입

| 대상 | 결과 |
|---|---|
| `packages/ui` `tsc --build` | PASS |
| 4 서비스 `tsc --noEmit` | PASS |
| 4 서비스 `vite build` | PASS (kpa 17.25s / glyco 22.88s / kcos 13.54s / neture 13.09s) |

빌드 중 발견·수정 1건: K-Cosmetics config 에서 `OperatorMenuItem` 이 local interface 제거로 미사용이 되어 `TS6196` → 해당 type import 만 정리.

---

## 5. 중지 조건 해당 없음

- 공용 함수에 서비스별 분기 **불필요** (§2 의 K-Cosmetics 차이는 실 노출 영향 0으로 확인)
- role · route · capability · `package.json` · lockfile 변경 **0**
- 다른 세션의 dirty 파일(`apps/admin-dashboard/src/pages/partnerops/**`) 미접촉

---

## 6. 남은 항목 (본 WO 범위 밖)

| # | 항목 | 비고 |
|---|---|---|
| 1 | `filterContextualNav` 공통화 | G3-B 후보. 본 WO 미수정 |
| 2 | Neture adminOnly 20건이 operator 화면에서 항상 숨겨지는 구조 | 선행 감사 S5. 정책 판단 필요 — 코드 변경 아님 |
| 3 | 실브라우저 검증 | 미수행. 본 변경은 순수 함수 치환이며 전후 산출물 JSON 동일성으로 대체 검증했다. **숨기지 않고 명시한다** |

---

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
