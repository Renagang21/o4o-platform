# SMOKE-O4O-RESPONSIVE-SIDEBAR-CUMULATIVE-POST-DEPLOY-V1

> **유형**: 운영 배포 후 browser smoke (read-only — 코드 변경 없음)
> **대상**: 최근 완료된 responsive sidebar 변경 3건
> - P0 store-hub/supplier drawer (`WO-O4O-RESPONSIVE-SIDEBAR-P0-BROKEN-MOBILE-DRAWER-FIX-V1`)
> - operator/admin 공통 lg 표준화 (`WO-O4O-RESPONSIVE-SIDEBAR-OPERATOR-ADMIN-LG-STANDARDIZATION-V1`)
> - GP/KCos admin DashboardLayout flex sibling (`WO-O4O-GP-KCOS-ADMIN-DASHBOARD-LAYOUT-RESPONSIVE-CLEANUP-V1`)
> **수행**: Playwright (실 브라우저, 운영 도메인), 2026-06-17
> **결과**: **PASS** — 검증한 4개 대표 surface 전부 정상. 잔여 surface 는 동일 컴포넌트/복제본 parity.

---

## 0. 결론

- 직접 구동 검증한 4개 대표 surface(GP operator·GP admin·GP store-hub·Neture supplier) **전부 PASS**.
- 핵심 리스크였던 **#2 GP admin flex sibling 구조**(desktop 겹침/가로스크롤)와 **#1 공통 md→lg 전환**(1023↔1024 경계) 모두 실측 정상.
- horizontalScroll **전 구간 false**, 본문/사이드바 **겹침 0**, drawer open/close(overlay·ESC·메뉴선택) 정상, post-login **console error 0**.
- 잔여 surface(KCos admin/store-hub, KCos·KPA operator, Neture admin)는 **동일 공통 컴포넌트(DomainIASidebar/OperatorAreaShell) 또는 동일 복제 코드** → parity 로 커버.

---

## 1. 직접 구동 검증 결과 (측정값)

### #2 GP admin DashboardLayout (`/admin`) — 구조 변경(최고 리스크)
| viewport | aside | main | h-scroll | 판정 |
|---------:|-------|------|:--------:|:----:|
| 1440 | sticky, left 0, **w 256** | left **256**, w 1176 | false | PASS (겹침 0) |
| 1024 | sticky, block, w 256 | left 256, w 760 | false | PASS |
| 1023 | **fixed, translateX(-256)** off-canvas | **left 0, w 1015** (margin 잔재 0) | false | PASS |
| drawer open(1023) | translateX(0), overlay z40 | — | false | PASS |
| overlay click | translateX(-256), overlay 제거 | — | — | PASS (close) |

→ `lg:ml-64` 제거 검증: 1023 에서 본문 left 0(margin 잔재 없음), desktop 에서 main left=사이드바 w(256) 정확히 인접(겹침 0).

### #1 GP operator (`/operator`) — 공통 DomainIASidebar md→lg + ESC + 토큰
| viewport | desktop sidebar | drawer | h-scroll | 판정 |
|---------:|----------------|--------|:--------:|:----:|
| 1024 | **display block (표시)** | — | false | PASS |
| 1023 | **display none (숨김)** | fixed off-canvas, 햄버거 표시 | false | PASS |
| drawer open(1023) | — | translateX(0), overlay | false | PASS |
| **ESC**(1023) | — | translateX(-288) close, overlay 제거 | — | **PASS (ESC 신규 동작 확인)** |

→ md→lg 검증: 1023(<lg)에서 사이드바 숨김+drawer (이전 md 기준이면 표시됐을 구간). ESC close 핸들러(본 사이클 신규) 실동작 확인.

### #5 GP store-hub (`/store-hub`) — P0 drawer
| viewport | sidebar | drawer | h-scroll | 판정 |
|---------:|---------|--------|:--------:|:----:|
| 1280 | sticky, visible, **w 208**(w-52) | 햄버거 숨김 | false | PASS |
| 1023 | fixed off-canvas(left -288) | 햄버거 표시 | false | PASS |
| drawer open(1023) | — | left 0, overlay | false | PASS |
| ESC(1023) | — | left -288 close, overlay 제거 | — | PASS |

### #6 Neture supplier (`/supplier`) — P0 drawer (수평탭 → 전체메뉴 drawer)
| viewport | desktop sidebar | drawer | h-scroll | 판정 |
|---------:|----------------|--------|:--------:|:----:|
| 1280 | block, visible, **w 240**(w-60) | 햄버거 숨김 | false | PASS |
| 1023 | hidden | fixed off-canvas, 햄버거 표시 | false | PASS |
| drawer open(1023) | — | left 0, overlay | false | PASS |
| 그룹 펼침 | — | **중첩항목 '제품 목록' 도달 ✅**(이전 수평탭 불가) · drawer 유지(그룹토글이 닫지 않음) | — | PASS |
| ESC(1023) | — | close, overlay 제거 | — | PASS |
| console error | — | **0** | — | PASS |

---

## 2. 확인 항목 체크리스트

| 항목 | 결과 |
|------|------|
| <1024 hamburger 표시 | ✅ (operator/store-hub/supplier/admin) |
| <1024 sidebar 기본 숨김 | ✅ (display none / fixed off-canvas) |
| drawer open/close | ✅ |
| overlay click close | ✅ (GP admin 실측) |
| ESC close (적용 영역) | ✅ (#1 operator / #5 store-hub / #6 supplier — 실측). admin DashboardLayout 은 ESC 미적용(설계대로) |
| 메뉴 선택 후 close | ✅ (onClick=closeMobile 코드 + drawer 내 Link 존재 확인) |
| >=1024 sidebar 고정 표시 | ✅ |
| 본문/sidebar 겹침 없음 | ✅ (admin main left=사이드바 w) |
| header/sub-header 충돌 | ✅ (sticky top 정상, GP 검색 sub-header 위치 정상) |
| horizontal scroll | ✅ 전 구간 없음 |
| active menu 표시 | ✅ |
| console error (post-login) | ✅ 0 |
| route broken | ✅ 없음 |

---

## 3. parity 로 커버(직접 미구동) — 동일 코드

| surface | 근거 |
|---------|------|
| KCos admin DashboardLayout | GP admin 과 **동일 복제 코드**(WO 에서 동일 패턴 적용 확인) |
| KCos store-hub | GP store-hub 와 **동일 복제 코드** |
| KCos / KPA operator, Neture admin/operator | **공통 컴포넌트** `DomainIASidebar`+`OperatorAreaShell` 단일 소비 — GP operator 로 동작 검증됨 |

> 공통 컴포넌트는 1개 코드가 5개 surface 를 구동하므로 GP operator 검증 = 컴포넌트 검증. admin DashboardLayout 은 GP/KCos 2복제본 — GP 검증 + 코드 동일성.

---

## 4. Known Limitation

```
- 375px 픽셀 단위 미측정: <lg 구간은 동일 CSS(lg:hidden / fixed drawer) → 1023 검증으로 <lg 동작 대표. 375 별도 측정 생략(동일 분기).
- KCos/KPA 개별 서비스 미구동: §3 parity(동일 코드/공통 컴포넌트)로 커버. 필요 시 후속 개별 smoke.
- MCP auth-persistence 제약: full-page goto 시 인메모리 토큰 소실 → 로그인 후 client-side 링크 내비로 우회(기존 IR-O4O-PLAYWRIGHT-MCP-AND-TEST-ACCOUNT-SMOKE-BLOCKER-AUDIT-V1 와 동일 현상). 검증 자체엔 영향 없음.
- admin DashboardLayout ESC 미적용: 설계대로(이번 사이클 범위 밖). overlay+X+메뉴선택 close 는 동작.
```

---

## 5. 후속

```
- 후속 WO 필요 없음(수정 발견 0). 잔여 표준화는 계획대로:
  · WO-O4O-KPA-ADMIN-SIDEBAR-LG-STANDARDIZATION-V1 (#3 KPA admin AdminSidebar, md→lg)
  · #4 store StoreSidebar 토큰 정렬
- (선택) KCos/KPA 개별 surface smoke 를 원하면 별도 수행.
```

---

*post-deploy browser smoke. 4개 대표 surface(#1 operator / #2 GP admin flex / #5 store-hub / #6 supplier) 전부 PASS. h-scroll 0 · 겹침 0 · drawer open/close(overlay·ESC) · console error 0. 잔여는 동일코드 parity. 수정 발견 0 → 다음 단계(#3 KPA admin) 진행 가능.*
