# IR-O4O-OPERATOR-ADMIN-QUICK-ACTIONS-ICON-AUDIT-V1

> **조사 전용 (read-only).** 코드/CSS/아이콘 수정 없음. Operator/Admin 대시보드의 Quick Actions(운영) / Structure Actions(관리) 아이콘 렌더링 정합성을 조사하고 공통 수정 방향을 제시한다.

- **작성일**: 2026-06-04
- **작업 유형**: Investigation (IR)
- **계기**: Neture `/admin` Structure Actions 가 lucide 아이콘명(`users`/`shield`/`store`/`dollar-sign`/`percent`/`key`)을 **텍스트로 노출**하는 결함 (Neture Phase 4 live smoke 중 발견). GlycoPharm `/operator` Quick Actions 도 동일 증상(`store`/`package`/`file-text` 텍스트).
- **조사 범위**: `packages/operator-ux-core`, `packages/admin-ux-core`, 4서비스 operator/admin dashboard 프론트, `apps/api-server` dashboard 백엔드

---

## 1. Executive Summary

**근본 원인: 공통 대시보드 블록이 `item.icon`(string)을 lucide 컴포넌트로 매핑하지 않고 `<span>{item.icon}</span>`으로 그대로 렌더한다.** 백엔드 dashboard 서비스가 아이콘을 **문자열**로 내려주는데, Neture/Glyco/KCos는 **lucide 이름 문자열**을 보내므로 그 이름이 화면에 텍스트로 찍힌다.

| 항목 | 결과 |
|------|------|
| 근본 원인 | 공통 블록 2곳이 `{item.icon}` 문자열을 직접 렌더 (icon-name → 컴포넌트 매핑 부재) |
| 결함 노출 서비스 | **Neture admin / GlycoPharm operator / K-Cosmetics operator** (백엔드가 lucide-name 문자열 전송) |
| 가려진 케이스 | **KPA operator** — 백엔드가 emoji 문자열 전송 → 텍스트지만 emoji로 보여 결함이 안 보임(그러나 lucide 표준 위반) |
| 프론트 하드코딩 케이스 | KPA admin / GlycoPharm admin — 프론트에서 emoji 직접 하드코딩(공통 블록 우회) |
| 수정 위치 | **공통 블록 2곳**(`QuickActionBlock`/`StructureActionBlock`)에 icon-name→lucide 매핑 추가 → 다수 서비스 일괄 해소 |

---

## 2. 근본 원인 (코드 인용)

### 2.1 Operator Quick Actions
[`packages/operator-ux-core/src/blocks/QuickActionBlock.tsx:24`](../../packages/operator-ux-core/src/blocks/QuickActionBlock.tsx#L24)
```tsx
{item.icon && <span className="text-lg">{item.icon}</span>}
```
- `QuickActionItem.icon?: string` (`operator-ux-core/src/types.ts:78`). 문자열을 그대로 렌더.

### 2.2 Admin Structure Actions
[`packages/admin-ux-core/src/blocks/StructureActionBlock.tsx:23`](../../packages/admin-ux-core/src/blocks/StructureActionBlock.tsx#L23)
```tsx
{item.icon && <span className="text-lg">{item.icon}</span>}
```
- `StructureAction.icon?: string` (`admin-ux-core/src/types.ts:66`). 동일 패턴.

→ `item.icon`이 `'users'`/`'store'`/`'dollar-sign'` 같은 **lucide 이름**이면 그 글자가 화면에 그대로 노출된다. emoji면 emoji가 보인다. **컴포넌트 매핑이 없다.**

---

## 3. 백엔드 아이콘 전송 형태 (서비스별 — 불일치)

| 서비스 | 파일 | 필드 | icon 값 형태 | 예시 |
|--------|------|------|-------------|------|
| **Neture admin** | `apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts:163-170` | `structureActions` | **lucide-name string** | `users` `shield` `store` `dollar-sign` `percent` `key` |
| **GlycoPharm operator** | `apps/api-server/src/routes/glycopharm/services/operator-dashboard.service.ts:102-106` | `quickActions` | **lucide-name string** | `store` `package` `file-text` |
| **K-Cosmetics operator** | `apps/api-server/src/routes/cosmetics/controllers/operator-dashboard.controller.ts:128-133` | `quickActions` | **lucide-name string** | `store` `package` `shopping-cart` `file-text` |
| **KPA operator** | `apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts:613-630` | `quickActions` | **emoji** (outlier) | `🧑‍💼` `💊` `🛒` `📝` `📢` `💬` `🖥️` `🏪` `🎯` `🏠` `🔑` `📋` |

**관찰:** 같은 공통 블록을 쓰지만 백엔드가 보내는 icon 어휘가 **서비스마다 다르다** (lucide-name vs emoji). 어느 쪽도 컴포넌트로 매핑되지 않으므로 둘 다 부정확하다 (lucide-name=텍스트 결함 / emoji=lucide 표준 위반).

---

## 4. 프론트 하드코딩 케이스 (공통 블록 우회)

| 화면 | 파일 | 방식 |
|------|------|------|
| GlycoPharm **admin** | `services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx:122-128` | emoji(`👤🏥💰📄🛡️⚙️`) 프론트 하드코딩 (Quick Actions 배열) |
| KPA **admin** | `services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx:35-36` | emoji(`👤📊`) 프론트 하드코딩 |
| GlycoPharm/KCos **operator** | `*OperatorDashboard.tsx` → `OperatorDashboardLayout` → `QuickActionBlock` | 백엔드 quickActions 위임 → §2 결함 노출 |

> 즉 admin 일부는 프론트 emoji 하드코딩(공통 블록 우회), operator는 백엔드 위임(공통 블록 사용). 혼재.

---

## 5. 이미 존재하는 올바른 패턴 (참고)

- `apps/admin-dashboard/src/components/widgets/actions/QuickActionsWidget.tsx:12-27` — **icon-name → lucide 컴포넌트 `iconMap`** 를 두고 `const Icon = iconMap[action.icon]`로 렌더. (단, 이 위젯은 공통 dashboard 레이아웃에서 미사용.)
- `packages/admin-ux-core/src/blocks/AdminLinkBlock.tsx` — icon 을 **ReactNode**로 받아 호출처가 lucide 주입(정상). Neture admin의 Finance/Governance 블록은 이 경로라 정상 렌더.
- `packages/ui/src/operator-shell/constants.ts` `STANDARD_GROUPS` — operator 그룹 lucide 중앙 정의(아이콘 표준 레버리지).

→ 수정 시 **이 `iconMap` 패턴을 공통 블록에 도입**하면 된다(새 구조 불필요).

---

## 6. 조사 항목별 결론

| 질문 | 답 |
|------|----|
| Quick Actions가 icon을 어떤 타입으로 전달? | **string** (백엔드 → `icon?: string`). Neture/Glyco/KCos=lucide-name, KPA=emoji |
| Neture admin 텍스트 노출 원인? | 공통 `StructureActionBlock`이 lucide-name 문자열을 `<span>{icon}</span>`로 직접 렌더(매핑 부재) |
| 구현 공통 vs 개별? | **렌더는 공통**(2 블록), **icon 데이터는 백엔드별 상이** + admin 일부 프론트 하드코딩 |
| 공통 수정 가능? | **예** — 공통 블록 2곳에 name→lucide 매핑 추가 시 operator(Glyco/KCos/KPA) + Neture admin 일괄 해소 |
| emoji/문자열 잔존 위치? | 백엔드 4 서비스 dashboard 서비스 + Glyco/KPA admin 프론트 |
| 우선 수정 대상 | (1) 공통 블록 매핑, (2) KPA 백엔드 emoji→lucide-name 정렬, (3) icon-name 어휘 표준화 |

---

## 7. 권장 수정 방향 (후속 WO — 본 IR 범위 밖)

### Phase A — 공통 블록 매핑 (저위험, 핵심)
- `QuickActionBlock`/`StructureActionBlock`에 **icon-name(kebab) → lucide 컴포넌트 매핑**(`ICON_NAME_MAP`) 도입. `iconMap[name]` 존재 시 `<Icon size=18>`, 미존재 시 안전 fallback(아이콘 생략 또는 기본). emoji 문자열도 그대로 통과(폴백)시켜 회귀 0.
- 매핑 어휘는 백엔드가 보내는 이름 합집합(`users/shield/store/dollar-sign/percent/key/package/file-text/shopping-cart` …)을 커버. `QuickActionsWidget`/`STANDARD_GROUPS` 참고.

### Phase B — 백엔드 icon 어휘 표준화 (중위험)
- KPA operator dashboard 서비스의 **emoji → lucide-name 문자열**로 정렬(4서비스 동일 어휘). 그래야 Phase A 매핑으로 일관 렌더.
- 4서비스 dashboard 서비스의 icon-name 어휘를 공통 카탈로그로 고정.

### Phase C — admin 프론트 하드코딩 정리 (저위험)
- GlycoPharm/KPA admin 프론트의 emoji 하드코딩 Quick Actions를 공통 블록 + lucide 매핑 경로로 수렴(또는 lucide ReactNode 주입).

**우선순위: A → B → C.** Phase A만으로 Neture admin / Glyco·KCos operator의 가시적 텍스트 결함이 즉시 해소된다.

---

## 8. 위험 요소

- **백엔드 계약 변경(Phase B)**: dashboard 응답 icon 값 변경은 4서비스 + 공통 블록 영향. 별도 WO·검증 필요.
- **icon-name 어휘 누락**: 매핑에 없는 이름이 오면 빈 칸/깨짐 → 반드시 안전 fallback.
- **공통 블록 동시 사용처**: `operator-ux-core`/`admin-ux-core`는 4서비스 공유. 변경 시 전 서비스 회귀 확인(operator drawer 작업과 동일 주의).
- **operator drawer 파일 미접촉**: 본 건은 `QuickActionBlock`/`StructureActionBlock`이며 `DomainIASidebar`/`OperatorAreaShell`과 무관. 그 파일들은 건드리지 않는다.
- **동시 세션 staging 혼입** 주의(반복 이슈).

---

## 9. 이번 작업에서 제외

- 코드/CSS/아이콘 수정, 매핑 구현 — **전부 본 IR 범위 밖** (후속 WO)
- `DomainIASidebar`/`OperatorAreaShell`(operator drawer) — 미접촉
- `HeroBannerSection.tsx` — 미접촉
- 4서비스 아이콘 1차 정비 파일(StoreHub/Channels/Home 등) — 미접촉

---

## 10. 후속 작업 제안

1. **WO-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1** (Phase A) — 공통 블록 2곳에 icon-name→lucide 매핑 + 안전 fallback. Neture admin/Glyco·KCos operator 즉시 해소. 4서비스 dashboard 회귀 smoke.
2. **WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1** (Phase B) — KPA 백엔드 emoji→lucide-name + 4서비스 어휘 카탈로그 고정.
3. **WO-O4O-ADMIN-QUICKACTION-FRONTEND-CONVERGE-V1** (Phase C) — admin 프론트 emoji 하드코딩 수렴.

> 본 IR은 git commit 한다(조사 기록). 코드 변경 없음.

---

### 부록. 핵심 파일 인덱스
- 공통 렌더(버그): `packages/operator-ux-core/src/blocks/QuickActionBlock.tsx:24`, `packages/admin-ux-core/src/blocks/StructureActionBlock.tsx:23`
- 타입: `operator-ux-core/src/types.ts:78`(`QuickActionItem.icon?: string`), `admin-ux-core/src/types.ts:66`(`StructureAction.icon?: string`)
- 백엔드 icon 정의: `modules/neture/controllers/admin-dashboard.controller.ts:163-170`, `routes/glycopharm/services/operator-dashboard.service.ts:102-106`, `routes/cosmetics/controllers/operator-dashboard.controller.ts:128-133`, `routes/kpa/services/operator-dashboard.service.ts:613-630`
- 올바른 참고 패턴: `apps/admin-dashboard/src/components/widgets/actions/QuickActionsWidget.tsx:12-27`, `packages/admin-ux-core/src/blocks/AdminLinkBlock.tsx`
- 프론트 하드코딩: `services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx:122-128`, `services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx:35-36`

*조사 방식: read-only 병렬 코드 조사(Explore agents) + 핵심 라인 직접 확인. 코드/CSS/아이콘 변경 없음.*
