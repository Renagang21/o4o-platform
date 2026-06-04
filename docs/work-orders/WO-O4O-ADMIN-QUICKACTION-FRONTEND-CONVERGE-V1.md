# WO-O4O-ADMIN-QUICKACTION-FRONTEND-CONVERGE-V1

**작성 일자**: 2026-05-31
**작업 성격**: Phase C WO 문서 — Admin 프론트 하드코딩 emoji Quick Actions 의 lucide-name 정렬
**선행 Phase**:
- Phase A WO (`8f730ebf5`) + Fix (`272312a15`) + Live smoke PASS (`1736d7320`) — ActionIcon ICON_NAME_MAP 9종 도입 + emoji fallback
- Phase B WO (`79931c6e8`) + Code (`da14028de`) — KPA backend emoji → lucide-name + vocabulary 16종 확장
- 상위 IR: bfbff58a3 (Quick/Structure Actions 흐름 조사)
**본 WO 단계**: WO 문서만 작성. 코드 작업은 별도 trigger 시점.

---

## 0. 목적

> KPA admin / GlycoPharm admin 화면에 남아 있는 **프론트 하드코딩 emoji Quick Actions** 를 lucide 기반 경로로 수렴하여 Phase A/B 의 ActionIcon vocabulary 와 일관된 시각 정합을 확보한다.
>
> Phase A/B 에서 정리한 ActionIcon vocabulary (16종) 와 충돌 없이 admin Quick Actions 표현을 정리한다.

---

## 1. 현재 admin 프론트 하드코딩 emoji 위치 (조사 완료)

### 1.1 KPA Admin Dashboard (2 emoji)

[`services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx`](../../services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx) line 34-37:

```ts
const STRUCTURE_ACTIONS: StructureAction[] = [
  { id: 'members',  label: '회원 관리',     link: '/operator/members', icon: '👤', description: '가입 신청 승인·반려·정지 처리' },
  { id: 'operator', label: '운영 대시보드', link: '/operator',         icon: '📊', description: 'operator 공간에서 운영 현황 확인' },
];
```

- 사용 컴포넌트: `AdminDashboardLayout` → `StructureActionBlock` (admin-ux-core) → `ActionIcon`
- 현재 동작: Phase A 의 ActionIcon emoji fallback (`span.text-lg`) 로 렌더 → 시각적 정상 / 단 lucide 정합은 미달

### 1.2 GlycoPharm Admin Dashboard (6 emoji)

[`services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx`](../../services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx) line 121-128:

```ts
const ADMIN_QUICK_ACTIONS: StructureAction[] = [
  { id: 'users',       label: '회원 관리',     link: '/admin/members',     icon: '👤',  description: '회원 조회·탈퇴·완전삭제 관리' },
  { id: 'pharmacies',  label: '약국 네트워크', link: '/admin/pharmacies',  icon: '🏥',  description: '약국 승인·네트워크 관리' },
  { id: 'settlements', label: '정산 관리',    link: '/admin/settlements', icon: '💰',  description: '정산 처리·내역 조회' },
  { id: 'invoices',    label: '인보이스',     link: '/admin/invoices',    icon: '📄',  description: '인보이스 발행·관리' },
  { id: 'roles',       label: '역할 관리',    link: '/admin/roles',       icon: '🛡️', description: '역할·권한 구조 관리' },
  { id: 'settings',    label: '설정',         link: '/admin/settings',    icon: '⚙️', description: '시스템 설정' },
];
```

- 사용 컴포넌트: `AdminDashboardLayout` → `StructureActionBlock` → `ActionIcon`
- Phase 2 의 `FINANCE_LINKS` / `GOVERNANCE_LINKS` / `NETWORK_LINKS` (`AdminBlockLink[]` 타입) 는 **이미 lucide ReactNode 직접 주입 패턴** 사용 중 — 모범 패턴.

### 1.3 admin-ux-core 인프라

| 영역 | 정의 |
|------|------|
| `StructureAction.icon` type | `string` (emoji 또는 lucide-name) — `packages/admin-ux-core/src/types.ts` line 65 |
| `AdminBlockLink.icon` type | `ReactNode` (lucide 컴포넌트 직접) — `packages/admin-ux-core/src/blocks/AdminLinkBlock.tsx` |
| `ActionIcon` 동작 | Phase A 의 lucide-name 매핑 + emoji fallback + NAME_LIKE skip (Phase B 에서 vocab 16종 확장) |

---

## 2. emoji → lucide 매핑 (Phase A/B vocabulary 와의 정합)

### 2.1 KPA + GlycoPharm admin 의 8 emoji 매핑

| 위치 | id | label | emoji | 매핑 lucide-name | vocab 16종 안 |
|------|----|-------|:----:|:----------------:|:-------------:|
| KPA admin | members | 회원 관리 | 👤 | `users` | ✅ |
| KPA admin | operator | 운영 대시보드 | 📊 | `bar-chart-3` | ❌ **신규 필요** |
| GP admin | users | 회원 관리 | 👤 | `users` | ✅ |
| GP admin | pharmacies | 약국 네트워크 | 🏥 | `building-2` | ❌ **신규 필요** |
| GP admin | settlements | 정산 관리 | 💰 | `dollar-sign` | ✅ |
| GP admin | invoices | 인보이스 | 📄 | `file-text` | ✅ |
| GP admin | roles | 역할 관리 | 🛡️ | `shield` | ✅ |
| GP admin | settings | 설정 | ⚙️ | `settings` | ❌ **신규 필요** |

### 2.2 vocabulary 16종 안에 없는 신규 lucide 3종

| lucide-name | lucide Component | 의미 |
|-------------|------------------|------|
| `bar-chart-3` | BarChart3 | 운영 대시보드 / 통계 |
| `building-2` | Building2 | 약국 네트워크 / 건물 (이미 GP `NETWORK_LINKS` 에서 lucide ReactNode 형태로 사용 중) |
| `settings` | Settings | 설정 / 환경 |

→ Phase A 9 + Phase B 7 + **Phase C 3** = **vocabulary 19종**

### 2.3 vocab 16종 안 매핑 5개 (재사용)

| lucide-name | KPA admin | GP admin | 비고 |
|-------------|:---------:|:--------:|------|
| `users` | members | users | 동일 매핑 (회원 관리) |
| `dollar-sign` | — | settlements | Phase A 정의 |
| `file-text` | — | invoices | Phase A 정의 |
| `shield` | — | roles | Phase A 정의 |
| (재사용 4개) | 1 | 4 | |

---

## 3. 옵션 비교

### Option A — ActionIcon vocabulary 확장 (16 → 19) ✅ **권장**

**범위**:
- `packages/operator-ux-core/src/blocks/ActionIcon.tsx` 의 ICON_NAME_MAP 에 3종 추가
- `packages/admin-ux-core/src/blocks/ActionIcon.tsx` 동일 3종 추가 (양쪽 일치)
- `KpaAdminDashboardPage.tsx` STRUCTURE_ACTIONS 의 2 emoji → lucide-name string 교체
- `GlycoPharmAdminDashboard.tsx` ADMIN_QUICK_ACTIONS 의 6 emoji → lucide-name string 교체

**장점**:
- Phase A/B 의 일관된 정책 유지 — string-based ICON_NAME_MAP 확장
- 단순 / type 변경 0 / 백엔드 호환 break 0
- ActionIcon 의 emoji fallback / NAME_LIKE skip 동작 그대로 보존
- vocabulary 일관성 (admin + operator 양쪽 동일 vocab 사용)

**단점**:
- vocab 점차 증가 (장기적으로 정책 문서화 필요)

**리스크**: 매우 낮음

### Option B — `StructureAction.icon` 을 `ReactNode` 로 type 확장

**범위**:
- `packages/admin-ux-core/src/types.ts` 의 `StructureAction.icon` type `string` → `ReactNode`
- `StructureActionBlock.tsx` 의 `ActionIcon` 호출 → 직접 ReactNode 렌더
- KPA admin / GP admin 의 emoji string → lucide 컴포넌트 직접 주입 (AdminBlockLink 와 동일 패턴)
- 백엔드 quickActions (operator 영역, KPA/GP/K-Cos/Neture) 호환 break — backend response 의 icon string 처리 별도 경로 필요

**장점**:
- AdminBlockLink 와 동일 패턴 — 일관성
- vocab 증가 없음

**단점**:
- backend 의 string icon 호환 break — operator dashboard 영역 영향 큼
- ActionIcon 의 emoji fallback 사라짐 (Neture operator emoji 4 회귀 위험)
- Phase A/B 정책과 충돌

**리스크**: 매우 높음

### Option C — `STRUCTURE_ACTIONS` 를 `AdminLinkBlock` 으로 전환

**범위**:
- KPA admin / GP admin 의 `ADMIN_QUICK_ACTIONS` (`StructureAction[]`) → `AdminBlockLink[]` 으로 전환
- `AdminDashboardLayout` 의 4-Block 구조 (D Structure Actions) 변경 또는 우회
- StructureActionBlock 호출 제거 → AdminLinkBlock 사용

**장점**:
- GP Phase 2 의 FINANCE/GOVERNANCE/NETWORK 패턴 정합

**단점**:
- AdminDashboardLayout 4-Block 표준 깨짐
- 다른 admin (Neture 등) 와 정합 손실 가능
- 큰 구조 변경 — 1인 개발 속도 부담

**리스크**: 중간

### Option D — 현 상태 유지 (수정 없음)

**범위**: 변경 없음

**장점**: 변경 0

**단점**:
- 8 emoji 가 ActionIcon emoji fallback 으로 렌더 — 시각 정합 미달
- Phase A/B 의 lucide 정합 정책과 일관성 부족
- 장기 시각 표현 일관성 떨어짐

**리스크**: 매우 낮음 (변경 없음) — 단 Phase C 의 목적 (admin 프론트 수렴) 미달성

### 권장: ✅ **Option A**

Phase A/B 와 동일 정책 (string-based ICON_NAME_MAP 확장) 유지. 신규 3 lucide 만 추가. 백엔드 호환 break 없음. emoji fallback 보존.

---

## 4. 작업 범위 (Option A 기준)

### 4.1 수정 대상 (정확히 4 파일)

| 파일 | 변경 |
|------|------|
| `packages/operator-ux-core/src/blocks/ActionIcon.tsx` | ICON_NAME_MAP 에 신규 3종 (`bar-chart-3`, `building-2`, `settings`) 추가 + lucide import 3개 |
| `packages/admin-ux-core/src/blocks/ActionIcon.tsx` | 동일 3종 추가 (양쪽 일치) |
| `services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx` | STRUCTURE_ACTIONS 2 icon emoji → lucide-name (`users`, `bar-chart-3`) |
| `services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx` | ADMIN_QUICK_ACTIONS 6 icon emoji → lucide-name (`users`, `building-2`, `dollar-sign`, `file-text`, `shield`, `settings`) |

### 4.2 변경하지 않을 항목

- ✅ 백엔드 dashboard service / controller icon 값 — Phase A/B 정렬 유지 (admin 프론트 정렬만)
- ✅ ActionIcon 의 emoji fallback / NAME_LIKE skip 동작 — Phase A 그대로 보존
- ✅ StructureAction.icon type — string 유지 (Option B 변경 거부)
- ✅ AdminDashboardLayout 4-Block 구조 — Phase 2 유지
- ✅ KPA admin / GP admin 의 `AdminLinkBlock` 사용 (GP Phase 2 의 FINANCE/GOVERNANCE/NETWORK) — 이미 lucide ReactNode 직접 패턴, 변경 0
- ✅ KPA admin 헤더 ShieldCheck / ExternalLink / AlertTriangle 등 직접 lucide import — 변경 0
- ✅ DomainIASidebar / OperatorAreaShell — 변경 0
- ✅ HeroBannerSection.tsx — 변경 0
- ✅ Store Hub / Channels / Home 아이콘 정비 파일 — 변경 0
- ✅ store-pop 등 다른 세션 WIP — staging 0
- ✅ K-Cosmetics admin / Neture admin — 본 WO 범위 외 (별도 점검만, 변경 0)

### 4.3 K-Cos / Neture admin 점검 (read-only, 변경 0)

본 WO 범위 외이지만 회귀 확인 차원에서 read-only 점검 권장:
- `services/web-k-cosmetics/src/pages/admin/*` — Quick Actions emoji 존재 여부 확인
- `services/web-neture/src/pages/admin/*` — Quick Actions emoji 존재 여부 확인
- 발견 시 별도 후속 (Phase D) 로 기록 / 본 WO 범위 외

### 4.4 최종 vocabulary 19종

| # | lucide-name | Phase |
|:-:|-------------|:-----:|
| 1-9 | users / shield / store / dollar-sign / percent / key / package / file-text / shopping-cart | A |
| 10-16 | clipboard-list / megaphone / message-square / monitor-play / badge-percent / home / scroll-text | B |
| 17-19 | **bar-chart-3 / building-2 / settings** | **C** |

---

## 5. TypeScript 검증 기준

- `apps/api-server` — `npx tsc --noEmit` → 0 errors (admin 프론트 변경이 backend 영향 0)
- `packages/operator-ux-core` — `npx tsc --noEmit` → 0 errors
- `packages/admin-ux-core` — `npx tsc --noEmit` → 0 errors
- `services/web-kpa-society` — `npx tsc --noEmit` → 0 errors (또는 pre-existing 변화 없음)
- `services/web-glycopharm` — `npx tsc -b --noEmit` (project refs) → pre-existing 22 errors 변화 없음
- `services/web-k-cosmetics` / `services/web-neture` — 회귀 0 확인

→ 본 WO 변경이 admin 프론트 4 파일 한정 + vocab 확장 (additive) 이므로 typecheck 회귀 매우 낮음.

---

## 6. desktop / mobile smoke 기준

### 6.1 정적 검증

- KPA admin / GP admin 의 8 emoji 가 lucide-name string 으로 정렬되었는지 확인 (grep)
- vocab 16 → 19 확장 확인 (양쪽 ActionIcon)
- 신규 3 lucide import (BarChart3, Building2, Settings) 양쪽 동일 추가
- ActionIcon 의 Phase A emoji fallback 동작 보존 (코드 diff 검증)

### 6.2 brower smoke (선택, 배포 후)

**KPA admin Dashboard** (`/admin`):
- `STRUCTURE_ACTIONS` 2개 lucide 렌더 — Users / BarChart3
- AdminDashboardLayout 의 Block D (Structure Actions) 시각 정합
- desktop 1280px / mobile 360px 양쪽 정상 렌더

**GlycoPharm admin Dashboard** (`/admin`):
- `ADMIN_QUICK_ACTIONS` 6개 lucide 렌더 — Users / Building2 / DollarSign / FileText / Shield / Settings
- 기존 Phase 2 의 FINANCE/GOVERNANCE/NETWORK_LINKS 와 시각 통일
- desktop / mobile 양쪽 정상

### 6.3 회귀 확인

- KPA operator Dashboard (`/operator`) — Phase B 의 12 lucide-name 렌더 변화 없음
- GP operator Dashboard (`/operator`) — Phase A 의 3 lucide-name 렌더 변화 없음
- K-Cos / Neture operator — emoji + lucide 렌더 변화 없음 (회귀 0)
- 콘솔 / 4xx-5xx 없음

---

## 7. CHECK 문서 기준

작성 문서: `docs/investigations/CHECK-O4O-ADMIN-QUICKACTION-FRONTEND-CONVERGE-V1.md`

포함 항목:
1. 검증 대상 commit + 변경 파일
2. 8 emoji → lucide-name 매핑 정합 (grep 검증 결과)
3. vocab 16 → 19 확장 정합 (양쪽 ActionIcon 동일 vocab)
4. KPA admin / GP admin 8 icon 모두 vocab 19종 안 (8/8)
5. K-Cos / Neture admin 점검 결과 (read-only — 변경 0, 발견 항목 별도 기록)
6. Cross-service (KPA operator / GP operator / K-Cos / Neture) 회귀 0
7. TypeScript 결과 (api-server / operator-ux-core / admin-ux-core / 4 web)
8. brower smoke 결과 (선택 / 별도 시점)
9. Working tree 격리 정합 (path-restricted commit)
10. 최종 판정 (PASS / CONDITIONAL PASS)

---

## 8. 후속

### Phase C 코드 작업 완료 후

1. ✅ CHECK 문서 작성 (PASS 또는 CONDITIONAL PASS — brower smoke 미수행 시)
2. ✅ commit + push (path-restricted, 정확히 5 파일 — CHECK 1 + 코드 4)

### Phase C 종결 후 (선택)

- **Phase D**: K-Cosmetics / Neture admin 점검 결과 기반 emoji 정렬 (발견 시)
- Cross-service ActionIcon vocab 표준 문서화 (Phase A/B/C 정합 명문화)
- ActionIcon vocab 19종 → 신규 icon 추가 정책 (확장 시 기준 명시)

---

## 9. 금지 사항 (재확인)

- ❌ 백엔드 icon 값 추가 변경 — Phase A/B 의 backend lucide-name 정렬 그대로 보존
- ❌ Phase A/B ActionIcon 렌더 로직 불필요 수정 — ICON_NAME_MAP 확장만, NAME_LIKE skip / emoji fallback 변경 0
- ❌ DomainIASidebar / OperatorAreaShell 수정
- ❌ Store Hub / Channels / Home 아이콘 파일 접촉
- ❌ HeroBannerSection.tsx 접촉
- ❌ store-pop 등 다른 세션 WIP staging
- ❌ `git add .` / `git commit -am` — path-specific staging only
- ❌ K-Cosmetics / Neture admin 코드 수정 (점검만 — 별도 Phase D)
- ❌ `StructureAction.icon` type 변경 (Option B 거부)
- ❌ AdminDashboardLayout 구조 변경 (Option C 거부)

---

## 10. 본 WO 단계 요약

| 항목 | 값 |
|------|------|
| **본 단계** | WO 문서 작성 + commit/push 만 |
| **다음 단계** | 사용자 별도 trigger 시 코드 작업 (정확히 4 파일 — ActionIcon × 2 + KPA admin + GP admin) |
| **권장 옵션** | Option A — ActionIcon vocabulary 확장 (16 → 19) |
| **신규 lucide 3종** | bar-chart-3 / building-2 / settings |
| **백엔드 영향** | 0 (admin 프론트 한정) |
| **회귀 위험** | 매우 낮음 (additive — vocab 확장 + lucide-name 교체) |
| **CHECK 작성** | 코드 작업 후 별도 진행 |

---

> **상태**: Phase C WO 문서 작성 완료. 권장 옵션 A — ActionIcon vocabulary 16 → 19 확장 + KPA admin (2 emoji) + GP admin (6 emoji) lucide-name 정렬. 코드 작업은 별도 trigger 시점. 본 WO 문서 1개만 path-restricted commit + push 예정.
