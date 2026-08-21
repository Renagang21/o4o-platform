# CHECK — GlobalHeader unused `children` 계약 제거

> **WO**: WO-O4O-GLOBAL-HEADER-UNUSED-CHILDREN-CONTRACT-REMOVAL-V1
> **일자**: 2026-08-21
> **최종 상태**: **BLOCKED — 제거 중단 (WO §21 중단 기준 발동)**
> **계약 상태**: `GLOBAL_HEADER_CHILDREN_CONTRACT = REMOVE_UNUSED_CHILDREN` (결정 유지, **REMOVED 아님**)

---

## 요약

WO §21 "다른 세션 WIP 와 직접 충돌" 및 "현재 새로운 children producer 가 생김" 에 해당하는 상황이
확인되어 **타입 제거와 PharmacyHub children 블록 제거를 수행하지 않았다.**

수행한 것은 §10 (GlobalHeader 표준 문서 경로 대소문자 정정) 1건뿐이며, 이는 삭제가 아니고
충돌 대상도 아니다.

---

## 1. 시작 main commit

| 항목 | 값 |
|------|-----|
| 브랜치 | `main` |
| 기준 commit | `adaa7ff1a` (`git fetch origin` → `git pull --ff-only origin main` → Already up to date) |
| 다른 세션 WIP | 접촉·수정·삭제·stash 0 |

---

## 2. 수정 전 producer / consumer 재확인 (§4)

### 2.1 타입 정의 (§4.1)

[packages/ui/src/layout/GlobalHeader.tsx:24](../../packages/ui/src/layout/GlobalHeader.tsx#L24) 에
`children?: { label: string; href: string }[]` 이 **여전히 존재**한다.

### 2.2 producer (§4.2) — **선행 조사보다 늘어남**

커밋된 `HEAD` 기준 5서비스 `src/config/navigation.ts` 의 `children:` 개수:

| service | children 블록 |
|---|:--:|
| web-glycopharm | 0 |
| web-k-cosmetics | 0 |
| web-kpa-society | 0 |
| web-neture | 0 |
| **web-pharmacy-hub** | **3** |

→ 커밋 기준 producer 는 선행 조사와 동일(PH 1서비스 / parent 3).

**그러나 작업트리에 다른 세션의 미커밋 WIP 가 있고, 그 WIP 가 바로 이 파일의 children 블록을 확장 중이다.**

```diff
  services/web-pharmacy-hub/src/config/navigation.ts   (uncommitted, 다른 세션)
+ WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 §12:
+   자료실(/resources)이 공통 ResourcesHubTemplate 로 실제 구현되어 링크를 추가한다.
...
      { label: '포럼 개설 신청', href: '/forum/request' },
+     { label: '자료실', href: '/resources' },
    ],
```

동일 WIP 에 딸린 다른 미커밋 변경: `services/web-pharmacy-hub/src/App.tsx`,
`src/pages/community/CommunityHomePage.tsx`, 신규 `src/pages/resources/`,
`src/lib/api/pharmacyHubResources.ts`.

즉 **커뮤니티 children 블록은 지금 다른 WO 가 활발히 편집 중인 코드**다.

### 2.3 consumer (§4.3) — **여전히 0**

| 확인 대상 | 결과 |
|---|---|
| GlobalHeader desktop nav JSX | `label`/`href` 만 사용 |
| GlobalHeader mobile drawer JSX | `label`/`href` 만 사용 |
| `filterContextualNav` | `{ label, href }` 로 정규화 — children 을 구조적으로 버림 |
| route matcher / breadcrumb / sidebar / analytics | `GlobalHeaderNavItem.children` 참조 0 |
| tests / fixtures | `GlobalHeaderNavItem` · `PH_PUBLIC_NAV` 참조 0 |
| `packages/ui/src/layout/GlobalHeader.tsx:451/456/466` | React 노드 `children` (`GlobalHeaderMenuItem`) — 별개 |
| `packages/ui/src/layout/AGSidebar.tsx` · `types.ts:26` | `NavItem.children` — **별개 타입** (Header 계약 아님) |
| `apps/admin-dashboard` `.children` | CPT·관리자 메뉴 빌더 — **별개 타입**, 건드리지 않음 |

**children consumer = 0 (변동 없음).**

---

## 3. 제거한 타입 — **없음**

`GlobalHeaderNavItem.children` 을 제거하지 않았다.

이유: 이 필드를 제거하면 다른 세션의 작업트리(신규 `자료실` child 포함)가 즉시 타입 오류로
깨진다. WO §21 "다른 세션 WIP 와 직접 충돌" · "공통 타입 제거가 예상 밖의 다른 계약을 깨뜨림" 에 해당한다.

## 4. PharmacyHub 제거 block — **없음**

`services/web-pharmacy-hub/src/config/navigation.ts` 는 **한 줄도 수정하지 않았다**
(해당 파일은 다른 세션 소유의 dirty 상태).

## 5. 유지한 parent nav

`PH_PUBLIC_NAV` 전 항목 무변경 — 홈 `/` · 커뮤니티 `/community` · 교육 `/education` · 이용 안내 `/service-guide`.
`PH_CONTEXTUAL_NAV` · `PH_FOOTER_SECTIONS` 도 무변경.

## 6. 유지한 하위 route

route 선언·page component·hub card·Footer navigation·My Page navigation·StoreOwner navigation
**전부 무변경**. 하위 route 삭제 0.

## 7. 대체 진입경로 검증

이번 WO 에서 코드 삭제가 없었으므로 접근 경로는 선행 CHECK 시점과 동일하다
([CHECK-O4O-GLOBAL-HEADER-SUBMENU-CONTRACT-DECISION-V1](CHECK-O4O-GLOBAL-HEADER-SUBMENU-CONTRACT-DECISION-V1.md) 5·6절: 고유 child route **9/9** 대체 진입 존재).
WIP 가 커밋되면 `/resources` 가 추가되어 대상이 10개가 될 가능성이 있으므로,
후속 재시도 시 **현재 main 기준으로 다시 계산**해야 한다.

## 8. `filterContextualNav` 무변경 여부

무변경. 재설계하지 않았다 (WO §9 준수).

## 9. GlobalHeader 주석 경로 정정 — **수행함**

```diff
- * 표준: docs/architecture/ui/global-header-standard-v1.md
+ * 표준: docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md
```

실제 파일명과 정확히 일치한다. 삭제가 아니며 충돌 대상도 아니므로 이번에 처리했다.

> 범위 밖 관찰(수정하지 않음): `web-glycopharm` · `web-k-cosmetics` · `web-kpa-society` · `web-neture`
> 의 `src/config/navigation.ts:5` 에도 동일한 소문자 경로 참조가 남아 있다. WO §10 범위는
> GlobalHeader.tsx 이고 §13 이 타 서비스 navigation 접촉을 금지하므로 보고만 한다.
> 후속 제거 WO 에서 함께 정리 가능하다.

## 10. 표준 문서 갱신 여부 — **갱신하지 않음**

[GLOBAL-HEADER-STANDARD-V1.md](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md) 는 현재
"**결정 완료, 제거 대기**" 로 적혀 있으며, 실제 제거가 이뤄지지 않았으므로 **현재 상태와 충돌하지 않는다.**
WO §11 은 충돌 시에만 최소 갱신하도록 하므로 수정하지 않았다.

## 11. 5서비스 영향

| service | 코드 변경 |
|---|---|
| KPA Society | 0 |
| GlycoPharm | 0 |
| K-Cosmetics | 0 |
| PharmacyHub | 0 |
| Neture | 0 |

공통 타입 변경이 없으므로 bridge import·navigation config 타입·Header rendering 모두 무변화.

## 12. typecheck / build

| 대상 | 명령 | 결과 |
|---|---|---|
| `@o4o/ui` | `npx tsc --noEmit` (packages/ui) | **PASS** (error 0, exit 0, 진단 출력 없음) |
| 5서비스 build | 미실행 | 공통 타입·서비스 코드 변경이 0 이라 build 영향 없음. 실제 타입 제거를 수행하는 재시도 시 WO §15 대로 5서비스 전수 검증 필요 |

## 13. browser smoke

**미수행.** 이번 변경은 TypeScript **주석 1줄**뿐으로 번들 동작·렌더 결과가 바뀌지 않는다.
WO §17·§18 의 smoke 는 타입/config 제거를 전제로 하며, 그 제거가 수행되지 않았다.
후속 재시도 시 PH desktop(1440×900) · mobile(390×844) 및 4서비스 대표 Header smoke 를 수행한다.

## 14. git diff / check

- `git diff --check` PASS (경고 0)
- 변경 파일 2건: `packages/ui/src/layout/GlobalHeader.tsx` (주석 1줄) · 본 CHECK
- path-specific stage (`git add .` 미사용)
- 다른 세션 WIP 파일은 stage·commit 대상에서 완전히 제외

## 15. 최종 계약 상태

```text
GLOBAL_HEADER_CHILDREN_CONTRACT = REMOVE_UNUSED_CHILDREN   (결정 유지 / 미실행)
```

- GlobalHeader submenu 기능 없음 — 유지 (구현하지 않았다)
- 미사용 `children` 타입 — **아직 존재**
- PharmacyHub children config — **아직 존재** (다른 세션이 확장 중)
- 하위 route 및 실제 진입 UI — 전부 유지

### 재시도 조건

다음이 모두 성립하면 동일 WO 를 그대로 재실행할 수 있다.

1. `WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1` WIP 가 커밋되어
   `services/web-pharmacy-hub/src/config/navigation.ts` 가 clean 상태가 된다
2. 그 시점의 main 기준으로 producer / consumer / 고유 child route 수를 **다시 계산**한다
   (`/resources` 추가로 route 수가 9 → 10 이 될 수 있다)
3. consumer 가 여전히 0 임을 재확인한다

### 판단 참고

`/resources` child 추가는 "header submenu 를 실제로 쓰겠다"는 신호가 아니라 **여전히 렌더되지 않는
config 를 늘린 것**이다 (consumer 0 은 그대로). 따라서 REMOVE 판정 자체를 뒤집을 근거는 아니며,
제거 시점만 미뤄진 것으로 본다. 다만 그 WO 가 `/resources` 의 **실제 진입 UI**(커뮤니티 허브 카드 등)를
함께 제공하는지는 재시도 시 §8 대체 진입경로 검증에서 확인해야 한다.
