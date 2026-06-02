# WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1

> KPA-Society 의 post-login redirect 정책을 O4O 공통 철학에 맞게 정렬한다. 약국 경영자(`kpa:store_owner`)는 GlycoPharm/K-Cosmetics 와 동일하게 로그인 직후 내 약국(`/store`)을 기본 시작 화면으로 본다. 공개 Home 구조는 변경하지 않는다.

- **작성일:** 2026-06-02
- **유형:** Work Order (실행 — 코드 변경 포함)
- **범위:** web-kpa-society 한정 (post-login redirect 정렬)
- **상태:** ✅ 기능 완료 (코드 변경 main 반영·배포 라인 진입). 단 커밋 격리 이상 발생 — 아래 §4 참조.
- **선행 IR:**
  - [IR-O4O-CROSSSERVICE-POSTLOGIN-STOREOWNER-DASHBOARD-POLICY-AUDIT-V1](../investigations/IR-O4O-CROSSSERVICE-POSTLOGIN-STOREOWNER-DASHBOARD-POLICY-AUDIT-V1.md) — KPA 만 store_owner 가 `/store` 로 가지 않는 불일치 확정
  - [IR-O4O-KPA-STOREOWNER-AUTO-STORE-ACCESS-FLOW-AUDIT-V1](../investigations/IR-O4O-KPA-STOREOWNER-AUTO-STORE-ACCESS-FLOW-AUDIT-V1.md) — 별도 "내 약국 사용승인" 2차 게이트 없음 확인 → redirect 즉시 적용 가능
- **Supersede:** 본 WO 는 `WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1` 의 "store_owner 도 커뮤니티 Home 유지" 결정을 갱신한다.

---

## 1. 목표

KPA-Society 는 O4O 의 예외 서비스가 아니다. O4O(Online for Offline)의 기본 목표는 소규모 오프라인 약국/매장의 경쟁력 강화이며, 약국 경영자는 주 사용자다. 따라서 KPA 에서도 `kpa:store_owner` 는 로그인 직후 내 약국(`/store`)을 기본 시작점으로 본다. 본 변경은 기존 "커뮤니티 우선" 정책(`WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1`)을 supersede 하는 정책 갱신이며 단순 버그 패치가 아니다.

---

## 2. 코드 변경 (실제 반영됨)

> 공통 유틸(`getPrimaryDashboardRoute`)·`PostLoginRedirect` 구조·`/store` Guard(PharmacyGuard/StoreOwnerGuard)·backend 약국 승인/role 부여/organization 생성 흐름은 **변경하지 않았다.** Home 자체도 변경하지 않았다. 변경은 KPA config + 주석 정리뿐.

### 2-1. [services/web-kpa-society/src/config/dashboard.ts](../../services/web-kpa-society/src/config/dashboard.ts)
- `KPA_ROLE_PRIORITY` 에 `'kpa:store_owner'` 추가 — 운영 역할(super_admin/admin/operator) **다음** 순위(다중역할 안전: 운영자 겸 약국주는 여전히 `/operator`·`/admin` 우선), PRIORITY 미포함 일반 역할(instructor/pharmacist/student)보다는 **위**.
- `KPA_DASHBOARD_MAP` 에 `'kpa:store_owner': '/store'` 추가.
- 헤더/함수 주석을 현행 정책(supersede)으로 갱신.

### 2-2. [services/web-kpa-society/src/components/LoginModal.tsx](../../services/web-kpa-society/src/components/LoginModal.tsx)
- post-login redirect 주석 정리 — 기존 stale 주석("약국 경영자(isStoreOwner) → /store"이라 적혀 있으나 실제로는 미동작)을, **실제 동작과 일치**하도록(`kpa:store_owner → /store`) 갱신. 매핑 SSOT 가 `config/dashboard.ts` 임을 명시.

### 변경하지 않은 것 (의도적)
- `App.tsx` PostLoginRedirect — 이미 `getKpaPostLoginRoute` 를 소비하고 `/store`·`/operator`·`/admin`·`/instructor` 를 early-exit 처리하므로 무수정으로 정상 동작.
- `/store` Guard, PharmacyGuard, StoreOwnerGuard, MembershipGate.
- backend(약국 request 승인, role_assignments, organization/slug 생성).
- 공개 Home(`/`).

---

## 3. 검증 결과

- **TypeScript:** `npx tsc --noEmit` (web-kpa-society) → **PASS (exit 0, 신규 오류 0)**.
- **코드 기준 시나리오:**
  - `kpa:store_owner` 단독 → `/store` ✅
  - 일반 약사/약대생/강사(PRIORITY 미포함) → `null` → Home 유지 ✅
  - `kpa:operator` → `/operator`, `kpa:admin`/`platform:super_admin` → `/admin` (store_owner 보다 우선) ✅
  - 이미 `/store`·`/operator`·`/admin`·`/instructor` 경로 → 중복 redirect 없음 (App.tsx early-exit) ✅
  - 비로그인 공개 Home → 변경 없음(인증 시에만 발동) ✅

---

## 4. ⚠️ 커밋 격리 이상 (히스토리 재작성 없이 문서로 보완)

WO 의 "KPA 전용 격리 커밋" 요구를 충족하지 못했다. 원인은 본 작업과 무관하며, **동시 실행 중이던 다른 세션이 `git add -A` 류 명령으로 본 WO 의 미커밋 KPA 변경을 자기 작업과 함께 커밋·푸시**했기 때문이다.

- 본 WO 의 KPA 코드 변경(`dashboard.ts`, `LoginModal.tsx`)은 커밋 **`376a25ad5`** 에 포함되었다.
  - 해당 커밋 메시지: `docs(operator-forum): IR-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-V1 — Neture 포럼 콘솔 수렴 가능성 (조건부)`
  - 즉 KPA WO 코드가 Neture IR 문서와 한 커밋에 섞였고, 메시지가 KPA WO 를 가리키지 않는다.
- 해당 커밋은 이미 `origin/main` 에 푸시됨 → force-push/히스토리 재작성은 공유 원격·활성 세션을 파괴하므로 **수행하지 않는다.**
- 코드 내용 자체는 정상(§2, §3 검증 완료). 따라서 **기능은 완료**로 보고, 추적성만 본 문서로 보완한다.

**결론:** 커밋 `376a25ad5` 에 `WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1` 의 실제 코드 변경(KPA `dashboard.ts` + `LoginModal.tsx`)이 포함되어 있다. 메시지는 Neture IR 로 표기되어 있으나, KPA store_owner → `/store` 정렬 변경의 SSOT 출처는 본 WO 문서다.

### 재발 방지 메모
- 작업 전후 `git status --short` / `git diff --cached --name-only` 검증을 강하게 적용한다.
- 다른 세션이 `git add -A`/`git add .` 로 타 세션 변경을 흡수하지 않도록, 미커밋 변경은 가능한 한 즉시 정확한 경로로 staging·격리 커밋한다.

---

## 5. 완료 기준 체크

| 기준 | 상태 |
|------|------|
| `kpa:store_owner` 로그인 직후 `/store` 이동 | ✅ (코드 반영) |
| 일반 회원/약사/약대생 Home/커뮤니티 유지 | ✅ |
| admin/operator 우선순위 보존 | ✅ |
| 공개 Home 불변 | ✅ |
| 별도 내 약국 사용승인 흐름 추가 안 함 | ✅ |
| stale 주석 실제 동작과 일치 | ✅ |
| 수정 범위 KPA 한정 | ✅ (코드는 KPA 2파일만) |
| KPA 전용 격리 커밋 | ⚠️ 미달 — §4 (동시 세션 흡수, 히스토리 재작성 금지로 문서 보완) |

---

*Status: 기능 완료 · 히스토리 재작성 없음 · 추적성 문서 보완.*
