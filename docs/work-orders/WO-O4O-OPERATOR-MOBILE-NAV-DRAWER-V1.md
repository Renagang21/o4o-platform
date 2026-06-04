# WO-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1

> O4O operator 영역 **모바일 내비게이션을 가로 스크롤 탭 → 햄버거 drawer 로 교체**한다. 공통 컴포넌트 단일 수정으로 4서비스(+Neture Admin) 일괄 적용.
> **본 문서는 작업 요청서이며, 코드 착수는 별도 지시 후 진행한다.**

- **작성일**: 2026-06-04
- **상태**: WO 작성 완료 / **코드 착수 대기**
- **방향**: IR 권장 **A안 (hamburger drawer)** 확정
- **선행 IR**: [`IR-O4O-OPERATOR-MOBILE-NAV-LAYOUT-AUDIT-V1`](../investigations/IR-O4O-OPERATOR-MOBILE-NAV-LAYOUT-AUDIT-V1.md) (commit `49c825d06`)
- **참고 패턴**: `services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx` (검증된 모바일 drawer)

---

## 1. 문제 정의

현재 operator 모바일 메뉴는 공통 `DomainIASidebar` 의 `md:hidden` 분기에서 **가로 스크롤 탭**으로 렌더된다.

- [DomainIASidebar.tsx:328-351](../../packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx#L328-L351) — `flex gap-1 overflow-x-auto ... whitespace-nowrap`
- 메뉴가 많을 때 **가로 스크롤 / 후순위 메뉴 잘림 / 본문 밀림**(`w-full mb-4`)
- [line 334](../../packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx#L334) — `group.items[0].path` 만 링크 → **그룹 하위 항목(2번째 이후) 모바일 도달 불가**
- 도메인 헤딩(커뮤니티 운영 / 매장 HUB 운영 / 운영 공통) 모바일 생략 → 구조 파악 어려움
- **4서비스 + Neture Admin 공통 문제** (모두 `OperatorAreaShell → DomainIASidebar` 사용)

---

## 2. 수정 방향 (A안: hamburger drawer)

```text
모바일(md 미만):
- 가로 스크롤 탭 제거
- mobile-only sticky 토글 바: 햄버거 버튼 + "메뉴"(또는 "운영자 메뉴")
- 토글 시 slide-in drawer (fixed, transform 슬라이드 + backdrop)
- drawer 내부 = 데스크톱과 동일한 IA 재사용:
    · 도메인 헤딩
    · 그룹 (collapsible)
    · 하위 항목 전체
    · active 상태 강조
    · top-pinned 그룹(대시보드) 동일 처리
- 닫힘: 메뉴 항목 클릭 시 자동 / backdrop 클릭 / close 버튼 (가능하면 ESC)

데스크톱(md 이상):
- 기존 좌측 세로 sidebar 그대로 (변경 금지)
```

### 구현 노트 (권장)
- 현재 `DomainIASidebar` 는 **데스크톱 세로 마크업**(`<aside hidden md:block>`, line 166~)과 **모바일 가로 탭**(`<div md:hidden>`, line 328~)을 **별도로** 갖고 있다.
- A안 핵심: **데스크톱 세로 nav 마크업(도메인 헤딩 + 그룹 collapsible + 하위 항목 렌더링 로직)을 내부 헬퍼/하위 컴포넌트로 추출**하여, ① 데스크톱 `<aside>` 와 ② 모바일 drawer **양쪽이 동일 렌더를 재사용**하도록 한다. → 모바일 가로 탭(`flatGroupsForMobile`) 마크업을 drawer 로 교체.
- 이렇게 하면 "모바일에서 하위 항목 도달 불가" 결함이 구조적으로 해소된다(동일 트리 재사용).
- `openGroups`(collapsible) / `isItemActive` / `resolvedTopGroups` / `resolvedDomains` 등 기존 상태·로직은 그대로 공유.
- drawer open 상태(`mobileMenuOpen`)는 `DomainIASidebar` 내부 `useState` 로 관리(현재도 컴포넌트 내 상태 보유). `OperatorAreaShell` 수정은 토글 바 위치상 필요할 때만 최소.

> `PharmacyHubLayout.tsx` 의 drawer 패턴(sticky 토글 바 + `fixed ... translate-x` + backdrop + 클릭 시 닫힘 + `top-16` 오프셋)을 참고하되, operator 는 `top-20`(GlobalHeader) 오프셋·도메인 IA 구조에 맞게 조정한다.

---

## 3. 수정 위치

```text
우선:   packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx   (모바일 분기 교체 + 세로 nav 재사용 추출)
필요 시: packages/operator-ux-core/src/layout/OperatorAreaShell.tsx (모바일 토글 바 슬롯/오프셋 — 최소)
서비스 wrapper (KPA/Glyco/KCos/Neture): 가능하면 미수정 (공통 컴포넌트로 해결)
```

---

## 4. 참고 패턴

`services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx`
- mobile-only sticky 토글 바(햄버거 + 라벨)
- `aside`: mobile `fixed ... z-40 transition-transform translate-x` drawer / desktop static
- backdrop(`fixed inset ... bg-black/40`) + 클릭 시 닫힘
- 메뉴 클릭 시 `closeMobileMenu()`

→ 이 패턴을 operator IA(도메인 헤딩 + 그룹 collapsible)에 맞게 공통화.

---

## 5. 제외 범위

```text
- Neture Phase 4 아이콘 정비 — 제외 (이 WO 다음)
- Store Hub / Channels 아이콘 파일 — 미접촉
- packages/shared-space-ui/src/HeroBannerSection.tsx — 미접촉
- 데스크톱 sidebar 동작/마크업 — 변경 금지 (시각·동작 동일 유지)
- 메뉴 순서 / 라우트 / 권한 / capability 필터 / API — 변경 금지
- domain IA 메타데이터(operatorDomainIA) / STANDARD_GROUPS — 변경 금지
- 서비스별 wrapper 수정 — 최소화(원칙적으로 미수정)
```

---

## 6. 검증 기준

### 6.1 정적
```bash
cd packages/operator-ux-core && npx tsc --noEmit   # 또는 repo 표준 build/typecheck
```
- operator-ux-core 의존 서비스(KPA/Glyco/KCos/Neture) 중 최소 1곳 `tsc --noEmit` 회귀 확인 권장.

### 6.2 화면 smoke (배포 또는 local)
```text
desktop (md 이상):
- 기존 좌측 세로 sidebar 동일 유지 (회귀 없음)

mobile (390px 전후):
- 가로 스크롤 탭 제거 확인
- 햄버거 토글 → drawer slide-in
- drawer 내 도메인 헤딩 + 그룹 collapsible + 하위 항목 전체 접근 가능
- active 상태 정상
- 메뉴 클릭 시 drawer 자동 닫힘 + 라우팅 정상
- backdrop/close 로 닫힘
- 본문 밀림 / 가로 스크롤 없음
```

### 6.3 대상 서비스 (모두 동일 공통 컴포넌트 → 일괄)
```text
- KPA-Society /operator        mobile/desktop
- GlycoPharm /operator         mobile/desktop
- K-Cosmetics /operator        mobile/desktop
- Neture /operator             mobile/desktop
- Neture /admin                가능하면 확인 (AdminLayoutWrapper 도 DomainIASidebar 사용)
```

---

## 7. Git 기준

```text
- path-specific staging만 사용
- git add . / git commit -am 금지
- commit 직전: git status --short + git diff --cached --name-only + git diff --name-only 확인
- HeroBannerSection.tsx 가 staged 되면 즉시 중단·보고
- 동시 세션 가능성 → 작업 끝나면 즉시 path-specific 커밋
```

권장 커밋 메시지:
```text
fix(operator): replace mobile horizontal tabs with hamburger drawer nav
```

---

## 8. CHECK 문서 기준

작업 완료 후:
```text
docs/investigations/CHECK-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1.md
```
포함:
```text
1. 최종 판정
2. 근본 원인/수정 요약 (가로 탭 → drawer, 세로 nav 재사용 추출)
3. 수정 파일 목록
4. 변경하지 않은 항목 (데스크톱 sidebar / IA 메타 / 라우트 / 서비스 wrapper)
5. TypeScript/build 결과
6. desktop/mobile smoke 결과 (4서비스 + Neture Admin)
7. staged 파일 검증
8. 남은 후속 (Neture Phase 4 아이콘 등)
```

---

## 9. 완료 기준

```text
- 모바일 operator 가로 스크롤 탭 제거
- 햄버거 drawer 로 교체, drawer 내 데스크톱 동일 IA(도메인/그룹/하위항목 전체) 접근 가능
- 모바일에서 하위 메뉴 도달 불가 문제 해소
- 데스크톱 sidebar 무변화
- 4서비스 + Neture Admin 일괄 적용(공통 컴포넌트)
- 메뉴 순서/라우트/권한/API 불변
- TypeScript/build PASS
- mobile/desktop smoke PASS
- 의도한 파일만 staged/commit (HeroBannerSection 제외)
- CHECK 문서 작성 / push 완료
```

---

## 10. 우선순위

operator 모바일 메뉴 깨짐은 **공통**이고 사용자에게 크게 보인다. → 본 WO 를 **Neture Phase 4 아이콘 정비보다 먼저** 처리한다.

```text
1. WO-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1  (본 WO, 코드 착수 대기)
2. Neture Phase 4 아이콘 정비 (그 다음)
```

---

*A안(hamburger drawer) 확정. 공통 `DomainIASidebar` 단일 수정으로 4서비스 일괄 해결. 본 문서는 요청서이며 코드 변경을 포함하지 않는다.*
