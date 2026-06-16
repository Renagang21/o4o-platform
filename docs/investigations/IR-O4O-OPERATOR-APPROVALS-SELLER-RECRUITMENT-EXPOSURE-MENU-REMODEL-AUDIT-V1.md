# IR-O4O-OPERATOR-APPROVALS-SELLER-RECRUITMENT-EXPOSURE-MENU-REMODEL-AUDIT-V1

> **유형:** 조사(read-only). WO-O4O-OPERATOR-APPROVALS-SELLER-RECRUITMENT-EXPOSURE-MENU-REMODEL-V1 의 구현 전 조사.
> **결론: 구현 보류 사유 2건 — (1) 핵심 대상 파일 3개 operatorMenuGroups.ts + GP App.tsx 가 다른 세션 WIP(미커밋) → 충돌. (2) WO 가 제거하려는 "매장 판매 참여 승인"은 실제로 판매자 모집 흐름이 아니라 매장 온보딩(StoreApplication) 승인 → 제거 의미 재확인 필요.**
> Date: 2026-06-16

---

## 0. 동기화 / 충돌 상태

- HEAD = origin/main 최신(`ee3804ed7`). 판매자 모집 관련 커밋(e15f66968 등) 반영됨.
- **다른 세션 WIP(미커밋) — 본 WO 핵심 대상과 정면 충돌:**
  - `services/web-kpa-society/src/config/operatorMenuGroups.ts` (M)
  - `services/web-glycopharm/src/config/operatorMenuGroups.ts` (M)
  - `services/web-k-cosmetics/src/config/operatorMenuGroups.ts` (M)
  - `services/web-glycopharm/src/App.tsx` (M)
  - `docs/.../IR-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-UIUX-PARITY-AUDIT-V1.md` (M), GP operator content 파일들
- 정황(직전 커밋 + dirty IR): 다른 세션이 **operator 메뉴 parity** 작업을 같은 3개 operatorMenuGroups.ts 에서 진행 중.
- ∴ 본 IR 의 메뉴 구조 캡처는 **현재 WIP 포함 상태** — 구현은 타 세션 커밋 후 재동기화·재확인 필요.

## 1. 변경 정책 (WO 확정)

```
운영자 승인 = 판매자(개별) 승인 X
운영자 승인 = 판매자 모집 제품의 "서비스 노출" 승인 O
공급자 = 모집 신청 판매자 승인/반려 (유지)
```

## 2~4. 3서비스 Approvals 메뉴 조사 (현재 상태)

각 파일은 메뉴 config 객체 **2개**(operator + unified/admin)를 가지며, 각각 `approvals` 배열 보유 → 서비스당 2곳 수정 필요.

| 서비스 | approvals 항목(현재) | 비고 |
|--------|----------------------|------|
| **KPA** | 공급 상품 신청 승인 / 이벤트 오퍼 승인 / **협업 문의** | `/operator/collaboration-requests`. "매장 판매 참여 승인" 없음, "약사 회원 관리" 없음 |
| **GP** | **매장 판매 참여 승인** / **약사 회원 관리** / 공급 상품 신청 승인 / 이벤트 오퍼 승인 (2번째 객체: 매장 승인 / 약사 회원 관리 / 이벤트 오퍼 승인) | store-approvals + members |
| **KCos** | 매장 가입 신청 관리 / 공급 상품 신청 승인 / 이벤트 오퍼 승인 | "매장 가입 신청 관리"=/operator/applications |

- "이벤트 오퍼 승인" = `/operator/event-offers` (3서비스 공통) → 신규 "판매자 모집 노출 승인"은 이 아래.
- 협업 문의 = **KPA 전용**. 약사 회원 관리 = **GP 전용**(KCos·KPA 없음). 매장 판매 참여 승인 = **GP 전용**.

## 5. ⚠️ 핵심 발견 — "매장 판매 참여 승인"의 실제 정체

- GP `매장 판매 참여 승인` → `/operator/store-approvals` → [StoreApprovalsPage.tsx](../../services/web-glycopharm/src/pages/operator/StoreApprovalsPage.tsx).
- 이 화면은 **`storeApi` + `StoreApplication`(매장 가입/판매참여 온보딩 신청)** 을 승인하는 것 — 즉 **매장이 서비스에 합류하는 온보딩 승인**이다.
- **판매자 모집(seller-recruitment) 신청자 승인 흐름과 무관**. 모집 신청자 승인/반려는 공급자 화면([SupplierRecruitmentDetailPage.tsx](../../services/web-neture/src/pages/supplier/SupplierRecruitmentDetailPage.tsx)) + `partner-contract.service` 에 있고, **운영자 대시보드엔 모집 신청자 승인 메뉴가 애초에 없다.**
- ∴ WO 가 "운영자가 판매자를 승인하는 구조"로 지목한 메뉴는 실제로는 **매장 온보딩 승인**이다. 이를 제거하면 GP 운영자의 **매장 가입/판매참여 온보딩 승인 동선이 사라진다**(KCos 의 "매장 가입 신청 관리"는 동일 성격이나 WO 제거 대상 아님 → 서비스 간 비일관 발생).
- **결정 필요**: GP "매장 판매 참여 승인"을 정말 제거할지 / 라벨만 정정할지 / 유지할지.

## 6. 삭제 vs 보존 (route/page/API)

- store-approvals(StoreApprovalsPage/StoreApprovalDetailPage), members, collaboration-requests, event-offers 모두 **실제 route+page+API 가 살아있는 기능 메뉴**.
- 메뉴 제거 시: route/page 즉시 삭제하면 데드링크 0 이나, 기능 자체 은폐 위험 → **메뉴만 제거(라우트/page 보존)** 가 안전(CLAUDE.md "route 있는 실기능 메뉴는 숨기지 않는다"와 충돌 가능 → 정책 판단 필요).

## 7. 신규 "판매자 모집 노출 승인" 위치

- Approvals > 이벤트 오퍼 승인(`/operator/event-offers`) 바로 아래, 3서비스 각 2개 config 객체.

## 8. 노출 승인 backend 존재 여부 (조사 3차)

- `RecruitmentStatus = RECRUITING | CLOSED` **2개뿐**. 운영자 "노출 승인" 상태/플래그 **없음**.
- 모집 제품의 서비스 노출은 C bridge(승인 시 OPL is_active) 로 처리되며, **운영자 게이트 없음**.
- 운영자용 recruitment 노출 승인 API/컨트롤러 **부재**(neture operator 컨트롤러에 recruitment exposure endpoint 없음). `neture-dashboard.service.ts:537` 의 `exposure`는 무관(대시보드 필드).
- ∴ **A안(기존 화면 연결) 불가.** WO §11 기준 **B안(준비중 안내 페이지) 또는 C안(메뉴는 후속 WO로 분리)**.

## 9. 권장

1. **타 세션이 operatorMenuGroups.ts 3종 + GP App.tsx 를 커밋한 뒤** 본 WO 구현 재개(충돌 회피).
2. 구현 전 **"매장 판매 참여 승인 = 매장 온보딩 승인" 사실 기준으로 제거 여부 재확정**(아래 미해결 결정).
3. 노출 승인은 backend 부재 → **B안(준비중 안내) 최소 반영** 또는 노출 승인 모델은 별도 backend WO 로 분리.

## 10. 미해결 결정 (사용자 확인 필요)

- D1. GP "매장 판매 참여 승인"(=매장 온보딩 StoreApplication) 처리: 제거 / 라벨 정정 / 유지?
- D2. 제거 메뉴의 route/page: 삭제 vs 메뉴만 숨김(라우트 보존)?
- D3. "판매자 모집 노출 승인" 신규 메뉴: B안(준비중 안내) vs C안(후속 분리)?
- D4. KCos "매장 가입 신청 관리"(GP store-approvals 와 동성격)도 함께 정렬할지?

## 11. 검증 / 제외

- 본 IR 은 read-only 조사 — 코드 변경 0, build/typecheck 불요.
- 공급자 신청자 승인/반려·C bridge·allowedSellerIds·OPL·RBAC·가격·migration 무관(미접촉).

---

*Date: 2026-06-16 · 조사 결론: (1) 타 세션 WIP 충돌로 구현 보류, (2) "매장 판매 참여 승인"=매장 온보딩 승인(판매자 모집 무관)이라 제거 의미 재확인 필요, (3) 운영자 노출 승인 backend 부재 → B/C안. 구현은 타 세션 커밋 + D1~D4 결정 후 재개.*
