# IR-O4O-OPERATOR-FORUM-LIST-COMMONIZATION-AUDIT-V1

**작성 일자**: 2026-06-01  
**조사 환경**: HEAD (main) `d29c1622b` 시점 정적 코드 (read-only)  
**작업 성격**: read-only 조사 — 코드/UI/API/DB 수정 없음  
**선행**: Operator Members 공통화 완료 (`CHECK-O4O-OPERATOR-MEMBERS-COMMONIZATION-LIVE-SMOKE-V1`)

---

## 핵심 결론

Operator Forum 리스트는 **공통 wrapper가 없고, 2가지 리스트 패턴이 혼재**한다.

- **Full canonical** (DataTable + checkbox + ActionBar + bulk + BulkResultModal): **KPA, Neture**
- **단건 처리** (DataTable + Drawer만, bulk/selectable 없음): **GlycoPharm, K-Cosmetics**

**판정: C(UI 구조 drift) + 부분 F(wrapper 후보)** — 단, Operator Members와 달리 **공통화 우선순위는 중간 이하**다. 이유: ForumManagement는 서비스별 규모 차이(도메인 차이)가 크고, 정렬이 필요한 것은 ForumDeleteRequests/ForumRequests의 **bulk action 보강** 수준이다.

**권장 1순위 후속**: 공통 wrapper 추출보다 **GP/K-Cos ForumDeleteRequests/Requests에 selectable+ActionBar+bulk 보강** (KPA/Neture 패턴 정렬). 회원 관리 bulk parity 복구와 동일한 성격.

---

## 1. 서비스별 Operator Forum 화면 인벤토리

| 화면 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|:---:|:---:|:---:|:---:|
| 포럼 관리 | `ForumManagementPage` (1449줄) | `forum-management/OperatorForumManagementPage` (538줄) | ❌ 없음 | `ForumManagementPage` (468줄) |
| 포럼 신청 (카테고리 요청) | ❌ 없음 | `ForumRequestsPage` (328줄) | `ForumRequestsPage` (316줄) | ⚠️ (확인 필요) |
| 포럼 삭제 요청 | `ForumDeleteRequestsPage` (434줄) | `ForumDeleteRequestsPage` (311줄) | `ForumDeleteRequestsPage` (321줄) | `ForumDeleteRequestsPage` (477줄) |
| 포럼 분석 | `ForumAnalyticsDashboard` | `ForumAnalyticsPage` | `ForumAnalyticsPage` | `ForumAnalyticsPage` |
| 기타 | `OperatorForumPage` | — | — | — |

**비교 가능한 cross-service 리스트 화면**:
- `ForumDeleteRequestsPage` — **4서비스 모두 존재** (가장 비교 적합)
- `ForumRequestsPage` — GP/K-Cos만 (포럼 카테고리 신청, `WO-O4O-FORUM-REQUEST-UNIFICATION-PHASE1-V1` 흐름)
- `ForumManagementPage` — KPA/GP/Neture (K-Cos 없음, 규모 차이 큼)

---

## 2. ForumDeleteRequestsPage 패턴 비교 (4서비스)

| 서비스 | 라인 | DataTable | checkbox/selectable | ActionBar | bulk | BulkResultModal | Drawer | 패턴 |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **KPA** | 434 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Full canonical** |
| **Neture** | 477 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | **Full canonical (Drawer 제외)** |
| **GlycoPharm** | 311 | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | **단건 처리** |
| **K-Cosmetics** | 321 | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | **단건 처리** |

**Drift**: GP/K-Cos는 DataTable + 단건 승인/반려(statusFilter)만 제공. **checkbox/ActionBar/bulk 누락** — KPA/Neture 대비 일괄 처리 불가.

---

## 3. ForumRequestsPage 패턴 비교 (GP/K-Cos)

| 서비스 | 라인 | DataTable | selectable | ActionBar | bulk | Drawer |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| GlycoPharm | 328 | ✅ | ❌ | ❌ | ❌ | ✅ |
| K-Cosmetics | 316 | ✅ | ❌ | ❌ | ❌ | ✅ |

GP/K-Cos 둘 다 동일 패턴(단건). diff ~166줄(서비스명/라벨 차이) — **구현 유사(복제 경향)**.

---

## 4. ForumManagementPage 패턴 비교 (KPA/GP/Neture)

| 서비스 | 라인 | DataTable | RowActionMenu | ActionBar | bulk | 비고 |
|--------|:---:|:---:|:---:|:---:|:---:|------|
| **KPA** | 1449 | ✅ | ✅ | ✅ | ✅ | 게시글/댓글/신고/카테고리 종합 관리 (규모 큼) |
| **GlycoPharm** | 538 | ❌ | ❌ | ❌ | ❌ | 공통 컴포넌트 미사용 (raw 구현) |
| **Neture** | 468 | ✅ | ❌ | ✅ | ✅ | DataTable+bulk |
| K-Cosmetics | — | — | — | — | — | **화면 자체 없음** |

**규모 차이 주목**: KPA 1449줄 vs GP 538 vs Neture 468. KPA ForumManagement는 약사회 커뮤니티 특성상 게시글/댓글/신고/카테고리를 종합 관리하는 대형 화면 — **도메인 차이**. 단순 공통화 대상 아님.

---

## 5. 공통 wrapper 존재 여부

```
packages/operator-core-ui/src — ForumDeleteRequest/ForumManagementConsole/OperatorForum 공통 컴포넌트: 없음
packages/operator-ux-core/src — 동일: 없음
```

**Operator Members의 `OperatorMembersConsolePage` 같은 공통 wrapper가 forum에는 존재하지 않는다.** 4서비스 모두 service-local 구현.

---

## 6. 공통화 가능성 판정

| 화면 | 판정 | 근거 |
|------|:---:|------|
| ForumDeleteRequestsPage | **C (구조 drift)** | 4서비스 존재, GP/K-Cos만 bulk 누락 → 패턴 정렬로 해소 가능 |
| ForumRequestsPage | **C (구조 drift)** | GP/K-Cos 단건만, 정렬 가능 |
| ForumManagementPage | **E (공통화 가치 낮음)** | 규모 차이 큼(KPA 1449), 도메인 차이, 강제 통합 위험 |
| ForumAnalytics | **범위 외** | 리스트가 아닌 대시보드 |

**종합 판정: C + 부분 F**
- 단기: GP/K-Cos ForumDeleteRequests/Requests에 **selectable+ActionBar+bulk 보강** (drift 해소)
- 중기: 공통 wrapper(`OperatorForumRequestConsole` 류) 추출은 **보류** — 4서비스 구현 차이와 KPA 도메인 복잡도 고려 시 실익 불확실

---

## 7. 후속 WO 후보

| WO | 범위 | 위험도 | 우선순위 |
|----|------|:---:|:---:|
| `WO-O4O-GLYCOPHARM-KCOS-FORUM-DELETE-REQUEST-BULK-PARITY-V1` | GP/K-Cos ForumDeleteRequests에 selectable+ActionBar+bulk 추가 (KPA/Neture 정렬) | 낮음 | 중간 |
| `WO-O4O-GLYCOPHARM-KCOS-FORUM-REQUEST-BULK-PARITY-V1` | GP/K-Cos ForumRequests bulk 보강 | 낮음 | 낮음 |
| `WO-O4O-GLYCOPHARM-FORUM-MANAGEMENT-DATATABLE-MIGRATION-V1` | GP ForumManagement raw → DataTable 전환 | 중간 | 낮음 |
| `IR-O4O-OPERATOR-FORUM-REQUEST-CONSOLE-WRAPPER-FEASIBILITY-V1` | 공통 wrapper 추출 타당성 (선택) | — | 보류 |

**ForumManagement 공통화는 권장하지 않음** — KPA 도메인 복잡도 + 규모 차이로 위험 대비 실익 낮음.

---

## 8. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|:---:|
| **Forum 운영 화면이 서비스별로 다를 합리적 이유가 있는가** | ForumManagement는 KPA(1449줄, 약사회 커뮤니티 종합 관리)와 GP/Neture(경량)가 도메인 차이로 정당. 단 ForumDeleteRequests/Requests는 동일 목적인데 bulk 유무가 갈림 = **구현 편차**. | ⚠️ 부분 정합 권장 |
| **운영자 리스트 조작 질서가 회원 관리와 동일 방향인가** | 회원 관리는 4서비스 "선택→bulk action→BulkResultModal" 통일. Forum은 KPA/Neture만 동일 질서, GP/K-Cos는 단건만 → **조작 질서 불일치** | ⚠️ GP/K-Cos drift |
| **공통화가 1인 개발 생산성에 도움이 되는가** | ForumDeleteRequests/Requests bulk 보강은 회원 관리 parity와 동일 성격으로 가치 있음. ForumManagement 전체 wrapper화는 규모 차이로 비용↑ | ⚠️ 선택적 |
| **과도한 공통화로 서비스별 운영 정책을 숨길 위험** | ForumManagement를 강제 wrapper화하면 KPA 약사회 특수 관리(신고/카테고리)가 추상화에 묻힐 위험 | ✅ 보류가 안전 |
| **Admin / My Store WIP 오포함 여부** | Forum operator 영역만 조사. Admin/My Store 미접촉. | ✅ |

**결론**:
1. Operator Forum은 **공통 wrapper 없는 service-local 구현**, 2패턴 혼재.
2. 실질 drift는 **GP/K-Cos ForumDeleteRequests/Requests의 bulk action 누락** — 회원 관리 bulk parity와 동일 성격, 보강 가치 있음.
3. **ForumManagement 전체 공통화는 보류** — KPA 도메인 복잡도/규모 차이로 위험.
4. 다음 실작업 후보는 `WO-O4O-GLYCOPHARM-KCOS-FORUM-DELETE-REQUEST-BULK-PARITY-V1` (낮은 위험, 중간 우선순위).

---

## 코드 변경 없음 확인

이 IR에서 수정한 소스/DB/migration: **없음.**  
조사한 주요 파일:
- `services/web-*/src/pages/operator/ForumDeleteRequestsPage.tsx` (4서비스)
- `services/web-{glycopharm,k-cosmetics}/src/pages/operator/ForumRequestsPage.tsx`
- `services/web-{kpa-society,glycopharm,neture}/.../ForumManagement*.tsx`
- `packages/operator-core-ui/src`, `packages/operator-ux-core/src` (공통 컴포넌트 부재 확인)

git status: 다른 세션 WIP 미접촉.

---

*작성: Claude Code (2026-06-01)*  
*read-only 조사 — 코드/DB/source/migration 수정 없음*
