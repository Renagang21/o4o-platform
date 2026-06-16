# CHECK-O4O-OPERATOR-APPROVALS-SELLER-RECRUITMENT-EXPOSURE-MENU-REMODEL-V1

> **작업명:** WO-O4O-OPERATOR-APPROVALS-SELLER-RECRUITMENT-EXPOSURE-MENU-REMODEL-V1
> **유형:** 운영자 Approvals 역할 재정의 — 메뉴 정리 + "판매자 모집 노출 승인" 신규(B안 준비중 안내). frontend-only, backend/migration 무.
> **결과: PASS — KPA "협업 문의" / GP "매장 판매 참여 승인"·"약사 회원 관리" 메뉴 제거(route/page 보존), 3서비스 Approvals 의 이벤트 오퍼 승인 아래 "판매자 모집 노출 승인"(/operator/recruitment-exposure, 준비중 안내) 추가. 공급자 신청자 승인/반려 흐름 무영향. 3앱 build PASS.**
> 선행 조사: [IR-...-AUDIT-V1](IR-O4O-OPERATOR-APPROVALS-SELLER-RECRUITMENT-EXPOSURE-MENU-REMODEL-AUDIT-V1.md) — 2026-06-16

---

## 1. 변경 정책 (확정)

```
운영자 승인 = 판매자(개별) 승인 X
운영자 승인 = 판매자 모집 제품의 "자기 서비스 노출" 승인 O
공급자 = 모집 신청 판매자 승인/반려 (유지)
```

## 2~4. Approvals 메뉴 조사 결과

각 서비스 `operatorMenuGroups.ts` 구조: KPA/GP = `UNIFIED_MENU`(레이아웃 소비) + `OPERATOR_MENU_ITEMS`(미소비, 일관성 위해 동시 정리). KCos = `UNIFIED_MENU` + `OPERATOR_MENU_ITEMS = UNIFIED_MENU`(alias).

| 서비스 | 변경 전 approvals | 제거 | 추가 |
|--------|-------------------|------|------|
| **KPA** | 공급상품 신청 승인 / 이벤트 오퍼 승인 / **협업 문의** | 협업 문의 | 판매자 모집 노출 승인 |
| **GP** | **매장 판매 참여 승인** / **약사 회원 관리** / 공급상품 / 이벤트 오퍼 | 매장 판매 참여 승인·약사 회원 관리 | 판매자 모집 노출 승인 |
| **KCos** | 매장 가입 신청 관리 / 공급상품 / 이벤트 오퍼 | (제거 없음) | 판매자 모집 노출 승인 |

- 레이아웃 래퍼(KpaOperatorLayoutWrapper / GP OperatorLayoutWrapper)는 **`UNIFIED_MENU` 소비** + `filterMenuByRole`(adminOnly만 필터). 새 항목은 adminOnly 아님 → operator 노출. approvals 그룹 자체는 이미 활성(capability group 단위) → 새 항목 정상 렌더.

## 5. 제거한 메뉴

- KPA: `협업 문의`(/operator/collaboration-requests) — UNIFIED_MENU + OPERATOR_MENU_ITEMS 양쪽.
- GP: `매장 판매 참여 승인`(/operator/store-approvals) + `약사 회원 관리`(/operator/members) — 양쪽. (`약사 회원 관리`는 users 그룹 `회원 관리`와 동일 path 중복이었음.)

## 6. 삭제/보존한 route/page/API

- **route/page 전부 보존(미삭제).** 제거한 메뉴의 실제 화면(CollaborationRequestsPage, StoreApprovalsPage, members)은 살아있는 기능이라 WO §11.1("미사용이면 삭제, 사용 중이면 route 보존") 기준 **메뉴만 제거**. 직접 URL 접근은 유지 → 기능 파괴 0, 되돌리기 용이.
- ⚠️ **정책 노트(CLAUDE.md 데드링크 0/기능 은폐 0 와의 긴장):** 본 WO 는 운영자 역할 재정의(의도적 delist)로, 해당 흐름은 운영자 책임에서 분리되는 방향. route/page 완전 제거(=실기능 삭제) vs 메뉴 delist 중 **되돌리기 쉬운 delist** 선택. 완전 제거는 후속 결정으로 분리.

## 7. 신규 "판매자 모집 노출 승인" 위치/연결

- 위치: 3서비스 Approvals > **이벤트 오퍼 승인 바로 아래**.
- path: `/operator/recruitment-exposure` → `RecruitmentExposureApprovalPage`(3서비스 local page, 준비중 안내).
- route: KPA `routes/OperatorRoutes.tsx`(direct import) / GP·KCos `App.tsx`(lazy) 의 event-offers 라우트 다음에 등록.

## 8. 노출 승인 backend 존재 여부 (조사 3차)

- `RecruitmentStatus = RECRUITING | CLOSED` 뿐. 운영자 **"노출 승인" 상태/플래그/API 부재**. 모집 제품 노출은 C bridge(승인 시 OPL is_active)로 처리되며 운영자 게이트 없음. ProductApproval 연계 없음.
- ∴ **A안 불가 → B안(준비중 안내) 채택.** 노출 승인 모델/백엔드는 후속 WO 분리.

## 9. 준비중 안내 페이지 사용 여부

- **사용(B안).** 안내 문구: "판매자 모집 제품을 우리 서비스에 노출할지 검토하는 화면입니다. / 개별 판매자 승인·반려는 공급자가 모집 상세에서 처리합니다. / 노출 승인 기능은 후속 작업에서 연결됩니다." (3서비스 동일 local page.)

## 10. 공급자 신청자 승인 흐름 무영향 확인

- 모집 신청자 승인/반려는 공급자 화면(`SupplierRecruitmentDetailPage`) + `partner-contract.service` — **본 WO 미접촉**. GP `매장 판매 참여 승인`은 `StoreApplication`(매장 온보딩, `storeApi`)으로 seller-recruitment 와 무관 → 메뉴 delist 가 공급자 모집 심사에 영향 없음.

## 11. 제외 범위 (WO 준수)

공급자 승인/반려·모집 신청·C bridge·allowedSellerIds·OPL·참여해지·신청취소·알림·가격·migration·새 approval entity·operator-core 공통화·package.json/lock. **모두 미수행.** KCos "매장 가입 신청 관리"(매장 온보딩)는 명시 제거 대상 아님 → 유지(후속 D4). route/page 삭제 보류.

## 12. 검증

- **builds: `@o4o/web-kpa-society` ✅ · `glycopharm-web` ✅ · `@o4o/web-k-cosmetics` ✅.** backend 무변경 → api-server typecheck 생략.
- **정적**: UNIFIED_MENU 소비, approvals 그룹 활성, 새 path 라우트 마운트(데드링크 0). 제거 메뉴의 route/page 보존(직접 URL 유지).
- **배포 후 권장 smoke**: KPA 운영자 → 협업 문의 없음 + 노출 승인 표시 / GP 운영자 → 매장 판매 참여 승인·약사 회원 관리 없음 + 노출 승인 / KCos 운영자 → 노출 승인 표시 / 공급자 → 모집 신청자 승인·반려 정상.

## 13. 완료 판정 / 후속

**PASS.** 운영자 Approvals 의미를 "판매자 승인"→"모집 제품 서비스 노출 승인"으로 재정의. 메뉴 정리 + B안 준비중 안내. 공급자 흐름·정책 무변경.

**커밋:** path-specific 9파일(menu config 3 + page 3 + route 3[OperatorRoutes/App.tsx ×2] + CHECK) · `<commit>`.
**후속(선택):** 노출 승인 backend 모델(RecruitmentExposure status/API) WO / delist 메뉴 route·page 완전 제거 여부 / KCos "매장 가입 신청 관리" 정렬(D4).

---

*Date: 2026-06-16 · PASS · 운영자 Approvals 역할 재정의 — KPA 협업문의·GP 매장판매참여승인/약사회원관리 메뉴 delist(route/page 보존) + 3서비스 "판매자 모집 노출 승인"(/operator/recruitment-exposure, B안 준비중) 추가. 노출 승인 backend 부재 확인, 공급자 신청자 승인 흐름 무영향. frontend-only, 3 build PASS.*
