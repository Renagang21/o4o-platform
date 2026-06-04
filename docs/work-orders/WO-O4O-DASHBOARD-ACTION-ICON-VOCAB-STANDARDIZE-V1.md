# WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1

> 4서비스 dashboard quick/structure action 의 icon 값을 **lucide-name 어휘로 표준화**한다. 특히 KPA operator 의 emoji icon 을 lucide-name 문자열로 정렬하고, Phase A `ActionIcon` 매핑을 그에 맞춰 확장한다. (IR Phase B)
> **본 문서는 작업 요청서이며, 코드 착수는 별도 지시 후 진행한다.**

- **작성일**: 2026-06-04
- **상태**: WO 작성 완료 / **코드 착수 대기**
- **Phase**: B (백엔드 응답 icon 값 변경 동반 — 중위험)
- **선행**: IR [`IR-O4O-OPERATOR-ADMIN-QUICK-ACTIONS-ICON-AUDIT-V1`](../investigations/IR-O4O-OPERATOR-ADMIN-QUICK-ACTIONS-ICON-AUDIT-V1.md) (`bfbff58a3`), Phase A [`CHECK-...ICON-NAME-MAP-V1`](../investigations/CHECK-O4O-DASHBOARD-ACTION-ICON-NAME-MAP-V1.md) (`272312a15` + smoke `1736d7320`)

---

## 1. 작업 목적

- 4서비스 dashboard quick/structure action icon vocabulary 를 **lucide-name 기준으로 표준화**한다.
- **KPA operator dashboard 의 emoji icon → lucide-name 문자열**로 정렬한다 (현재 KPA만 emoji outlier).
- Phase A 에서 추가한 `ActionIcon` 매핑 경로를 **정식 표준 경로**로 만든다.

Phase A 는 "렌더러 보정"(name→lucide)이었고, Phase B 는 "어휘 정렬"(데이터 값 표준화)이다.

---

## 2. ⚠️ 핵심 커플링 (반드시 함께 변경)

KPA emoji 12개를 lucide-name 으로 바꾸면, **Phase A 매핑 9종에 없는 새 이름**(megaphone / message-square / home 등 ~7종)이 생긴다.

- **백엔드 icon 값만 바꾸고 `ActionIcon` 매핑을 확장하지 않으면** → 새 name 은 `ActionIcon`의 `NAME_LIKE` 분기에서 **생략(null)** 되어, **KPA operator 가 아이콘을 아예 잃는다(emoji보다 후퇴)**.
- 따라서 **(A) 백엔드 KPA emoji→lucide-name 변경 + (B) `ActionIcon` ICON_NAME_MAP 확장**은 **같은 작업/같은 배포로 함께** 가야 한다.

> Phase A 의 `QuickActionBlock`/`StructureActionBlock` **렌더 로직은 불변**이다. 단, **`ActionIcon.tsx` 의 ICON_NAME_MAP(어휘 카탈로그)** 확장은 Phase B 범위다 (렌더 로직 ≠ 어휘 카탈로그). 두 패키지에 동일 사본이 있으므로 **둘 다** 확장한다.

---

## 3. 작업 범위

### 3.1 백엔드 (icon 값 정렬)
```text
apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts   (emoji → lucide-name) ← 주 대상
apps/api-server/src/routes/glycopharm/services/operator-dashboard.service.ts   (기존 lucide-name 어휘 점검)
apps/api-server/src/routes/cosmetics/controllers/operator-dashboard.controller.ts  (점검)
apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts  (점검)
```
- KPA 외 3서비스는 이미 lucide-name → **어휘가 표준과 맞는지 점검만**, 변경 최소화.

### 3.2 프론트 (어휘 카탈로그 확장)
```text
packages/operator-ux-core/src/blocks/ActionIcon.tsx   (ICON_NAME_MAP 확장)
packages/admin-ux-core/src/blocks/ActionIcon.tsx       (동일 확장)
(선택) dashboard action icon vocabulary 카탈로그 문서 또는 공유 상수
```

---

## 4. KPA emoji → lucide-name 매핑 제안

| KPA action | 현재 emoji | → lucide-name | lucide | Phase A 매핑 |
|------------|:---------:|---------------|--------|:-----------:|
| 회원 관리 | 🧑‍💼 | `users` | Users | ✅ 기존 |
| 약국 서비스 신청 | 💊 | `clipboard-list` (신청 관리) | ClipboardList | ➕ 신규 |
| 상품 신청 관리 | 🛒 | `shopping-cart` | ShoppingCart | ✅ 기존 |
| 콘텐츠 관리 | 📝 | `file-text` | FileText | ✅ 기존 |
| 공지사항 | 📢 | `megaphone` | Megaphone | ➕ 신규 |
| 포럼 관리 | 💬 | `message-square` | MessageSquare | ➕ 신규 |
| 사이니지 | 🖥️ | `monitor-play` | MonitorPlay | ➕ 신규 |
| 매장 관리 | 🏪 | `store` | Store | ✅ 기존 |
| 이벤트 오퍼 | 🎯 | `badge-percent` | BadgePercent | ➕ 신규 |
| Home 편집 | 🏠 | `home` | Home | ➕ 신규 |
| 역할 관리 | 🔑 | `key` | Key | ✅ 기존 |
| 감사 로그 | 📋 | `scroll-text` | ScrollText | ➕ 신규 |

- **기존(Phase A) 재사용**: `users`/`shopping-cart`/`file-text`/`store`/`key` (5)
- **ActionIcon 신규 추가 필요**: `clipboard-list`/`megaphone`/`message-square`/`monitor-play`/`badge-percent`/`home`/`scroll-text` (7)
- `monitor-play`/`badge-percent` 는 기준 문서(`O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1` §5: 사이니지=MonitorPlay, 이벤트=BadgePercent)와 정합.
- "약국 서비스 신청" 은 기능이 신청/요청 관리이므로 `clipboard-list` 권장(약국=`pill` 대신 기능 의미 우선). 착수 시 최종 결정.

> 위 매핑은 **제안**이며, 코드 착수 시 라벨/링크 의미와 기준 문서 §5에 맞춰 최종 확정한다.

---

## 5. 표준 vocabulary (Phase A 9 + Phase B 7 = 16)

```text
users · shield · store · dollar-sign · percent · key · package · file-text · shopping-cart   (Phase A)
clipboard-list · megaphone · message-square · monitor-play · badge-percent · home · scroll-text  (Phase B 추가)
```
- `ActionIcon` ICON_NAME_MAP 은 위 16종을 모두 커버해야 한다.
- 향후 추가 시: 백엔드가 새 name 을 보내기 **전에** ICON_NAME_MAP 에 먼저 추가(또는 동시 배포)하는 것을 표준 절차로 문서화.

---

## 6. 제외 범위

```text
- 프론트 하드코딩 admin Quick Actions(GlycoPharm/KPA admin emoji) 정리 — Phase C
- QuickActionBlock / StructureActionBlock 렌더 로직 — 변경 금지 (Phase A 완료, ActionIcon 매핑만 확장)
- DomainIASidebar / OperatorAreaShell (operator drawer) — 수정 금지
- HeroBannerSection.tsx — 미접촉
- Store Hub / Channels / Home 아이콘 정비 파일 — 미접촉
- store-pop 등 다른 세션 WIP 파일 — staging 금지
- dashboard 응답 구조 / 라벨 / 링크 / 순서 / 권한 / API endpoint — 변경 금지 (icon 값만)
```

---

## 7. 구현 방향

```text
1. ActionIcon ICON_NAME_MAP 에 §5 신규 7종 추가 (operator-ux-core + admin-ux-core 둘 다).
2. KPA operator-dashboard.service 의 quickActions icon emoji → §4 lucide-name 으로 교체.
3. Glyco/KCos/Neture 백엔드 icon-name 이 §5 표준 어휘에 포함되는지 점검 (벗어나면 표준 이름으로 정렬, 최소 변경).
4. (선택) 공유 vocabulary 카탈로그 상수/문서로 단일화 — drift 방지. Phase B 필수는 아님.
5. 백엔드 응답 구조/라벨/링크/순서 불변. icon 값만 변경.
```
> **배포 동시성**: 백엔드(icon 값)와 프론트(ActionIcon 확장)는 함께 배포되어야 KPA 아이콘 누락 구간이 없다. (프론트 ICON_NAME_MAP 확장을 먼저/동시 배포하는 것이 안전.)

---

## 8. 검증 기준 (코드 단계)

```text
- apps/api-server tsc/build 검증
- packages/operator-ux-core, admin-ux-core tsc
- KPA operator dashboard API 응답 quickActions[].icon 이 emoji 아닌 lucide-name 인지 확인 (응답 검사)
- §4 의 모든 KPA icon-name 이 ActionIcon ICON_NAME_MAP 에 존재해 렌더 가능한지 확인 (누락 0)
- Neture/Glyco/KCos 응답 회귀 없음
- 화면 smoke: KPA /operator Quick Actions 가 lucide 아이콘으로 표시(emoji 아님) — 단 KPA operator 접근 권한 가드(test account) 이슈 시, 응답 검사 + 코드 정합으로 대체 검증
- Neture admin / Glyco·KCos operator 회귀 없음
```

---

## 9. Git 기준

```text
- path-specific staging만 사용 (git add . / git commit -am 금지)
- commit 직전: git status --short / git diff --cached --name-only / git diff --name-only
- store-pop 등 다른 세션 WIP / HeroBannerSection / drawer 파일 staged 시 즉시 중단·보고
- 작업 끝나면 즉시 path-specific 커밋
```
권장 커밋 메시지: `refactor(dashboard): standardize KPA action icons to lucide-name vocabulary`

---

## 10. CHECK 문서 기준

작업 완료 후:
```text
docs/investigations/CHECK-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1.md
```
포함: 1 최종 판정 / 2 수정 파일(백엔드+ActionIcon) / 3 KPA emoji→lucide-name 매핑 결과 / 4 표준 vocabulary(16종) / 5 변경하지 않은 항목(렌더 로직/admin 프론트/drawer) / 6 TS·build / 7 KPA 응답 검사 + 화면 smoke / 8 Neture/Glyco/KCos 회귀 / 9 staged 검증 / 10 후속(Phase C).

---

## 11. 완료 기준

```text
- KPA operator quickActions icon emoji → lucide-name 정렬
- ActionIcon ICON_NAME_MAP 이 표준 16종(§5) 전부 커버 (KPA 아이콘 누락 0)
- Glyco/KCos/Neture 어휘 표준 정합 확인(회귀 없음)
- 렌더 로직/admin 프론트/drawer 미접촉
- 라벨/링크/순서/권한/API 구조 불변
- api-server + 2 패키지 tsc/build PASS
- KPA 응답 검사 + (가능 시) 화면 smoke PASS
- 의도한 파일만 staged/commit (다른 세션 WIP 제외)
- CHECK 작성 / push 완료
```

---

## 12. 후속 (Phase C)

```text
WO-O4O-ADMIN-QUICKACTION-FRONTEND-CONVERGE-V1 — GlycoPharm/KPA admin 프론트 하드코딩 emoji Quick Actions 를
공통 블록(StructureActionBlock/AdminLinkBlock) + lucide 매핑 경로로 수렴.
```

---

*Phase B — 백엔드 icon 값 + ActionIcon 어휘 카탈로그 동시 정렬. 렌더 로직/admin 프론트/drawer 미접촉. 본 문서는 요청서이며 코드 변경을 포함하지 않는다.*
