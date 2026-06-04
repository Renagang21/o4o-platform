# WO-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1

> Operator/Admin 대시보드 공통 블록에서 **icon-name 문자열을 lucide 컴포넌트로 매핑**하여, `users`/`shield`/`store`/`dollar-sign` 등 아이콘명이 텍스트로 노출되는 결함을 해소한다. (IR Phase A)
> **본 문서는 작업 요청서이며, 코드 착수는 별도 지시 후 진행한다.**

- **작성일**: 2026-06-04
- **상태**: WO 작성 완료 / **코드 착수 대기**
- **Phase**: A (저위험, 핵심 — 가시적 결함 즉시 해소)
- **선행 IR**: [`IR-O4O-OPERATOR-ADMIN-QUICK-ACTIONS-ICON-AUDIT-V1`](../investigations/IR-O4O-OPERATOR-ADMIN-QUICK-ACTIONS-ICON-AUDIT-V1.md) (commit `bfbff58a3`)

---

## 1. 작업 목적

공통 대시보드 블록이 `item.icon`(string)을 `<span>{item.icon}</span>`로 그대로 렌더하여, 백엔드가 보내는 **lucide-name 문자열**(`users`/`shield`/`store`/`dollar-sign`/`percent`/`key`/`package`/`file-text`/`shopping-cart`)이 화면에 **텍스트로 노출**된다. 공통 블록에 **icon-name → lucide 컴포넌트 매핑**을 추가해 결함을 해소한다.

**즉시 해소 대상:** Neture `/admin` Structure Actions, GlycoPharm `/operator` Quick Actions, K-Cosmetics `/operator` Quick Actions.

---

## 2. 근본 원인 (IR 요약)

| 위치 | 코드 | 문제 |
|------|------|------|
| `packages/operator-ux-core/src/blocks/QuickActionBlock.tsx:24` | `{item.icon && <span className="text-lg">{item.icon}</span>}` | 문자열 직접 렌더 |
| `packages/admin-ux-core/src/blocks/StructureActionBlock.tsx:23` | 동일 | 문자열 직접 렌더 |

타입: `QuickActionItem.icon?: string`(`operator-ux-core/src/types.ts:78`), `StructureAction.icon?: string`(`admin-ux-core/src/types.ts:66`).

---

## 3. 매핑 대상 어휘 (백엔드 실측 union)

```text
Neture admin (structureActions):  users · shield · store · dollar-sign · percent · key
GlycoPharm operator (quickActions): store · package · file-text
K-Cosmetics operator (quickActions): store · package · shopping-cart · file-text
KPA operator (quickActions):       emoji (🧑‍💼💊🛒📝📢💬🖥️🏪🎯🏠🔑📋) ← Phase A 미변경
```

**lucide-name → 컴포넌트 매핑 (Phase A 최소 집합 9종):**

| name (kebab) | lucide |
|--------------|--------|
| `users` | `Users` |
| `shield` | `Shield` (또는 `ShieldCheck`) |
| `store` | `Store` |
| `dollar-sign` | `DollarSign` |
| `percent` | `Percent` |
| `key` | `Key` |
| `package` | `Package` |
| `file-text` | `FileText` |
| `shopping-cart` | `ShoppingCart` |

> 매핑 집합은 위 union을 **최소 커버**한다. 향후 이름 추가 대비 확장 가능한 구조로 둔다.

---

## 4. 작업 범위

```text
packages/operator-ux-core/src/blocks/QuickActionBlock.tsx      (icon 렌더 → 매핑)
packages/admin-ux-core/src/blocks/StructureActionBlock.tsx     (icon 렌더 → 매핑)
(필요 시) 공통 icon-name→lucide 매핑 유틸 1개
  - 두 패키지가 공유하려면 위치 결정 필요. 단순화를 위해 각 블록 로컬 ICON_NAME_MAP 도 허용
    (Phase A 우선 — 과한 공통화보다 결함 해소). 공유 유틸 채택 시 import 방향(Core→Extension) 위반 없는 위치 선택.
```

---

## 5. 제외 범위 (반드시 준수)

```text
- 백엔드 dashboard icon 값 변경 금지 (Phase B)
- KPA operator emoji → lucide-name 변경 금지 (Phase B)
- KPA / GlycoPharm admin 프론트 하드코딩 emoji 정리 금지 (Phase C)
- DomainIASidebar / OperatorAreaShell (operator drawer) 수정 금지
- packages/shared-space-ui/src/HeroBannerSection.tsx — 미접촉
- Store Hub / Channels / Home 아이콘 1차 정비 파일 — 미접촉
- 라벨 / 링크 / 순서 / 권한 / API — 변경 금지
```

---

## 6. 구현 방향

```text
1. ICON_NAME_MAP: Record<string, LucideIcon> 정의 (§3 9종 최소 커버).
2. 렌더 분기 (QuickActionBlock / StructureActionBlock 동일 패턴):
   - item.icon 이 ICON_NAME_MAP 에 있으면 → <Icon size={18} className="..."> 렌더
   - 매핑에 없고 비어있지 않으면 → 안전 fallback
       (a) emoji 등은 기존처럼 <span>{item.icon}</span> 으로 통과 (KPA emoji 회귀 0)
       (b) 알 수 없는 일반 문자열은 텍스트 노출을 피하기 위해 아이콘 생략 권장
     → 단, "lucide-name 으로 보이는데 매핑 누락" 케이스가 텍스트로 새지 않도록 §3 union 은 반드시 전부 매핑.
3. 크기/색: 기존 span(text-lg, ~18px) 시각 비중 유지. 기본 색은 주변 텍스트(slate-700 계열) 정합.
4. 라벨/링크/순서/권한 불변.
```

> **fallback 설계 핵심:** emoji(KPA)는 그대로 통과시켜 깨지지 않게 하고, §3의 lucide-name 9종은 빠짐없이 매핑해 텍스트 노출을 0으로 만든다. emoji와 name 을 구분하는 간단 기준(ASCII 영문/하이픈 = name 후보 → 매핑 없으면 생략; 비-ASCII = emoji → 통과) 적용 가능.

---

## 7. 검증 기준 (코드 단계)

### 7.1 정적
```bash
cd packages/operator-ux-core && npx tsc --noEmit
cd packages/admin-ux-core && npx tsc --noEmit
```
- consumer 서비스 최소 1곳(예: web-neture) `tsc --noEmit` 회귀 확인 권장.

### 7.2 화면 smoke (배포 또는 local)
```text
- Neture /admin Structure Actions: users/shield/store/dollar-sign/percent/key 텍스트 → lucide 아이콘으로 표시
- GlycoPharm /operator Quick Actions: store/package/file-text 텍스트 해소
- K-Cosmetics /operator Quick Actions: store/package/shopping-cart/file-text 텍스트 해소
- KPA /operator Quick Actions: 기존 emoji 표시 회귀 없음 (Phase A 미변경)
- 라벨/링크/클릭/순서 회귀 없음
- desktop/mobile 가능하면 확인
```

---

## 8. Git 기준

```text
- path-specific staging만 사용 (git add . / git commit -am 금지)
- commit 직전: git status --short / git diff --cached --name-only / git diff --name-only
- HeroBannerSection.tsx / DomainIASidebar / OperatorAreaShell staged 시 즉시 중단·보고
- 작업 끝나면 즉시 path-specific 커밋
```
권장 커밋 메시지: `fix(dashboard): map quick/structure action icon names to lucide`

---

## 9. CHECK 문서 기준

작업 완료 후:
```text
docs/investigations/CHECK-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1.md
```
포함: 1 최종 판정 / 2 근본 원인·수정 요약 / 3 수정 파일 / 4 매핑한 icon-name 목록 / 5 변경하지 않은 항목(백엔드/KPA emoji/admin 프론트/drawer) / 6 TS 결과 / 7 desktop·mobile smoke(Neture admin·Glyco/KCos operator·KPA 회귀) / 8 staged 검증 / 9 후속(Phase B/C).

---

## 10. 완료 기준

```text
- 공통 블록 2곳에 icon-name → lucide 매핑 도입 + 안전 fallback
- §3 union 9종 lucide-name 텍스트 노출 0
- KPA operator emoji 회귀 없음
- 백엔드/admin 프론트/drawer 파일 미접촉
- 라벨/링크/순서/권한/API 불변
- operator-ux-core / admin-ux-core tsc PASS
- Neture admin · Glyco/KCos operator smoke PASS
- 의도한 파일만 staged/commit
- CHECK 작성 / push 완료
```

---

## 11. 후속 (Phase B/C)

```text
B. WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1 — KPA 백엔드 emoji→lucide-name + 4서비스 어휘 카탈로그 고정
C. WO-O4O-ADMIN-QUICKACTION-FRONTEND-CONVERGE-V1 — Glyco/KPA admin 프론트 emoji 하드코딩 수렴
```

---

*Phase A — 공통 블록 2곳 매핑. 백엔드/KPA emoji/admin 프론트/drawer 미접촉. 본 문서는 요청서이며 코드 변경을 포함하지 않는다.*
