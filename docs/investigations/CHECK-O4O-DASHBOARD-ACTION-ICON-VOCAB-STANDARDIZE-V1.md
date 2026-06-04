# CHECK-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1

**작성 일자**: 2026-05-31
**작업 성격**: Phase B 완료 CHECK — KPA backend emoji → lucide-name 정렬 + ActionIcon vocabulary 7종 확장 (9 → 16)
**선행 Phase**:
- Phase A WO (`8f730ebf5`) + Fix (`272312a15`) + Live smoke PASS (`1736d7320`) — ActionIcon `ICON_NAME_MAP` 9종 도입 + emoji fallback
- Phase B WO 문서 (`79931c6e8`)
**상위 정책**: WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1

---

## 0. 핵심 결론 (TL;DR)

> ✅ **PASS** — Phase B 코드 작업 완료
>
> 1. **KPA backend quickActions 12 icon emoji → lucide-name 정렬** — `apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts` line 614-627 의 12 icon 값 (`🧑‍💼 / 💊 / 🛒 / 📝 / 📢 / 💬 / 🖥️ / 🏪 / 🎯 / 🏠 / 🔑 / 📋`) → `users / clipboard-list / shopping-cart / file-text / megaphone / message-square / monitor-play / store / badge-percent / home / key / scroll-text` 로 교체.
> 2. **ActionIcon vocabulary 16종 확장** — `operator-ux-core` + `admin-ux-core` 양쪽 `ActionIcon.tsx` 에 7 신규 lucide 매핑 추가 (`clipboard-list / megaphone / message-square / monitor-play / badge-percent / home / scroll-text`). Phase A 9종 + Phase B 7종 = **16종 vocabulary 확정**.
> 3. **KPA 12 icon 모두 vocabulary 16종 안에 포함** — 누락 0.
> 4. **GlycoPharm / K-Cosmetics / Neture 백엔드 icon 값 미접촉** — 회귀 0 (Phase A 의 lucide-name 사용 유지 + Neture operator 의 emoji 4개는 ActionIcon emoji fallback 으로 회귀 0).
> 5. **TypeScript 통과** — api-server 0 errors, operator-ux-core 0 errors, admin-ux-core 0 errors.
> 6. **QuickActionBlock / StructureActionBlock 렌더 로직 미수정** — ActionIcon map 확장만, 컴포넌트 동작 변경 0.

권고 단계: ① 본 CHECK 로 Phase B PASS 확정 → ② 배포 후 KPA `/operator` 화면 smoke (선택, PASS 자격 영향 없음) → ③ Phase C — KPA/GlycoPharm admin 프론트 하드코딩 emoji 수렴

---

## 1. 작업 영역

### 1.1 수정 파일 (정확히 3개)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts` | quickActions 12 icon emoji → lucide-name 교체 |
| `packages/operator-ux-core/src/blocks/ActionIcon.tsx` | ICON_NAME_MAP 7 신규 추가 + lucide import 확장 |
| `packages/admin-ux-core/src/blocks/ActionIcon.tsx` | ICON_NAME_MAP 7 신규 추가 + lucide import 확장 (operator-ux-core 와 동일 vocabulary) |

### 1.2 미접촉 영역 (Phase B 범위 외)

- `QuickActionBlock` / `StructureActionBlock` 렌더 로직 — **변경 0**
- GlycoPharm / K-Cosmetics / Neture 백엔드 dashboard service / controller — **변경 0** (Phase A 의 lucide-name 그대로 보존)
- KPA / GlycoPharm admin 프론트 하드코딩 emoji (Phase C 영역) — **변경 0**
- DomainIASidebar / OperatorAreaShell — **변경 0**
- HeroBannerSection.tsx — **변경 0**
- Store Hub / Channels / Home 아이콘 정비 파일 — **변경 0**
- store-pop 등 다른 세션 WIP — **stage 없음**

---

## 2. KPA quickActions 12 icon 매핑

### 2.1 정확한 매핑 (operator 9 + admin 3)

| id | label | path | Before (emoji) | After (lucide-name) |
|----|-------|------|:--------------:|:-------------------:|
| qa-members | 회원 관리 | `/operator/members` | 🧑‍💼 | `users` |
| qa-pharmacy-requests | 약국 서비스 신청 | `/operator/pharmacy-requests` | 💊 | `clipboard-list` |
| qa-product-apps | 상품 신청 관리 | `/operator/product-applications` | 🛒 | `shopping-cart` |
| qa-content | 콘텐츠 관리 | `/operator/content` | 📝 | `file-text` |
| qa-news | 공지사항 | `/operator/news` | 📢 | `megaphone` |
| qa-forum | 포럼 관리 | `/operator/forum-management` | 💬 | `message-square` |
| qa-signage | 사이니지 | `/operator/signage/hq-media` | 🖥️ | `monitor-play` |
| qa-stores | 매장 관리 | `/operator/stores` | 🏪 | `store` |
| qa-event-offers | 이벤트 오퍼 | `/operator/event-offers` | 🎯 | `badge-percent` |
| qa-community (admin) | Home 편집 | `/operator/community` | 🏠 | `home` |
| qa-roles (admin) | 역할 관리 | `/operator/roles` | 🔑 | `key` |
| qa-audit (admin) | 감사 로그 | `/operator/audit-logs` | 📋 | `scroll-text` |

### 2.2 의미 정합 노트

- **qa-pharmacy-requests** "약국 서비스 신청" → `clipboard-list` (신청서 목록 의미 — 약국/약품 아이콘이 vocabulary 에 없으므로 신청서 관리 의미 적용)
- **qa-event-offers** "이벤트 오퍼" → `badge-percent` (할인/이벤트 의미)
- **qa-audit** "감사 로그" → `scroll-text` (긴 기록 의미. `clipboard-list` 대신 audit log 의 시간순 기록 의미 살림)

---

## 3. ActionIcon vocabulary 16종

### 3.1 최종 vocabulary (양쪽 동일)

| # | lucide-name | lucide Component | Phase |
|:-:|-------------|------------------|:-----:|
| 1 | users | Users | A |
| 2 | shield | Shield | A |
| 3 | store | Store | A |
| 4 | dollar-sign | DollarSign | A |
| 5 | percent | Percent | A |
| 6 | key | Key | A |
| 7 | package | Package | A |
| 8 | file-text | FileText | A |
| 9 | shopping-cart | ShoppingCart | A |
| 10 | **clipboard-list** | ClipboardList | **B** |
| 11 | **megaphone** | Megaphone | **B** |
| 12 | **message-square** | MessageSquare | **B** |
| 13 | **monitor-play** | MonitorPlay | **B** |
| 14 | **badge-percent** | BadgePercent | **B** |
| 15 | **home** | Home | **B** |
| 16 | **scroll-text** | ScrollText | **B** |

### 3.2 ICON_NAME_MAP 변경 (양쪽 동일)

```ts
// Phase A (9 entries) + Phase B (7 entries) = 16
const ICON_NAME_MAP: Record<string, LucideIcon> = {
  // Phase A
  users: Users,
  shield: Shield,
  store: Store,
  'dollar-sign': DollarSign,
  percent: Percent,
  key: Key,
  package: Package,
  'file-text': FileText,
  'shopping-cart': ShoppingCart,
  // Phase B (WO-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1)
  'clipboard-list': ClipboardList,
  megaphone: Megaphone,
  'message-square': MessageSquare,
  'monitor-play': MonitorPlay,
  'badge-percent': BadgePercent,
  home: Home,
  'scroll-text': ScrollText,
};
```

### 3.3 Phase A 동작 보존

| 동작 | 보존 여부 |
|------|:--------:|
| lucide-name 매핑 시 lucide 컴포넌트 렌더 (size=18, className) | ✅ |
| emoji 등 비-ASCII fallback → `<span className="text-lg">{icon}</span>` 통과 | ✅ |
| NAME_LIKE (`/^[a-z0-9-]+$/i`) 매칭 + 미매핑 → `null` 반환 (텍스트 노출 방지) | ✅ |

→ Neture operator 의 emoji 4개 (👥/📝/🏪/📦) 등 미정렬 서비스 회귀 0.

---

## 4. KPA 12 icon vocabulary 커버리지 검증

| KPA icon-name | vocabulary 16종 포함 |
|---------------|:-------------------:|
| `users` | ✅ |
| `clipboard-list` | ✅ |
| `shopping-cart` | ✅ |
| `file-text` | ✅ |
| `megaphone` | ✅ |
| `message-square` | ✅ |
| `monitor-play` | ✅ |
| `store` | ✅ |
| `badge-percent` | ✅ |
| `home` | ✅ |
| `key` | ✅ |
| `scroll-text` | ✅ |

→ **12 / 12 매핑 가능. 누락 0**.

---

## 5. Cross-service 회귀 검증 (read-only)

### 5.1 GlycoPharm operator (변경 없음)

`apps/api-server/src/routes/glycopharm/services/operator-dashboard.service.ts` quickActions 3 icon:

| icon | vocabulary 안 |
|------|:------------:|
| `store` | ✅ |
| `package` | ✅ |
| `file-text` | ✅ |

→ Phase A 의 lucide-name 그대로 보존. **회귀 0**.

### 5.2 Neture operator (변경 없음 — emoji 유지)

`apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts` quickActions 일부 emoji:

| id | icon | ActionIcon 처리 |
|----|:----:|----------------|
| go-members | 👥 | emoji fallback (span 통과) |
| go-applications | 📝 | emoji fallback |
| go-suppliers | 🏪 | emoji fallback |
| go-product-approvals | 📦 | emoji fallback |

→ Phase B 범위 외. ActionIcon emoji fallback 정확 동작. **회귀 0**.

### 5.3 Neture admin (변경 없음)

`apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts` 6 icon:

| icon | vocabulary 안 |
|------|:------------:|
| `users` / `shield` / `store` / `dollar-sign` / `percent` / `key` | ✅ 모두 |

→ Phase A 의 lucide-name 그대로 보존. **회귀 0**.

### 5.4 K-Cosmetics operator (변경 없음)

`apps/api-server/src/routes/cosmetics/controllers/operator-dashboard.controller.ts` 4 icon:

| icon | vocabulary 안 |
|------|:------------:|
| `store` / `package` / `shopping-cart` / `file-text` | ✅ 모두 |

→ Phase A 의 lucide-name 그대로 보존. **회귀 0**.

---

## 6. TypeScript 결과

| 영역 | 검사 명령 | Errors |
|------|----------|:------:|
| `apps/api-server` | `npx tsc --noEmit` | **0** ✅ |
| `packages/operator-ux-core` | `npx tsc --noEmit` | **0** ✅ |
| `packages/admin-ux-core` | `npx tsc --noEmit` | **0** ✅ |

→ 본 WO 영역 신규 회귀 0.

---

## 7. QuickActionBlock / StructureActionBlock 렌더 로직 검증

- `QuickActionBlock` / `StructureActionBlock` 컴포넌트 자체 코드 변경 **0**
- `ActionIcon` 만 ICON_NAME_MAP 확장 (lucide import + map entry 추가)
- ActionIcon 의 호출부 (QuickActionBlock 등) 시그니처 / props 변경 0

→ **렌더 로직 보존**. 동작 변화는 KPA 12 icon 이 emoji 가 아닌 lucide 컴포넌트로 렌더되는 것 뿐 (의도된 변화).

---

## 8. 보안 / staging 정합

- **path-specific staging only** — `git add` 시 3 파일 명시 (`apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts` + `packages/operator-ux-core/src/blocks/ActionIcon.tsx` + `packages/admin-ux-core/src/blocks/ActionIcon.tsx`) 예정
- `git add .` / `git commit -am` 금지 준수
- 다른 세션 WIP / staged 파일 — pre-commit 시점 확인 (현재 working tree clean)
- Source file 외 수정 0

---

## 9. 최종 판정

### ✅ **PASS**

| 판정 기준 | 결과 |
|----------|:----:|
| KPA backend quickActions 12 emoji → lucide-name 정렬 | ✅ |
| ActionIcon vocabulary 7 신규 추가 (양쪽 동일) | ✅ |
| 최종 vocabulary 16종 정합 (Phase A 9 + Phase B 7) | ✅ |
| KPA 12 icon 모두 vocabulary 커버 | ✅ 12/12 |
| GlycoPharm / K-Cosmetics / Neture 백엔드 미접촉 | ✅ |
| Phase A emoji fallback 보존 (회귀 0) | ✅ |
| QuickActionBlock / StructureActionBlock 렌더 로직 미수정 | ✅ |
| api-server typecheck | ✅ 0 errors |
| operator-ux-core typecheck | ✅ 0 errors |
| admin-ux-core typecheck | ✅ 0 errors |

### 결론

> **Phase B 코드 작업 완료**. KPA backend 가 vocabulary 16종 의 lucide-name 12개 사용, 양쪽 ActionIcon 이 동일 vocabulary 정합. Phase A 의 emoji fallback 보존으로 Neture operator 등 미정렬 영역 회귀 0.
>
> 배포 후 KPA `/operator` 화면에서 12 icon 이 lucide 컴포넌트로 렌더 — 사용자 manual smoke 권장 (선택, PASS 자격 영향 없음).

---

## 10. 후속

### 10.1 Phase B 완료 후 즉시 권장

- ✅ 본 commit + push (path-restricted)
- (선택) 배포 후 KPA `/operator` 화면 brower smoke

### 10.2 다음 단계: Phase C

- **Phase C** — KPA / GlycoPharm admin 프론트 하드코딩 emoji 수렴
- 본 WO 범위 외. Phase B 완료 후 별도 trigger 시 진행

### 10.3 장기 (선택)

- Cross-service contract 단일화 (Option D Future IR)
- ActionIcon vocabulary 확장 시 lucide 16종 → 신규 icon 추가 정책 문서화

---

## 11. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 작성 문서 | `docs/investigations/CHECK-O4O-DASHBOARD-ACTION-ICON-VOCAB-STANDARDIZE-V1.md` |
| 수정 파일 (코드) | 3개 — KPA service + operator-ux-core ActionIcon + admin-ux-core ActionIcon |
| KPA 12 icon 매핑 | ✅ 12/12 vocabulary 16종 안 |
| Vocabulary 16종 (양쪽 동일) | ✅ Phase A 9 + Phase B 7 |
| GlycoPharm / K-Cos / Neture 백엔드 미접촉 | ✅ |
| TypeScript | ✅ api-server / operator-ux-core / admin-ux-core 모두 0 errors |
| QuickActionBlock / StructureActionBlock 미수정 | ✅ |
| DB / migration / route | ✅ 0 |
| 다른 세션 WIP 미포함 | ✅ (commit 시 path-restricted) |
| Commit 여부 | **사용자 승인 대기** — 본 CHECK 문서 1개 + WO 코드 3 파일 path-restricted commit 예정 |

---

> **상태**: Phase B 코드 작업 + CHECK 문서 작성 완료. **PASS**. Phase A emoji fallback 보존 + KPA backend 정렬 + ActionIcon vocabulary 16종 확장 정합. commit 은 사용자 승인 후 path-restricted (CHECK 1 + 코드 3 = 4 파일) 으로 진행 예정.
