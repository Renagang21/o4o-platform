# IR-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-V1

**작성 일자**: 2026-06-02
**조사 환경**: HEAD (main) `4beea18fb` 시점 (read-only)
**작업 성격**: read-only 조사 IR — 코드/UI/route/menu/API/DB/migration/package 수정 없음
**선행**: GP/K-Cos 포럼 신청·삭제요청 콘솔 공통화 완료(`f3bd56e21`/`098403588`/smoke `34f8bd754`) + GP orphan 제거(`4beea18fb`)
**목적**: Neture operator 포럼 신청·삭제요청 화면이 GP/K-Cos 공통 콘솔(`@o4o/operator-core-ui/modules/forum-requests`, `.../forum-delete-requests`)로 수렴 가능한지 판단

---

## 1. 조사 개요

GP/K-Cos는 신청·삭제요청을 공통 콘솔 2모듈로 추출 완료했다. 본 IR은 Neture의 대응 화면이 같은 콘솔에 **adapter/config 주입만으로** 수렴 가능한지, 아니면 공통 콘솔 수정·UI 변경이 필요한지 정적 코드로 판정한다. 구현은 하지 않는다.

**핵심 판정**: **수렴 가능하나 "adapter/config만으로는 불가"** — ① Neture 상세가 **고정 Modal**(canonical은 `BaseDetailDrawer`), ② Neture는 **실제 batch endpoint** 사용(canonical 콘솔은 per-id fan-out), ③ row 진입이 **Eye 버튼**(canonical은 row-click). 따라서 **(A) 공통 콘솔에 optional batch-client 옵션 확장 + (B) Neture Modal→Drawer UX 전환**이 선행돼야 한다. 도메인 차이가 아니라 **구현 편차**이므로 수렴 자체는 정합적. 단 Modal→Drawer는 가시적 UX 변경이라 검수가 필요하다.

---

## 2. 사전 git 상태

```
git rev-list --left-right --count HEAD...origin/main → 0  0
git status --short (non-png):
?? docs/investigations/IR-O4O-CROSSSERVICE-POSTLOGIN-STOREOWNER-DASHBOARD-POLICY-AUDIT-V1.md  ← 다른 세션 WIP (미접촉)
?? docs/investigations/IR-O4O-KPA-STOREOWNER-AUTO-STORE-ACCESS-FLOW-AUDIT-V1.md               ← 다른 세션 WIP (미접촉)
```

다른 세션 WIP 미접촉. 본 IR은 신규 IR 문서 1개만 생성, git 변경 없음.

---

## 3. 조사 대상 파일/route/menu

| 구분 | 항목 |
|------|------|
| 화면 | `services/web-neture/src/pages/operator/ForumManagementPage.tsx`(신청 review), `ForumDeleteRequestsPage.tsx`, `ForumAnalyticsPage.tsx` |
| API | `services/web-neture/src/services/forumApi.ts` (`forumOperatorApi`) |
| guide | `services/web-neture/src/api/guideContent.ts` |
| route | `services/web-neture/src/App.tsx` (operator + admin 이중 마운트) |
| menu | `services/web-neture/src/config/operatorMenuGroups.ts` |
| 기준 콘솔 | `packages/operator-core-ui/src/modules/forum-requests`, `.../forum-delete-requests` |

---

## 4. Neture forum/community operator 화면 현황

| 화면 | 대응 | 비고 |
|------|------|------|
| **ForumManagementPage** | GP/K-Cos `ForumRequestsPage`(신청) 대응 | 단, 파일명이 "Management" (신청 review 단일 기능 — KPA식 2탭 아님) |
| **ForumDeleteRequestsPage** | GP/K-Cos `ForumDeleteRequestsPage` 대응 | 1:1 대응 |
| **ForumAnalyticsPage** | 분석 (별도 트랙) | 본 IR 범위 외 |

→ **전용 "ForumRequestsPage"는 없으나 ForumManagementPage가 신청 콘솔에 정확히 대응**(2탭 결합 아닌 단일 신청 review). "도메인상 없음"이 아니라 **명칭만 다른 동일 기능**.

---

## 5. route/menu 연결 현황

route 바인딩 (`App.tsx`):
| route | 컴포넌트 |
|-------|---------|
| `/operator/community` | `ForumManagementPage` (신청) |
| `/operator/forum-delete-requests` | `ForumDeleteRequestsPage` |
| `/operator/forum-analytics` | `ForumAnalyticsPage` |
| `/admin/community`, `/admin/forum-delete-requests`, `/admin/forum-analytics` | 동일 컴포넌트 **이중 마운트** (operator+admin) |

menu (`operatorMenuGroups.ts`, "forum"을 **"n"으로 리브랜딩**):
| 메뉴 라벨 | path |
|-----------|------|
| `n 신청` | `/operator/community` ✅ (route 일치) |
| `삭제 요청` | `/operator/n-delete-requests` ⚠️ |
| `n 분석` | `/operator/n-analytics` ⚠️ |

⚠️ **부수 관찰(본 IR 범위 외, 수정 안 함)**: 메뉴의 `삭제 요청`→`/operator/n-delete-requests`, `n 분석`→`/operator/n-analytics`는 실제 route(`/operator/forum-delete-requests`, `/operator/forum-analytics`)와 **불일치**로 보임. 사실이라면 해당 메뉴 링크가 404. 별도 확인/수정 후보(본 수렴 IR과 독립). → 수렴 WO와 분리해 `CHECK-O4O-NETURE-OPERATOR-FORUM-MENU-ROUTE-MISMATCH-V1`(가칭) 제안.

---

## 6. 리스트 UI 구조 비교

| 항목 | Neture | canonical 콘솔 | 정합 |
|------|--------|----------------|:---:|
| DataTable | ✅ | ✅ | 동일 |
| selectable + selectedKeys | ✅ | ✅ | 동일 |
| ActionBar | ✅ | ✅ | 동일 |
| BulkResultModal | ✅ | ✅ | 동일 |
| useBatchAction | ✅ | ✅ | 동일 |
| 상태 필터 | 신청=select / 삭제요청=**버튼그룹**(emerald) | select(신청) / segmented 탭그룹(삭제요청) | △ 경미 차이 |
| empty | rich JSX | 문자열 emptyMessage | △ 경미 |
| 헤더 pending badge | ✅ | ✅ | 동일 |
| accent | emerald | headerIcon 주입 | config 흡수 |
| 외곽 wrapper | `max-w-6xl mx-auto ...` | 없음(상위 레이아웃 위임) | △ wrapper 차이 |

→ 리스트 골격은 **동일 빌딩블록**. 차이는 경미(상태필터 형태/empty/wrapper).

---

## 7. 상세 Modal/Drawer 구조 비교 — **핵심 차이**

| 항목 | Neture | canonical 콘솔 |
|------|--------|----------------|
| 상세 컨테이너 | **고정 중앙 Modal** (`fixed inset-... max-w-lg`, 직접 구현) | **`BaseDetailDrawer`** (우측 560px 패널, `@o4o/ui`) |
| 진입 | `_actions` 컬럼 **Eye 버튼** | **row-click** (`onRowClick`) |
| footer 액션 | Modal 하단 버튼(닫기/거절/보완/승인) | Drawer `actions` prop |

→ **Modal vs Drawer가 수렴의 최대 차이.** 도메인 차이가 아닌 구현 편차이나, Neture 운영자 입장에서 상세 진입 UX가 중앙 Modal→우측 Drawer로 **가시적 변경**됨 → 검수 필요.

---

## 8. row action / bulk action 구조 비교

| 항목 | Neture 신청 | Neture 삭제요청 | canonical |
|------|------------|----------------|-----------|
| row action | Eye 버튼→Modal | Eye 버튼→Modal | row-click→Drawer |
| bulk 노출 | 승인/거절 (revision 제외) | 삭제승인/반려 | 동일 정책 |
| bulk 대상 | reviewable(pending+revision) | pending | 동일 |
| **bulk 실행** | **실제 batch endpoint** `batchReview(ids, action)` | **실제** `batchApproveDelete(ids)`/`batchRejectDelete(ids, '일괄 반려')` | **per-id fan-out**(`client.review`/`approve`/`reject` × Promise.allSettled) |
| revision 정책 | bulk 제외 ✅ / 단건 Modal "보완" 버튼 | — | bulk 제외 ✅ / 단건 Drawer "보완" |
| revision 의견 필수 | **검증 없음**(placeholder "선택") | — | **의견 필수 차단** (canonical) |

→ bulk **정책**(revision 제외)은 일치. 차이는 **실행 방식(batch endpoint vs fan-out)** 과 revision 의견 검증 부재(canonical이 강화).

---

## 9. API/adapter 구조 비교

`forumOperatorApi`(Neture) 보유 메서드:
- single: `getRequests`, `review(id,{action,reviewComment})`, `getDeleteRequests`, `approveDelete(id,data)`, `rejectDelete(id,data)`
- **batch**: `batchReview(ids, action, reviewComment?)`, `batchApproveDelete(ids, reviewComment?)`, `batchRejectDelete(ids, reviewComment?)`
- response shape: `{ success, data, error }` (K-Cos와 동일) → canonical client `{ok,error}` 정규화 가능
- guide: `fetchGuidePageContent(serviceKey, pageKey)` 존재 (삭제요청 페이지에서 사용 — canonical `loadGuideSections`와 호환)

→ **single endpoint는 canonical client에 그대로 정규화 가능.** 단 Neture는 **실제 batch endpoint를 추가 보유** — canonical 콘솔은 이를 호출할 통로(옵션)가 없어, 현재로선 ① batch를 버리고 fan-out(adapter만, 성능 저하) 또는 ② 콘솔에 optional batch-client 확장 중 택1 필요.

---

## 10. GP/K-Cos 공통 콘솔과의 차이 (요약)

| 차이 | 성격 | 수렴 시 처리 |
|------|------|-------------|
| 상세 Modal vs Drawer | 구현 편차 | Neture Modal→`BaseDetailDrawer` 전환 (UX 검수) |
| 실제 batch endpoint vs fan-out | 구현 편차 | 콘솔에 optional batch-client 확장(권장) 또는 fan-out 수용 |
| row Eye 버튼 vs row-click | 구현 편차 | canonical row-click로 통일 |
| 삭제요청 상태필터 버튼그룹 vs segmented | 경미 | canonical로 통일 |
| revision 의견 필수 미검증 | 정책 갭 | canonical이 강화(K-Cos와 동일 보강) |
| "n"/emerald 브랜딩 | config | title/headerIcon 주입으로 흡수 |
| operator+admin 이중 마운트 | 구조 | wrapper를 두 route에 동일 사용(영향 없음) |

→ **도메인 차이 0. 모두 구현 편차/정책 갭/브랜딩.**

---

## 11. 수렴 가능 영역

- 리스트 골격(DataTable/ActionBar/BulkResultModal/useBatchAction) — **그대로 호환**
- single endpoint(review/approveDelete/rejectDelete/getRequests/getDeleteRequests) — **adapter 정규화 가능**
- guide(GuideBlock + fetchGuidePageContent) — 삭제요청 콘솔 `loadGuideSections`로 **그대로 주입 가능**
- 브랜딩(title/headerIcon/accent) — **config 주입으로 흡수**
- bulk 정책(revision 제외, pending/reviewable 대상) — **동일**

---

## 12. 수렴 위험 영역

1. **Modal→Drawer UX 변경** (최대) — Neture 상세가 중앙 Modal→우측 Drawer로 바뀜. 기능 동일하나 가시적. Neture UX 검수 필요.
2. **batch endpoint 활용 방식** — canonical 콘솔이 per-id fan-out만 지원. Neture batch endpoint를 살리려면 **콘솔 옵션 확장**(optional `batchReview`/`batchApprove`/`batchReject` client 메서드; 미제공 시 기존 fan-out) 필요. GP/K-Cos 동작은 불변(backward compatible).
3. **revision 의견 필수** — 콘솔이 강제하면 Neture에도 적용(개선이나 동작 변화).

---

## 13. 수렴 불가 또는 보류 영역

- **불가 영역 없음** (도메인 차이 없음).
- **보류 판단 요소**: Modal→Drawer UX 변경에 대한 Neture 측 수용 여부 + 콘솔 batch 옵션 확장 작업량. 둘 다 해결 가능하나 "adapter/config만"의 범위를 넘는다.

---

## 14. 후속 WO 후보

| WO/IR | 범위 | 위험 | 전제 |
|-------|------|:---:|------|
| `WO-O4O-OPERATOR-FORUM-CONSOLE-BATCH-CLIENT-OPTION-V1` | 공통 콘솔 2모듈에 optional batch-client(`batchReview`/`batchApprove`/`batchReject`) 확장. 미제공 시 기존 fan-out 유지(GP/K-Cos 불변) | 낮음 | 콘솔 enhancement(backward compatible) |
| `WO-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-APPLY-V1` | Neture ForumManagementPage(신청)·ForumDeleteRequestsPage를 공통 콘솔 thin wrapper로 전환 (Modal→Drawer, row-click, batch client 주입) | **중간** (Modal→Drawer UX 검수) | 위 batch-option WO 선행 + Neture UX 수용 결정 |
| `CHECK-O4O-NETURE-OPERATOR-FORUM-MENU-ROUTE-MISMATCH-V1` | 메뉴 `n-delete-requests`/`n-analytics` ↔ route `forum-delete-requests`/`forum-analytics` 불일치 확인/정리 | 낮음 | 본 수렴과 독립 (부수 발견) |

**권장 순서**: (1) batch-client 옵션 확장 WO(저위험·GP/K-Cos 불변) → (2) Neture 수렴 적용 WO(UX 검수 동반) → (별도) 메뉴-route 불일치 CHECK.

---

## 15. Current Structure vs O4O Philosophy Conflict Check

- **Neture forum이 GP/K-Cos와 같은 도메인인가?** ✅ 동일 도메인 — 셋 다 `/api/v1/forum/operator/*` 공통 API의 "포럼 신청/삭제요청 검토" operator flow. Neture는 "n"/community로 **브랜딩만** 다름. 신청 화면이 KPA식 2탭 결합이 아닌 단일 기능이라 GP/K-Cos와 동형.
- **공통 콘솔 수렴이 운영 경험 공통화 원칙에 부합하는가?** ✅ 부합. 4서비스가 동일 검수 UX로 수렴하면 Operator OS 일관성·유지보수성 향상.
- **Neture supplier/partner/operator 특수성 훼손?** ❌ 없음. 포럼 운영 콘솔은 커뮤니티 모더레이션으로 supplier/partner B2B 구조와 직교. 수렴은 forum operator 표면만 정렬.
- **Modal/Drawer 차이가 도메인 차이인가 구현 편차인가?** **구현 편차.** 동일 데이터·동일 액션을 중앙 Modal vs 우측 Drawer로 렌더하는 표현 차이일 뿐, Neture 도메인 요구가 아님.
- **공통화가 1인 개발 유지보수성을 높이는가?** ✅ Neture 2개 화면(약 940줄)을 thin wrapper로 축소 + 검수 정책 단일 지점화. 단 batch 옵션 확장·UX 검수 비용이 GP/K-Cos보다 큼.

**결론**: 도메인 충돌 없음. 수렴은 정합적이나 **adapter/config만으로는 부족** — 콘솔 batch-option 확장 + Neture Modal→Drawer UX 전환이 선행돼야 하는 **중간 난이도**. 즉시 적용보다, batch-option 확장(저위험)을 먼저 닫고 Neture UX 수용 결정 후 적용 WO로 진행 권장.

---

## 최종 보고 (요약)

- **수정 파일**: 없음 (read-only IR)
- **생성 IR 문서**: `docs/investigations/IR-O4O-NETURE-FORUM-CONSOLE-CONVERGENCE-V1.md`
- **조사 주요 파일/route/menu**: Neture `ForumManagementPage`/`ForumDeleteRequestsPage`/`ForumAnalyticsPage`, `services/forumApi.ts`, `App.tsx`(operator+admin route), `operatorMenuGroups.ts`, 기준 콘솔 2모듈
- **신청 콘솔 수렴 가능성**: 가능(동형 기능). 단 Modal→Drawer + batch-option + revision 의견 필수 적용 필요 → **adapter/config만으로는 불가**
- **삭제요청 콘솔 수렴 가능성**: 가능. GuideBlock/loadGuideSections 호환. 단 Modal→Drawer + batch-option 필요
- **공통 콘솔 수정 필요 여부**: **필요** — optional batch-client 옵션 확장(backward compatible). GP/K-Cos 동작 불변
- **후속 WO 후보**: ① batch-client 옵션 확장 WO(저위험) → ② Neture 수렴 적용 WO(중간, UX 검수) / 별도 메뉴-route 불일치 CHECK
- **git status**: 본 IR 생성 외 변경 없음. 다른 세션 WIP 2건 미접촉

---

*작성: Claude Code (2026-06-02)*
*read-only 조사 — 코드/UI/route/menu/API/DB/migration/package 수정 없음*
