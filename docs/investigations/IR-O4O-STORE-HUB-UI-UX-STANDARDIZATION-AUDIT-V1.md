# IR-O4O-STORE-HUB-UI-UX-STANDARDIZATION-AUDIT-V1

**작성 일자**: 2026-06-01  
**조사 환경**: HEAD (main) `999c25d9f` 시점 정적 코드 (read-only)  
**작업 성격**: read-only 조사 — 코드/UI/API/DB/menu 수정 없음  
**범위 한정**: IR-O4O-UI-UX-STANDARDIZATION-CROSSAREA-AUDIT-V1 중 **매장 허브(Store Hub) 영역만**

---

## 1. 조사 개요

O4O 4개 서비스(KPA-Society, GlycoPharm, K-Cosmetics, Neture)의 **매장 허브(Store Hub)** 영역 UI-UX 표준화 현황을 조사한다. Operator/Admin·My Store 영역은 본 IR 범위 외(별도 채팅방/IR).

**핵심 결론**: Store Hub는 이미 **Cycle 1 정렬 완료**로 기능·copy API·사용자 표현이 통일됨. 남은 표준화 여지는 **Hub Layout 프레임 복제**(GP/K-Cos) 1건이며, 우선순위는 낮다.

---

## 2. 사전 git 상태

```
 M services/web-k-cosmetics/src/pages/admin/KCosmeticsAdminDashboard.tsx  ← 다른 세션 WIP (미접촉)
?? docs/investigations/IR-O4O-ADMIN-DASHBOARD-LAYOUT-COMMONIZATION-AUDIT-V1.md ← 다른 세션 WIP
?? docs/investigations/IR-O4O-UI-UX-STANDARDIZATION-CROSSAREA-AUDIT-V1.md ← 다른 세션 WIP (전체 IR, 미접촉)
?? services/web-glycopharm/docs/ ← 다른 세션 WIP
?? *.png ← 사용자/smoke 스크린샷
```

staged 없음. 본 IR 문서 생성 외 소스 파일 수정 없음. **다른 세션 WIP 미접촉.**

---

## 3. 조사 대상 서비스/영역

| 서비스 | Hub 명칭 | Hub 진입 경로 | 비교 대상 |
|--------|---------|-------------|:---:|
| KPA-Society | 매장 운영 허브 | `/store-hub` | ✅ canonical |
| GlycoPharm | 매장 운영 허브 | `/store-hub` | ✅ |
| K-Cosmetics | 매장 운영 허브 | `/store-hub` | ✅ |
| Neture | (공급자/파트너 워크스페이스) | `/workspace/hub` | ⚠️ 구조 상이 — 제외 |

**Neture 제외 사유**: Neture는 매장(store owner) 개념이 없고 공급자·파트너 워크스페이스 구조. Store Hub cross-service 비교 대상이 아니다.

---

## 4. Store Hub UI 3계층 구조

Store Hub는 3개 계층으로 구성된다. 계층별 표준화 수준이 다르다.

| 계층 | 역할 | 표준화 도구 | 상태 |
|------|------|-----------|:---:|
| **L1 Hub Layout** | 사이드바/메뉴 프레임 + Outlet | (서비스별 자체) | ⚠️ GP/K-Cos 복제 |
| **L2 Hub Landing** | 홈 랜딩 (자원 탐색 카드) | `StoreHubTemplate` | ✅ 공통 |
| **L3 Hub Sections** | B2B/Signage/Content/Blog/Pop/Qr 리스트 | `DataTable`+`ActionBar` / `ContentHubTemplate` | ✅ Cycle 1 완료 |

---

## 5. L1 — Hub Layout 현황

| 서비스 | 파일 | 라인 | 구현 방식 |
|--------|------|:---:|---------|
| KPA | `components/pharmacy/PharmacyHubLayout.tsx` | 256 | `MENU[]` config array + 렌더 |
| GlycoPharm | `components/layouts/GlycoPharmHubLayout.tsx` | 172 | `NavLink + Outlet` 직접 구현 |
| K-Cosmetics | `components/layouts/KCosmeticsHubLayout.tsx` | 171 | `NavLink + Outlet` 직접 구현 |

### 메뉴 항목 비교

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|------|:---:|:---:|:---:|
| 홈 | ✅ | ✅ | ✅ |
| 상품 카탈로그 (B2B) | ✅ | ✅ | ✅ |
| 사이니지 | ✅ "디지털 사이니지" | ✅ "사이니지" | ✅ "사이니지" |
| 콘텐츠 | ✅ "콘텐츠/자료" | ✅ "콘텐츠" | ✅ "콘텐츠/자료" |
| 블로그 | ✅ | ✅ | ✅ |
| POP | ✅ | ✅ | ✅ |
| QR | ✅ "QR-code" | ✅ "QR 코드" | ✅ "QR 코드" |
| 이벤트/특가 | ✅ "이벤트/특가" | ✅ "이벤트/특가" | ✅ "캠페인·이벤트" |

**발견**:
- **GP ↔ K-Cos HubLayout이 ~99% 동일** (172 vs 171줄). 라벨 일부(이벤트/특가 vs 캠페인·이벤트)만 다름 — **구현 편차(복제)**.
- KPA는 `MENU[]` config array 방식 + sidebar 구조가 달라 별도 유지 — **부분 도메인 차이**.
- 공통 `StoreHubLayout` 컴포넌트는 **존재하지 않음** — GP/K-Cos가 NavLink/Outlet 프레임을 각자 복제.

---

## 6. L2 — Hub Landing 현황

| 서비스 | 파일 | 구현 방식 |
|--------|------|---------|
| KPA | `pages/pharmacy/StoreHubPage.tsx` | `StoreHubTemplate` + `kpaConfig` ✅ |
| GlycoPharm | `pages/hub/StoreHubPage.tsx` | `StoreHubTemplate` + `glycopharmConfig` ✅ |
| K-Cosmetics | `pages/hub/KCosmeticsHubPage.tsx` | `StoreHubTemplate` + config ✅ |

**3서비스 모두 `@o4o/shared-space-ui` 의 `StoreHubTemplate` (config-driven) 사용 — 완전 공통화 완료.** 서비스별 차이는 config 객체(heroTitle, resourceCards, aiBlock)에만 존재.

> 참고: 이전 `IR-O4O-UI-UX-STANDARDIZATION-CROSSAREA-AUDIT-V1`에서 "KPA Hub는 비스포크"로 기록되었으나, 실제로 KPA `StoreHubPage.tsx`도 `StoreHubTemplate`을 사용한다. 비스포크인 것은 L1 Layout(`PharmacyHubLayout`)이지 L2 Landing이 아니다. **본 IR로 정정.**

---

## 7. L3 — Hub Sections 현황

| 섹션 | KPA | GlycoPharm | K-Cosmetics | 표준 도구 |
|------|:---:|:---:|:---:|------|
| B2B 카탈로그 | ✅ | ✅ | ✅ | `DataTable` + `ActionBar` |
| 사이니지 | ✅ | ✅ | ✅ | `DataTable` + `ActionBar` + media/playlist 탭 |
| 콘텐츠 | ✅ | ✅ | ✅ | `ContentHubTemplate` (single-action) |
| 블로그 | ✅ | ✅ | ✅ | `DataTable` + `ActionBar` |
| POP | ✅ | ✅ | ✅ | `DataTable` + `ActionBar` |
| QR | ✅ | ✅ | ✅ | `DataTable` + `ActionBar` |

**L3 섹션은 Cycle 1(`CHECK-O4O-CROSSSERVICE-STORE-HUB-CANONICAL-ALIGNMENT-CYCLE1-V1`)에서 전 영역 정렬 완료.** assetSnapshotApi.copy / copy 사용자 표현까지 통일됨.

---

## 8. 리스트 UI 패턴 비교 (L3)

| 패턴 | B2B/Signage/Blog/Pop/Qr | Content |
|------|:---:|:---:|
| 테이블 | `@o4o/operator-ux-core DataTable` | (카드 그리드 또는 기본) |
| 체크박스 multi-select | ✅ | ❌ (single-action 정책) |
| ActionBar | ✅ `@o4o/ui ActionBar` | ❌ |
| 검색/필터/탭 | ✅ (유통유형/producer/media-playlist) | ✅ (filter pills) |
| pagination | ✅ | ✅ |
| empty/loading/error | ✅ | ✅ (ContentHubTemplate 내장) |
| 상세 보기 | `BaseDetailDrawer` (Signage 등) / inline row action | 카드 클릭 |

**일관성**: L3 리스트는 3서비스가 동일 컴포넌트(`DataTable` + `ActionBar`)를 사용해 조작 질서가 통일됨.

---

## 9. 체크박스 선택 후 액션 흐름 비교 (L3)

| 흐름 | B2B | Signage | Blog/Pop/Qr | Content |
|------|:---:|:---:|:---:|:---:|
| 다중 선택 | ✅ | ✅ | ✅ | ❌ |
| bulk action | "내 매장에 추가" | "내 매장에 추가" | "내 매장으로 가져가기" | (단건 복사) |
| ActionBar | ✅ | ✅ | ✅ | ❌ |
| 선택 해제 | ✅ | ✅ | ✅ | — |
| bulk 결과 표시 | `BulkResultModal` | `BulkResultModal` | `BulkResultModal` | toast |
| 실패 항목 처리 | results 배열 + 재시도 | 동일 | 동일 | — |
| 위험 작업 confirm | (추가는 비위험) | (추가는 비위험) | (추가는 비위험) | — |

**일관성**: "선택 → 내 매장에 추가 → BulkResultModal" 흐름이 L3 전체에서 통일. Content만 single-action 정책(의도된 차이).

---

## 10. 공통 컴포넌트 사용 현황 (Store Hub)

| 컴포넌트 | 패키지 | L1 Layout | L2 Landing | L3 Sections |
|---------|--------|:---:|:---:|:---:|
| `StoreHubTemplate` | shared-space-ui | — | ✅ 3서비스 | — |
| `ContentHubTemplate` | shared-space-ui | — | — | ✅ Content |
| `DataTable` | operator-ux-core | — | — | ✅ B2B/Signage/Blog/Pop/Qr |
| `ActionBar` | @o4o/ui | — | — | ✅ |
| `BulkResultModal` | @o4o/ui | — | — | ✅ |
| `BaseDetailDrawer` | @o4o/ui | — | — | ✅ Signage 등 |
| `Pagination` | operator-ux-core | — | — | ✅ |
| **Hub Layout 프레임** | (없음) | ❌ 서비스별 복제 | — | — |

**유일한 미공통 영역**: L1 Hub Layout (NavLink/Outlet 프레임). GP/K-Cos가 거의 동일 코드를 각자 보유.

---

## 11. 표준화 가능 영역

| 항목 | 현황 | 가능성 | 우선순위 |
|------|------|:---:|:---:|
| L1 Hub Layout 공통화 (GP+K-Cos) | NavLink/Outlet 프레임 ~99% 복제 | ✅ config-driven 추출 가능 | 낮음 |
| L2 Hub Landing | StoreHubTemplate 완료 | — | 완료 |
| L3 Hub Sections | DataTable/ActionBar 완료 | — | 완료 (Cycle 1) |
| 이벤트/특가 라벨 통일 | "이벤트/특가" vs "캠페인·이벤트" | ✅ 단순 | 낮음 (서비스 정체성 가능) |

### L1 공통화 후보 (진행 시)

```
WO-O4O-STORE-HUB-LAYOUT-TEMPLATE-V1 (가칭)
  - packages/shared-space-ui 또는 store-ui-core 에 StoreHubLayout 추가
  - config: menuItems[], serviceLabel, colorTheme
  - GP + K-Cos 를 config 소비자로 전환
  - KPA(PharmacyHubLayout)는 sidebar 구조 차이로 별도 유지 또는 후속 평가
  - 예상 절약: ~170줄 × 1 (GP↔K-Cos 중복 해소)
```

---

## 12. 표준화 위험 영역

| 항목 | 위험 이유 |
|------|---------|
| KPA PharmacyHubLayout 통합 | MENU config array + sidebar 구조가 GP/K-Cos의 NavLink 프레임과 다름. 강제 통합 시 KPA 회귀 위험 |
| L1 Layout 공통화 후 서비스 divergence | 향후 특정 서비스만 hub 메뉴 추가 시 config 확장 필요 — 설계 시 고려 |
| Neture hub 포함 | 공급자/파트너 워크스페이스 — store 개념 없음. 포함 금지 |
| 이벤트/특가 라벨 강제 통일 | "캠페인·이벤트"가 K-Cos 정체성일 수 있음 — display label만, 신중히 |

---

## 13. 우선순위 제안

### 🟢 Store Hub는 사실상 완료 — 신규 작업 불요가 기본

| 우선순위 | 항목 | 권장 |
|:---:|------|------|
| — | L2 Landing / L3 Sections | **완료 — 작업 불요** |
| 낮음 | L1 Hub Layout 공통화 (GP+K-Cos) | 선택적 — 유지보수 빈도 높아지면 진행 |
| 낮음 | 이벤트/특가 라벨 정렬 | 선택적 — 서비스 정체성 확인 후 |

**권고**: Store Hub는 Cycle 1으로 핵심 표준화가 끝났다. L1 Layout 복제는 유지보수 비용이 실제로 문제될 때(예: hub 메뉴 동시 변경이 잦아질 때) 진행하면 충분하다. 지금 당장 공통화할 필요는 낮다.

---

## 14. 후속 WO 후보

| WO | 범위 | 위험도 | 우선순위 |
|----|------|:---:|:---:|
| `WO-O4O-STORE-HUB-LAYOUT-TEMPLATE-V1` | GP+K-Cos HubLayout → 공통 StoreHubLayout 추출 | 낮음 | 낮음 (선택) |
| `WO-O4O-STORE-HUB-EVENT-OFFER-LABEL-ALIGNMENT-V1` | 이벤트/특가 라벨 통일 검토 | 매우 낮음 | 낮음 (선택) |
| `IR-O4O-KPA-PHARMACY-HUB-LAYOUT-MIGRATION-AUDIT-V1` | KPA Layout 공통화 가능성 (L1 공통화 후) | — | 보류 |

---

## 15. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|:---:|
| **운영 경험 공통화 — Store Hub** | L2 Landing(StoreHubTemplate) + L3 Sections(DataTable/ActionBar) 3서비스 통일. 조작 질서 일관. | ✅ 충돌 없음 |
| **서비스별 차이 = 도메인 차이 vs 구현 편차** | L1 GP↔K-Cos Layout 복제 = **구현 편차**(정합 가능). KPA Layout sidebar 구조 = **부분 도메인 차이**. Neture 워크스페이스 = **도메인 차이**(제외 정당). | ✅ 명확히 구분 |
| **동일 역할 ≠ 동일 화면, 동일 조작 질서** | store owner가 hub에서 탐색→선택→가져가기 하는 흐름이 L3 전체에서 통일. L1 프레임 차이는 조작 질서에 영향 없음(메뉴 위치만). | ✅ |
| **리스트 선택 → 후속 작업 흐름** | "체크박스 → 내 매장에 추가 → BulkResultModal" 흐름이 B2B/Signage/Blog/Pop/Qr 전체 통일. O4O 운영 효율 방향에 부합. | ✅ |
| **공통화 필요 영역 vs 서비스별 예외** | 공통화 필요: L1 Layout(GP/K-Cos, 선택적). 예외 유지: KPA Layout(sidebar 차이), Neture(워크스페이스), 서비스별 hero 문구/색상. | ✅ |
| **1인 개발 생산성** | L1 Layout 복제 ~170줄이 유일한 중복. 유지보수 빈도 낮으면 현 상태가 비용 최소. 공통화는 빈도 증가 시 정당화. | ⚠️ 선택적 |
| **Store Hub 핵심 가치 "매장 실행 자산 탐색·가져가기"** | L2/L3에서 완전히 구현·통일. 공통화 추가가 이 가치를 개선하지 않음. | ✅ |
| **Neture 오포함 여부** | Neture는 store 개념 부재로 명시적 제외. | ✅ |

**결론**:
1. Store Hub는 L2 Landing(StoreHubTemplate) + L3 Sections(DataTable/ActionBar) 모두 표준화 완료 — Cycle 1으로 핵심 종료.
2. 남은 표준화 여지는 L1 Hub Layout 복제(GP/K-Cos) 1건 — **구현 편차이나 우선순위 낮음**.
3. KPA Layout(sidebar 구조)·Neture(워크스페이스)는 의도된 차이로 유지.
4. 즉시 구현보다 **유지보수 빈도 모니터링 후 L1 공통화 결정**이 1인 개발에 합리적.

---

## 부록 — 조사한 주요 파일

| 파일 | 내용 |
|------|------|
| `services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx` | KPA Hub Layout (256줄, MENU config) |
| `services/web-glycopharm/src/components/layouts/GlycoPharmHubLayout.tsx` | GP Hub Layout (172줄, NavLink/Outlet) |
| `services/web-k-cosmetics/src/components/layouts/KCosmeticsHubLayout.tsx` | K-Cos Hub Layout (171줄, GP와 ~99% 동일) |
| `services/web-kpa-society/src/pages/pharmacy/StoreHubPage.tsx` | KPA Landing (StoreHubTemplate) |
| `services/web-glycopharm/src/pages/hub/StoreHubPage.tsx` | GP Landing (StoreHubTemplate) |
| `services/web-k-cosmetics/src/pages/hub/KCosmeticsHubPage.tsx` | K-Cos Landing (StoreHubTemplate) |
| `services/web-*/src/pages/{hub,pharmacy}/HubB2B*.tsx` | L3 B2B 섹션 (DataTable+ActionBar) |
| `packages/shared-space-ui/src/StoreHubTemplate.tsx` | L2 공통 템플릿 |
| `packages/shared-space-ui/src/ContentHubTemplate.tsx` | L3 Content 공통 템플릿 |

---

## 관련 선행 문서

- `CHECK-O4O-CROSSSERVICE-STORE-HUB-CANONICAL-ALIGNMENT-CYCLE1-V1` (L3 정렬 완료)
- `IR-O4O-CROSSSERVICE-STORE-HUB-PAGE-COMMONIZATION-V1` (L3 공통화 보류 결정)
- `IR-O4O-UI-UX-STANDARDIZATION-CROSSAREA-AUDIT-V1` (전체 영역 — 다른 세션, 본 IR은 Store Hub 상세 보강)

---

*작성: Claude Code (2026-06-01)*  
*read-only 조사 — 코드/DB/source/migration 수정 없음*  
*다른 세션 WIP 미접촉. git add/commit/push 미실행 (사용자 지시).*
