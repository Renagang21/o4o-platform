# CHECK — Global Header 표준 문서 현재 상태 정합

> **WO**: WO-O4O-GLOBAL-HEADER-STANDARD-CURRENT-STATE-ALIGNMENT-V1
> **일자**: 2026-08-21
> **대상 문서**: [docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md)
> **성격**: 문서 정합성 복구 전용 (코드 변경 0)
> **최종 판정**: **ALIGNED** — SUPERSEDED 아님, 현재 상태로 갱신

---

## 1. 수정 전 drift

`GLOBAL-HEADER-STANDARD-V1.md` 는 2026-04-17 IR 시점의 조사 결과를 **현재형**으로 서술하고 있었다.

| # | 위치 | 수정 전 서술 | 현재 코드 |
|:-:|------|--------------|-----------|
| 1 | 문서 헤더 `범위` | kpa-society, glycopharm, neture, k-cosmetics (4서비스) | 5서비스 (pharmacy-hub 포함) |
| 2 | §1 문제 목록 | "공통 컴포넌트가 존재하지 않는다" / "4개 서비스 모두 독립 구현하고 있다" (현재형) | `@o4o/ui GlobalHeader` 존재, 5서비스 채택 완료 |
| 3 | §2 조사 결과 표 | Main/Public Header 공유 컴포넌트 = **없음**, 메뉴 중앙 관리 시스템 = **없음** | 둘 다 존재 |
| 4 | §3.3 | "8~12개의 독립된 Header 코드가 존재한다" | Core 1 + bridge 5 |
| 5 | §5.1 Layer A | "해당하는 현재 컴포넌트: kpa `Header.tsx` / glycopharm `Header.tsx` / …" | 서비스별 독립 `Header.tsx` 파일 **0개** |
| 6 | §6.1 | "현재 문제 — 메뉴가 Header/Layout 내부에 하드코딩" | 5서비스 `src/config/navigation.ts` |
| 7 | §7.3 | "현재 위반 사례" 4건 (kpa admin/operator, glyco 이중헤더, neture 역할별 Layout) | 4건 모두 해소 |
| 8 | §8.1 | kpa inline style 70px 등 서비스별 상이 | 공통 Core Tailwind `h-16`(64px) |
| 9 | §8.3 브랜드 토큰 표 | 4서비스, 실제 주입값과 불일치 (glyco `#10b981`, kcos `#e91e63`, neture 텍스트 로고 등) | 실제 `brand` prop 값과 다름 · pharmacy-hub 누락 |
| 10 | §11 적용 우선순위 | Phase 1~6 미래 계획형 | Phase 1~5 완료, 6은 상시 |
| 11 | §12 / 문서 말미 | "다음 단계: WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1 (구현)" | 구현 완료 · 트랙 CLOSED |

---

## 2. 현재 main 구현 근거

기준: `origin/main` (fetch·`--ff-only` pull 후 최신). 특정 과거 commit 고정 없음.

| 확인 항목 | 근거 |
|-----------|------|
| 공통 Core 존재 | `packages/ui/src/layout/GlobalHeader.tsx` — 4슬롯(Brand/PrimaryNav/Utility/User), `h-16`, props-only(서비스 Context 비의존) |
| Core export | `packages/ui/src/layout/index.ts` → `export * from './GlobalHeader'` · `'./filterContextualNav'` |
| 5서비스 bridge | `KpaGlobalHeader` · `GlycoGlobalHeader` · `KCosGlobalHeader` · `NetureGlobalHeader` · `PharmacyHubGlobalHeader` (모두 `GlobalHeader` from `@o4o/ui` import) |
| navigation config | `services/web-{kpa-society,glycopharm,neture,k-cosmetics,pharmacy-hub}/src/config/navigation.ts` — 5/5 존재 |
| contextual 필터 공통화 | 5 bridge 중 4개가 `filterContextualNav` 직접 사용, KPA 는 `filterContextualNav(KPA_CONTEXTUAL_NAV, …)` 결과를 `publicNav` 로 병합(서비스 의도) |
| 레거시 Header 제거 | `git ls-files` 기준 `services/web-*/src/**/Header.tsx` **0건** |
| 역할 영역 GlobalHeader 유지 | KPA `AdminLayout`·`KpaOperatorLayoutWrapper`, Glyco `DashboardLayout`·`MainLayout`·`OperatorLayoutWrapper`, Neture `MainLayout`·`NetureLayout`·`AdminLayoutWrapper` 전부 bridge 렌더 |
| 서비스별 차이 유지 | 브랜드(색·아이콘·서브타이틀), 메뉴 항목, 역할 판정(`isPharmacistRole` / `isStoreOwnerDual` / `satisfiesRole`), 대시보드 route, 알림 `serviceKey` 가 서비스마다 다름 |

---

## 3. 수정한 문서 구간

| 구간 | 수정 내용 |
|------|-----------|
| 문서 헤더 | `범위` 에 pharmacy-hub 추가 · `최종 갱신` 줄 추가 · IR 근거에 archive 경로 링크 |
| §1 | 문제 목록을 "2026-04-17 IR 시점" 과거형으로 명시 + **현재 상태** 문단 추가 |
| §2 | `2.1 표준 제정 당시 조사(역사적 기록)` / `2.2 현재 구현 상태(현행)` 로 분리. 2.2 에 Core·bridge·config·MobileBottomNav·closure 표와 "공통 Core + 서비스별 주입" 구조 요약 추가 |
| §3 | 절 상단에 시점 안내 · §3.3 문장 과거형 + 현재 구조 1줄 |
| §5.1 | Layer A 해당 컴포넌트 표를 Core + 5 bridge 로 교체 |
| §6.1 | 제목을 `배경(2026-04-17 당시 문제)` 으로, **현재 상태** 문단 추가 |
| §7.3 | 제목을 `표준 제정 당시 위반 사례와 해소 결과` 로, `현재(2026-08-21)` 열 추가 (4건 해소 근거) |
| §8.1 | 당시 표 유지 + 현재 공통 Tailwind `h-16` 문단 추가 |
| §8.3 | 브랜드 토큰 표를 실제 `brand` prop 값으로 교정 + pharmacy-hub 행 추가 |
| §11 | Phase 진행 상태 표 추가(1~5 완료 / 6 상시), Phase 6 제목에 `(상시)` |
| §12 | 결론 표 근거 열 2건 현행화 · `이 문서의 위치` 갱신 + closure CHECK 링크 · `표준 범위 밖(미결정)` 절 신설 |
| 문서 말미 | 구현 완료 및 본 정합 WO 표기 |

---

## 4. 유지한 표준 구간 (재작성하지 않음)

선행 검증에서 현재도 유효한 설계 표준으로 확인된 구간은 **본문 변경 없음**.

- §4 Global Header 표준 원칙 (4.1 목표 · 4.2 표준 구조 · 4.3 슬롯 책임)
- §5.2 계층 조합 원칙 · §5.3 기존 공유 자산과의 관계
- §6.2 표준 원칙 · §6.3 메뉴 계층 구조 · §6.4 메뉴 정의 위치 원칙
- §7.1 핵심 원칙 · §7.2 역할별 UI 표현 방식 · §7.4 별도 Shell 허용 기준
- §8.2 스타일링 표준 방향 (문구 1줄만 시점 보강)
- §9 서비스별 차등 허용 범위 · §10 예외 허용 기준

---

## 5. PharmacyHub 포함 여부

포함했다. 적용 대상 = **kpa-society / glycopharm / neture / k-cosmetics / pharmacy-hub 5서비스**.

- 문서 헤더 `범위`, §2.2 표, §5.1 표, §8.3 브랜드 토큰 표, §11 Phase 6 에 반영.
- 단, "5서비스 Header 가 동일하다" 는 의미로 쓰지 않았다. PharmacyHub 는 자체 `PH_PUBLIC_NAV` / `PH_CONTEXTUAL_NAV`,
  `SERVICE_KEY`, `satisfiesRole` 배선을 갖고 `MobileBottomNav` 는 `NOT_APPLICABLE` 이다.

---

## 6. GlobalHeader Core / bridge 구조 (문서에 반영한 표현)

```text
공통 Core        @o4o/ui GlobalHeader (4슬롯, props-only, 서비스 Context 비의존)
   +
서비스별 bridge   {Service}GlobalHeader — AuthContext / LoginModal / 알림 / 역할 라벨 배선
   +
서비스별 config   src/config/navigation.ts — publicNav / contextualNav / footer 섹션
   +
서비스별 semantics 메뉴 항목·브랜드·역할 판정·대시보드 route 는 서비스마다 다르다
```

공통인 것은 **구조·슬롯·높이·동작 계약**이고, navigation / Auth / role 차이는 bridge·config 계층에서 유지한다.
따라서 `FULLY_COMMON` 으로 과장하지 않고 **공통 Core + 서비스별 주입**으로 기술했다.

---

## 7. `children` 계약 — 미결정 유지

`GlobalHeaderNavItem.children` 은 타입에 존재하지만 공통 `GlobalHeader` 가 렌더하지 않으며 실사용은 PharmacyHub 뿐이다.

본 WO 에서:

- dropdown 공식 계약으로 **선언하지 않았다**
- 폐기 계약으로 **선언하지 않았다**
- §12 에 "표준 범위 밖(미결정) · 별도 결정 WO 대상" 이라는 **중립 표기만** 추가했다

판단은 `WO-O4O-GLOBAL-HEADER-SUBMENU-CONTRACT-DECISION-V1` 성격의 후속 WO 로 남는다.

---

## 8. 코드 변경 0

- 본 WO 로 변경한 파일: `docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md` + 본 CHECK **2건**
- `services/` · `packages/` · `apps/` 변경 **0건**
- 작업 트리의 다른 변경(action-log-core 삭제, MembershipConsoleController 등)은 **다른 세션 WIP** 로 접촉하지 않았다

---

## 9. 검증

| 항목 | 결과 |
|------|------|
| `git diff --check` | PASS (공백 오류 0) |
| "4서비스 / 4개 서비스" 잔존 | 역사적 기록 구간(§2.1·§3.3·§8.1·§8.2·§12 근거 열)에만 남음 — 모두 시점 명시 |
| "공유 컴포넌트 없음" 잔존 | §2.1 역사적 표 내부에만 존재 (§2.2 가 현행 상태를 제시) |
| PharmacyHub 누락 | 해소 (문서 내 9회 언급) |
| GlobalHeader 경로 정확성 | `packages/ui/src/layout/GlobalHeader.tsx` 존재 확인 · 상대 링크 추가 |
| 내부 링크 | IR = `docs/archive/audits/IR-O4O-GLOBAL-LAYOUT-HEADER-AUDIT-V1.md` 존재 · closure CHECK 존재 |
| build / typecheck | 문서 전용이므로 미실행 (WO §15) |

### 범위 밖 관찰 (보고만)

- `packages/ui/src/layout/GlobalHeader.tsx` 상단 주석이 표준 문서를 `docs/architecture/ui/global-header-standard-v1.md`(소문자)로 참조한다.
  실제 파일명은 대문자다. **코드 변경 금지 범위**이므로 수정하지 않았다.

---

## 10. 문서 정합 최종 판정

**ALIGNED.** 표준 본문(§4~§10)이 현재 구조와 양립하므로 SUPERSEDED 대상이 아니다.
과거 조사 서술만 시점 명시·현행화했고, 5서비스 범위와 `@o4o/ui GlobalHeader` Core + bridge/config 구조를 반영했다.
`children` 계약은 확정하지 않았다.
