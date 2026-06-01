# CHECK-O4O-CURRENT-WORKSTREAM-NEXT-SCOPE-AUDIT-V1

**작성 일자**: 2026-06-01  
**조사 환경**: HEAD (main) `3334a72e9` 시점 정적 코드 + git log (read-only)  
**작업 성격**: read-only CHECK — 코드/UI/API/DB 수정 없음  
**목적**: 이 채팅방 워크스트림 기준 다음 작업 후보 정리 (Admin Dashboard 제외)

---

## 1. 현재 완료 축

이 채팅방에서 완료(고정)된 3개 축:

| 축 | 상태 | 대표 산출물 |
|----|:---:|-----------|
| **1. Store HUB Cycle 1 정렬** | ✅ 완료 | `CHECK-O4O-CROSSSERVICE-STORE-HUB-CANONICAL-ALIGNMENT-CYCLE1-V1` |
| **2. Operator Members 공통화** | ✅ 완료 | `CHECK-O4O-OPERATOR-MEMBERS-COMMONIZATION-LIVE-SMOKE-V1` |
| **3. GlycoPharm OPL/checkout/storefront 안정화** | ✅ 완료 | `CHECK-O4O-GLYCOPHARM-STOREFRONT-CHECKOUT-POST-OPL-CONSTANTS-V2` |

### 축별 완료 세부

**Store HUB Cycle 1**
- L3 Sections(B2B/Signage/Content/Blog/Pop/Qr) DataTable+ActionBar 통일
- assetSnapshotApi.copy / dashboardCopyApi 제거 / copy 사용자 표현 통일
- L2 Landing StoreHubTemplate 공통화 확인
- L1 Layout 복제는 우선순위 낮음으로 보류 (`IR-O4O-STORE-HUB-UI-UX-STANDARDIZATION-AUDIT-V1`)

**Operator Members 공통화**
- 목록 UI: OperatorMembersConsolePage thin wrapper (Neture/GP/K-Cos)
- 편집 모달: CommonEditUserModal config-driven
- API client: service-local 유지 (공통화 가치 낮음)
- live smoke: 3서비스 배포 환경 PASS

**GlycoPharm OPL/checkout/storefront**
- ecommerce_orders → checkout_orders 정렬
- OPL serviceKey Option β + GLYCOPHARM_OPL_SERVICE_KEYS 상수화
- post-constants smoke PASS

---

## 2. 제외한 Admin 작업 (다른 채팅방 진행 중)

| 항목 | 신호 |
|------|------|
| Admin Dashboard Layout 공통화 | `IR-O4O-ADMIN-DASHBOARD-LAYOUT-COMMONIZATION-AUDIT-V1.md` untracked (다른 세션) |
| K-Cos Admin Dashboard | `WO-O4O-KCOS-ADMIN-DASHBOARD-LAYOUT-WRAPPER-V1` 커밋 `641563f46` (다른 세션) |
| admin members / admin pages | Admin 영역 전반 |

**→ 이 채팅방 범위에서 제외 확정.**

---

## 3. ⚠️ My Store 영역도 다른 세션 진행 중 — 제외 권장

사용자가 다음 후보로 제안한 My Store / Store Library는 **이미 다른 세션이 활발히 작업 중**:

| 커밋 | 작업 |
|------|------|
| `9941435ab` | `CHECK-O4O-MY-STORE-EXECUTION-CROSSSERVICE-COMMONIZATION-V2` |
| `a664ebabb` | `WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1` |
| `64f3a4b86` | `IR-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-GAP-V1` |
| (이전) | `services/web-glycopharm/docs/` untracked (다른 세션) |

`CHECK-...MY-STORE-EXECUTION-...V2`는 PARTIAL 판정으로 drift 추적 중이며, product-description 정렬이 진행되었다.

**→ My Store / Store Library / Storefront 실행 영역은 다른 세션 WIP와 충돌 위험. 이 채팅방에서 새로 착수하지 않기를 권장.**

---

## 4. 충돌 없이 다룰 수 있는 남은 비-Admin 후보

다른 세션 WIP를 제외하고, 이 채팅방에서 안전하게 진행 가능한 후보:

### 4-A. Store HUB 후속 (낮은 우선순위)

| 후보 | 필요성 | 충돌 위험 |
|------|:---:|:---:|
| L1 Hub Layout 공통화 (GP+K-Cos) | 선택적 — 유지보수 빈도 낮음 | 낮음 |
| 이벤트/특가 라벨 정렬 | 선택적 — 서비스 정체성 확인 필요 | 낮음 |
| KPA Hub Layout 공통화 평가 | 보류 (L1 공통화 후) | 낮음 |

**→ 당장 필요한 것 없음.** Cycle 1으로 핵심 종료.

### 4-B. Operator Members 후속

| 후보 | 필요성 |
|------|:---:|
| EditUserModal 추가 통합 | ❌ 불필요 (완료 확인됨) |
| API client 공통화 | ❌ 보류 권장 (가치 낮음) |
| searchPlaceholder 서비스별 커스텀 | 선택적 (prop 노출됨) |

**→ 당장 필요한 것 없음.** 공통화 사이클 종료.

### 4-C. Operator 비-회원 리스트 영역 (실질 후보)

| 후보 | 현황 | 충돌 위험 |
|------|------|:---:|
| **Operator Forum 리스트 공통화** | 서비스별 커스텀 구현 다수 (CROSSAREA IR §8 지적) | 낮음 (Admin/My Store와 분리) |
| Operator Stores 리스트 정합 | GP PharmaciesPage 커스텀 batch UI (CROSSAREA IR §4-4 지적) | 낮음 (단, Admin 채팅방과 경계 확인 필요) |
| Operator 콘텐츠 관리 (CmsContentManager) 적용 범위 | KPA 완전, 기타 선택적 | 중간 |

### 4-D. GlycoPharm/OPL 후속 안정화

| 후보 | 현황 |
|------|------|
| OPL serviceKey 상수화 다른 서비스 확장 | GlycoPharm만 적용됨, K-Cos/KPA 미적용 가능 |
| storefront/checkout 운영 모니터링 | 완료 — 추가 작업 불요 |

---

## 5. 다음 작업 우선순위 3개 제안

### 🥇 1순위 — Operator Forum 리스트 공통화 IR

```
IR-O4O-OPERATOR-FORUM-LIST-COMMONIZATION-AUDIT-V1 (read-only 먼저)
이유:
- Operator Members 공통화가 끝난 직후, 같은 operator 영역의 다음 리스트 축
- CROSSAREA IR §8에서 "포럼 관리 ⚠️ 혼재"로 지적된 미정합 영역
- Admin / My Store 채팅방과 영역 분리 명확 → 충돌 위험 낮음
- DataTable/ActionBar 패턴 적용 여부부터 조사
```

### 🥈 2순위 — OPL serviceKey 상수화 cross-service 확장 조사

```
IR-O4O-OPL-SERVICEKEY-CONSTANTS-CROSSSERVICE-EXPANSION-AUDIT-V1
이유:
- GlycoPharm은 GLYCOPHARM_OPL_SERVICE_KEYS 상수화 완료
- K-Cosmetics / KPA OPL 쿼리에 동일 리터럴 drift 가능성
- 이 채팅방이 OPL 안정화를 다뤘으므로 맥락 연속성
- read-only 조사 → 필요 시 작은 상수화 WO
```

### 🥉 3순위 — Store HUB L1 Layout 공통화 (선택적, 낮음)

```
WO-O4O-STORE-HUB-LAYOUT-TEMPLATE-V1
이유:
- GP↔K-Cos HubLayout ~99% 복제 (유일한 Store HUB 미공통 영역)
- 단, 유지보수 빈도 낮아 즉시성 낮음
- 1·2순위 완료 후 여유 시 진행
```

---

## 6. 권고

1. **1순위(Operator Forum 리스트)부터 read-only IR로 시작** — operator 영역 연속성 + 충돌 위험 최소.
2. My Store / Admin은 다른 세션 진행 중이므로 **이 채팅방에서 착수 금지**.
3. Store HUB / Operator Members는 완료 고정 — 후속은 선택적이며 즉시성 없음.

---

## 코드 변경 없음 확인

이 CHECK에서 수정한 소스/DB/migration: **없음.**  
git status: 다른 세션 WIP(`IR-O4O-ADMIN-DASHBOARD-...` untracked 등) 미접촉.

---

*작성: Claude Code (2026-06-01)*  
*read-only CHECK — 코드/DB/source/migration 수정 없음*
