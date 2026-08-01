# IR-O4O-ADMIN-ORPHAN-ROUTE-TRIAGE-V1

> **성격**: 조사 전용 IR — 코드·메뉴·라우트·API·DB·권한·운영데이터·배포 **변경 0건**
> **선행**: `docs/investigations/IR-O4O-ADMIN-FRONTEND-IA-WORKFLOW-USABILITY-BASELINE-V1.md`
> **일자**: 2026-08-01

---

## 1. 조사 기준

| 항목 | 값 |
|---|---|
| repo / branch | `Renagang21/o4o-platform` / `main` |
| 시작 HEAD | `349a338a7120b4617975f34e0e199b13afad4e7c` |
| `HEAD...origin/main` | `0 0` |
| 조사 대상 앱 | `apps/admin-dashboard` (선행 IR 에서 `admin.neture.co.kr` 배포 대상 확정) |
| 모집단 산출 | 정적 스크립트로 `routes/*.tsx` 전수 파싱 — **중첩(상대경로) route 를 부모와 결합해 절대경로로 정규화** |
| 브라우저 확인 | ✅ platform super_admin, **47개 대표 route read-only**. 쓰기 버튼 미클릭 |
| 코드 변경 | **0** / 운영 데이터 변경 **0** / 배포 **없음** |

작업 트리에 병렬 세션 산출물 31건이 있었으나 본 IR 경로와 분리되어 미접촉.
`pnpm install`·전체 build 미실행.

---

## 2. 모집단 재검증

| 항목 | 선행 IR | 현재 재검증 | 차이 | 사유 |
|---|---:|---:|---:|---|
| route 선언 | 223 | **223** | 0 | 동일 |
| 메뉴 비연결 route | 137 | **185** | **+48** | **집계 기준 차이(코드 변경 아님)** |
| redirect | 9 | **10** | +1 | 중첩 route 정규화로 1건 추가 포착 |
| test·debug | 17 | **22** | +5 | `/__debug__/*`·`/auth-inspector`·`/gutenberg`·`/ui-showcase` 를 포함 |
| 메뉴 항목 | 41 | 41 | 0 | 동일 |

**+48 의 정체**: 선행 IR 은 "top-level" 만 셌다 — 즉 `:param` 과 `/*` 를 **제외**한 137건이다.
이번 조사는 상세(`:id`) 25건, 등록·수정 20건, wildcard 서브라우터 16건 등을 **모두 모집단에 포함**했다.
223 − 185 = **38** 개 route 가 메뉴 41개에 대응한다(일부 메뉴는 wildcard route 하나가 커버).

> 선행 IR 의 137 은 오류가 아니라 **"메뉴 연결 후보가 될 수 있는 top-level 만"** 이라는 좁은 정의였다.
> 본 IR 은 분류 목적상 넓은 정의(185)를 공식 모집단으로 채택한다.

---

## 3. 분류별 집계

| 분류 | 건수 | 의미 | 후속 조치 |
|---|---:|---|---|
| **ACTIVE_ENTRY** | **65** | 독립 업무 시작점 성격 | 메뉴 연결 **검토**(§5 에서 적합성 재분류) |
| DETAIL_CHILD | 25 | 상세 조회 하위 화면 | 상위 목록 진입 확인 (메뉴 대상 아님) |
| TEST_DEBUG | 22 | 개발·디버그 화면 | 환경 가드 검토 |
| CREATE_EDIT_CHILD | 20 | 등록·수정 하위 화면 | 상위 Action 연결 확인 (메뉴 대상 아님) |
| ACTION_CHILD | 16 | wildcard 서브라우터·업무 단계 | 상위 흐름 연결 확인 |
| HOLD | 12 | 역할·서비스 게이팅 판단 필요 | 보류 |
| **INCOMPLETE** | **11** | 미완성·not-found·빈 화면 | **연결 금지** |
| LEGACY_REDIRECT | 10 | 호환 redirect | 유지·정리 검토 |
| PUBLIC_AUTH | 4 | `/login` 등 비관리 화면 | 메뉴 대상 아님(정상) |
| **합계** | **185** | | **모집단 일치 ✅** |

---

## 4. 가장 중요한 발견 — **선행 IR 의 P1 대상 상당수가 "연결하면 안 되는" 화면이었다**

선행 IR 은 "주문·정산 / 서비스·매장 업무가 메뉴에 없다"(B-1, B-3)를 P1 으로 올렸다.
이번 브라우저 실측 결과 그 대상들이 **화면 자체가 동작하지 않는다**.

| Route | 선행 IR 판정 | **실측 결과** | 재판정 |
|---|---|---|---|
| `/admin/dropshipping/settlements` | P1 메뉴 연결 대상 | **not-found 표시** | **INCOMPLETE** |
| `/admin/dropshipping/order-relays` | P1 메뉴 연결 대상 | **not-found 표시** | **INCOMPLETE** |
| `/admin/store-network` | P1 메뉴 연결 대상 | **not-found 표시** | **INCOMPLETE** |
| `/admin/physical-stores` | P1 메뉴 연결 대상 | **not-found 표시** | **INCOMPLETE** |
| `/admin/platform/hub` | P1 메뉴 연결 대상 | **not-found 표시** | **INCOMPLETE** |
| `/admin/dashboard/operations` | menu-less | **not-found 표시** | INCOMPLETE |
| `/posts` | legacy 추정 | **not-found 표시** | INCOMPLETE |
| `/monitoring` | menu-less | 주 콘텐츠 없음(len=162) | INCOMPLETE |
| `/appearance/theme` | menu-less | 주 콘텐츠 없음 + **콘솔오류 7** | INCOMPLETE |
| `/reusable-blocks` | menu-less | 주 콘텐츠 없음(len=187) | INCOMPLETE |
| `/admin/appstore/installed` | menu-less | 주 콘텐츠 없음(len=168) | INCOMPLETE |

**→ 선행 IR 의 "메뉴 연결" 권고를 그대로 실행했다면 not-found 화면 5개를 관리자 메뉴에 노출할 뻔했다.**
triage 를 선행시킨 판단이 실제로 유효했다.

측정 기준: 사이드바 공통 텍스트를 제거한 **주 콘텐츠 길이**. 사이드바만 남으면 `len ≈ 162`.

---

## 5. `ACTIVE_ENTRY` 65건 → 메뉴 연결 적합성

| 적합성 | 건수 | 대표 |
|---|---:|---|
| **READY** | **9** | `/operator/hub-contents` `/operator/points` `/admin/yaksa` `/admin/yaksa/accounting` `/admin/services/overview` `/store/pop` `/admin/membership/categories` `/active-users` `/tools` |
| **READY_AFTER_FIX** | 8 | `/admin/orders`(콘솔오류 4) `/admin/services`(5) `/operator/approvals`(1) `/admin/yaksa/members`(2) `/admin/yaksa/fees`(2) `/store/qr`(1) `/store/tablet/settings`(2) `/store-content`(2) |
| **SERVICE_ONLY** | 7 | `/kpa/content-workspace` `/kpa/my-store-contents` `/cgm-pharmacist/*` `/pharmacy-ai-insight/summary` — 특정 서비스·앱 전용 |
| **ROLE_POLICY_REQUIRED** | 5 | `/admin/operator/my-policy` `/admin/role-applications` `/admin/enrollments` `/enrollments` `/operator/analytics/auth` |
| **HOLD / 미검증** | 36 | 브라우저 미확인(`CODE_ONLY`) — 대부분 marketing·cpt-engine·appearance·yaksa 하위 |

### READY 9건 (브라우저 확인 + 콘솔오류 0 + 실 콘텐츠)

| Route | 업무 영역 | 실측 | 권장 상위 그룹 |
|---|---|---|---|
| `/operator/hub-contents` | HUB 콘텐츠 운영 | len=1114 | 신규 **운영자** |
| `/operator/points` | 포인트 운영 | len=572 | 신규 **운영자** |
| `/admin/yaksa` | KPA 운영 허브 | len=445 | 기존 **Yaksa (KPA)** |
| `/admin/yaksa/accounting` | KPA 회계 | len=461 | 기존 **Yaksa (KPA)** |
| `/admin/services/overview` | 서비스 현황 | len=379 | 신규 **서비스** |
| `/store/pop` | 매장 POP 자료 | len=353 | 신규 **매장 자료** |
| `/admin/membership/categories` | 회원 카테고리 | len=244 | 기존 **Core** |
| `/active-users` | 활성 사용자 | len=636 | 기존 **Core** (⚠ `/users` 와 역할 중복 확인 필요) |
| `/tools` | 관리 도구 | len=578 | 성격상 하단 배치 검토 |

> **READY 만 후속 메뉴 연결 WO 의 직접 후보**다. 나머지는 선행 조건이 있다.

---

## 6. 끊긴 하위 진입선 (`BROKEN_ENTRY` 7건)

상세·편집 화면인데 **상위 화면에서 진입 링크/Action 이 코드상 확인되지 않는** 경우다.
**메뉴 연결 대상이 아니라 상위 화면의 Action 복구 대상**이다.

| Route | 유형 | 정상 상위 | 판정 | 우선순위 |
|---|---|---|---|---|
| `/admin/o4o-product-db/candidates/:id` | DETAIL | 공공데이터 후보 목록(메뉴 있음) | **FIX** — 유일하게 메뉴 있는 업무의 상세 단절 | **P1** |
| `/yaksa/communities/:id` | DETAIL | `/yaksa/communities` | CONNECT | P2 |
| `/yaksa/communities/:id/feed` | DETAIL | 〃 | CONNECT | P2 |
| `/cgm-pharmacist/patients/:patientId` | DETAIL | `/cgm-pharmacist/patients` | HOLD(앱 게이팅) | P2 |
| `/cgm-pharmacist/patients/:patientId/coaching` | DETAIL | 〃 | HOLD | P2 |
| `/editor/templates/:id` | DETAIL | 편집기 서브앱 | REVIEW | P3 |
| `/editor/patterns/:id` | DETAIL | 〃 | REVIEW | P3 |

`/admin/o4o-product-db/candidates/:id` 는 **선행 IR 이 "유일하게 동선이 완결된 영역" 이라 평가한 O4O 상품 DB 안에서** 발견된 단절이라 우선순위가 높다.

---

## 7. test·debug 22건

| 항목 | 결과 |
|---|---|
| 프로덕션 mount | **22/22 무조건 mount** — `App.tsx:65` import, `:203` `{TestRoutes()}`, **환경 분기 0건** |
| 권한 가드 | 대부분 `AdminProtectedRoute` 내부(로그인 필요). 단 `/__debug__/*` 계열은 별도 확인 필요 |
| 운영 데이터 접근 | `/admin/test/auth-debug`(not-found 표시), `/ui-showcase`(len=1011), `/gutenberg`(len=964) 등 렌더 확인. **쓰기 가능성은 미검증** |
| 대표 경로 | `/admin/test/*` 12, `/test/*` 2, `/__debug__/*` 3, `/ui-showcase`, `/gutenberg`, `/auth-inspector`, `/debug/auth` |
| 권장 처리 | **환경 가드 후보** (개발 전용 route 후보) |
| 위험도 | **P2** — 인증은 필요하고 비인가 노출 증거는 없음. 쓰기 Action 미검증이라 **P0 로 단정하지 않음** |

---

## 8. legacy·redirect·중복·제거 후보

| Route | 유형 | 현재 역할 | 대체 Route | 판정 |
|---|---|---|---|---|
| `/admin/o4o-product-db/review`, `/drug-description-drafts`, `/description-dashboard`, `/description-review-queue`, `/description-status` (+`:id` 2) | LEGACY_REDIRECT | `→ ../masters` | `masters` | **KEEP** (의도된 호환) |
| `/home` | ACTIVE_ENTRY(코드) | `AdminHome.tsx` — 모의 화면 | `/admin` | **DUPLICATE / REVIEW** — 선행 IR A-2 |
| `/dashboard` | ACTIVE_ENTRY | len=422 렌더 | `/admin` | **DUPLICATE 의심** — 어느 쪽이 정식인지 확인 필요 |
| `/users/add` vs `/users/new` | CREATE_EDIT | 동일 업무 추정 | — | **REVIEW** (동일 component 여부 미확인) |
| `/enrollments` vs `/admin/enrollments` | ACTIVE_ENTRY | 동일 업무 추정 | — | **REVIEW** |
| `/active-users` vs `/users` | ACTIVE_ENTRY | 역할 중복 가능 | — | **REVIEW** |
| `/posts`, `/categories`, `/posts/tags`, `/acf/groups` | INCOMPLETE/ACTIVE | CMS 이전 세대 추정 | `/admin/cms/*` | **REVIEW** — 외부 bookmark 가능성 배제 불가 |

> 어느 항목도 `REMOVE` 로 확정하지 않았다. 코드 참조만으로 외부 사용을 배제할 수 없어 전부 `REVIEW`/`KEEP` 이다.
> **`REMOVE_CANDIDATE` 최종 확정 = 0건.**

---

## 9. 업무 영역별 결론

```text
업무 영역: 주문·거래·정산
독립 시작점: /admin/orders (렌더되나 콘솔오류 4)
끊긴 진입선: 없음(메뉴 자체가 없음)
미완성·중복: settlements · order-relays 모두 not-found
메뉴 연결 가능 대상: 없음 (orders 는 READY_AFTER_FIX)
결론: 선행 IR 의 "메뉴 연결" 은 시기상조. 화면 복구가 선행되어야 한다.
```

```text
업무 영역: 승인·검토
독립 시작점: /operator/approvals (len=255, 콘솔오류 1)
메뉴 연결 가능 대상: READY_AFTER_FIX
결론: 오류 해소 후 연결. 승인 업무 진입점 부재는 실재하는 P1 이다.
```

```text
업무 영역: 서비스·매장·조직
독립 시작점: /admin/services, /admin/services/overview
미완성: store-network · physical-stores · platform/hub 전부 not-found
메뉴 연결 가능 대상: /admin/services/overview (READY)
결론: 매장·조직 관리는 화면이 없다. "메뉴 누락" 이 아니라 "미구현" 에 가깝다.
```

```text
업무 영역: 매장 활용 자료
독립 시작점: /store/pop(READY) · /store/qr · /store/tablet/settings · /store-content
결론: POP 는 즉시 연결 가능. QR·태블릿은 콘솔오류 확인 후.
```

```text
업무 영역: KPA 운영
독립 시작점: /admin/yaksa(허브) · accounting · members · fees · officers · education · reports
메뉴 연결 가능 대상: /admin/yaksa, /admin/yaksa/accounting (READY)
결론: 기존 Yaksa 그룹에 편입만 하면 되는, 가장 안전한 연결 대상이다.
```

```text
업무 영역: test·debug
결론: 22건 전부 프로덕션 mount. 환경 가드가 유일한 조치 대상이며 P2.
```

---

## 10. 후속 WO 후보

```text
후보 WO: ADMIN-INCOMPLETE-SCREEN-DISPOSITION
목표: INCOMPLETE 11건을 "복구 대상 / 미구현 확정 / 제거 후보" 로 판정
포함 Route: settlements, order-relays, store-network, physical-stores, platform/hub,
           dashboard/operations, posts, monitoring, appearance/theme, reusable-blocks,
           appstore/installed
예상 변경 범위: 조사 (코드 0)
선행 조건: 없음
제외 범위: 메뉴 연결
위험: 없음
독립 실행 가능: 예   ← 메뉴 연결보다 반드시 선행
```

```text
후보 WO: ADMIN-MENU-CONNECT-READY-ONLY
목표: READY 9건만 메뉴에 연결
포함 Route: operator/hub-contents, operator/points, admin/yaksa, admin/yaksa/accounting,
           admin/services/overview, store/pop, admin/membership/categories,
           active-users, tools
예상 변경 범위: admin-menu.static.tsx 1파일
선행 조건: /active-users ↔ /users 중복 여부 확인
제외 범위: READY_AFTER_FIX·INCOMPLETE 전부
위험: 낮음
독립 실행 가능: 예
```

```text
후보 WO: ADMIN-PRODUCT-DB-CANDIDATE-DETAIL-ENTRY-FIX
목표: 공공데이터 후보 목록 → 상세(:id) 진입 Action 복구
포함 Route: /admin/o4o-product-db/candidates(/:id)
예상 변경 범위: 목록 화면 1파일
선행 조건: 상세 화면 정상 동작 확인
위험: 낮음
독립 실행 가능: 예
```

```text
후보 WO: ADMIN-TEST-ROUTE-ENV-GATE
목표: test·debug 22건 프로덕션 제외
포함 Route: TEST_DEBUG 22
예상 변경 범위: App.tsx 조건부 mount
선행 조건: 운영 중 사용 여부 확인
위험: 낮음
독립 실행 가능: 예
```

```text
후보 WO: ADMIN-DASHBOARD-ENTRYPOINT-FIX   (선행 IR A-1 승계)
목표: /admin 모의 대시보드 죽은 링크 17건 정리 + /home·/dashboard 중복 정리
위험: 낮음
독립 실행 가능: 예
```

```text
후보 WO: ADMIN-DUPLICATE-ROUTE-REVIEW
목표: /home·/dashboard·/users/add·/enrollments·/active-users·/posts 계열 중복 판정
예상 변경 범위: 조사
위험: 없음
독립 실행 가능: 예
```

```text
후보 WO: ADMIN-MENU-VISIBILITY-POLICY   [HOLD]
목표: 메뉴 가시성 정책(39/41 무게이트) + 역할 전용 화면 정리
선행 조건: 역할 정책 결정, RBAC F9 Freeze 와 분리 확인
위험: 높음
독립 실행 가능: 아니오
```

---

## 11. 미검증·HOLD

- **브라우저 미확인 138건** — 47개만 실측했다. 나머지는 `CODE_ONLY` 이며, 특히 `ACTIVE_ENTRY` 65건 중 **36건이 코드 기준 추정**이다.
- **쓰기 동작 전면 미검증** — 생성·수정·삭제·승인 버튼을 클릭하지 않았다. 모든 항목에 `WRITE_UNVERIFIED`.
- **test·debug 의 쓰기 Action 존재 여부 미확인** — 이 때문에 P0 로 격상하지 않고 P2 로 두었다.
- **역할별 차이 미확인** — super_admin 1개 계정. `/dashboard/business`·`/dashboard/seller/*` 는 이 계정에서 **권한 거부**로 확인되어 `HOLD`(역할 전용)로 분류했다.
- **RBAC F9 Freeze** — UPDATE 2건 관련 판단 없음, `HOLD` 유지.
- **legacy 외부 사용 여부** — bookmark·외부 링크 사용을 코드로 배제할 수 없어 `REMOVE_CANDIDATE` 를 0건으로 두었다.

---

## 12. 검증 체크

| # | 항목 | 결과 |
|---|---|:--:|
| 1 | 모집단 전 route 가 정확히 한 번 포함 | ✅ 185 |
| 2 | 주 분류 합계 = 모집단 | ✅ 185 = 185 |
| 3 | 메뉴 없음만으로 ACTIVE_ENTRY 판정 안 함 | ✅ 브라우저·inbound link 반영 |
| 4 | 상세·등록·수정을 메뉴 후보에서 제외 | ✅ 45건 별도 |
| 5 | ACTIVE_ENTRY 에 component·근거 존재 | ✅ |
| 6 | 상위 진입 링크 존재 여부 확인 | ✅ `BROKEN_ENTRY` 7 |
| 7 | test·debug 프로덕션 mount 확인 | ✅ 22/22 |
| 8 | legacy·redirect·중복 구분 | ✅ |
| 9 | 제거 후보를 추정으로 확정 안 함 | ✅ REMOVE 0건 |
| 10 | RBAC F9 HOLD 유지 | ✅ |
| 11 | 코드 조사 ↔ 브라우저 확인 구분 | ✅ `CODE_ONLY`/`BROWSER_VERIFIED` |
| 12 | 쓰기 동작 미실행 | ✅ |
| 13 | 코드·운영 데이터 변경 0 | ✅ |
| 14 | 연결 후보를 READY 와 그 외로 구분 | ✅ READY 9 |

---

*조사 전용 · 코드 0 변경 · 운영 데이터 0 변경 · 배포 없음*
