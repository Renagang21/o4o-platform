# CHECK-O4O-CROSSSERVICE-SELLER-RECRUITMENT-NOTIFICATION-TARGETURL-V1

> **작업명:** WO-O4O-CROSSSERVICE-SELLER-RECRUITMENT-NOTIFICATION-TARGETURL-V1
> **유형:** 판매자 모집 알림 targetUrl serviceKey별 정리 (backend helper 1개, frontend 무변경, migration 무).
> **결과: PASS — 알림은 `serviceKey`로 필터되어 해당 서비스 앱 헤더에서만 노출되고 헤더가 자기 도메인 내 `navigate(metadata.targetUrl)` 하므로, serviceKey→상대 route 매핑만으로 dead link 0 달성. KPA/GP/KCos→`/store/commerce/recruitment-applications`, neture/unknown→`/partner/recruitment-applications`(fallback). api-server type-check PASS.**
> 선행: e953e96c7(알림) · 13302ac5f(Neture 현황) · df093f902/25fbbae17(3서비스 노출) — 2026-06-16

---

## 1. 조사 1차 — Notification targetUrl 구조

- `Notification` entity([entities/Notification.ts](../../apps/api-server/src/entities/Notification.ts))에 **top-level targetUrl 필드 없음**. `metadata`(jsonb) 안에 저장. top-level `serviceKey`(varchar 100), `type`(varchar 50 union)만 존재.
- 기존 알림 생성(`notifyApplicant`, partner-contract.service.ts)은 이미 `metadata.targetUrl='/partner/recruitment-applications'`(Neture 고정) 주입 — 13302ac5f.
- **알림센터 클릭 처리**: 4개 GlobalHeader 모두 동일 패턴 —
  ```
  const target = (n.metadata)?.targetUrl;
  if (typeof target === 'string' && target.length > 0) navigate(target);
  ```
  → react-router `navigate()` = **자기 SPA 도메인 내 상대 이동**. (NetureGlobalHeader:64 / KpaGlobalHeader:82 / GlycoGlobalHeader:110 / KCosGlobalHeader:100)
- 상대/절대: **상대 경로**. cross-domain 절대 URL 미사용·미지원.
- **이번 WO 반영 방식**: metadata.targetUrl 을 serviceKey 별로 분기. backend 1곳만 수정, frontend 무변경.

## 2. 조사 2차 — 서비스별 신청·승인 현황 route

| 서비스 | 전체 route | guard |
|--------|-----------|-------|
| KPA-Society | `/store/commerce/recruitment-applications` (App.tsx:967, basePath `/store`) | store ProtectedRoute |
| GlycoPharm | `/store/commerce/recruitment-applications` (App.tsx:975) | store ProtectedRoute |
| K-Cosmetics | `/store/commerce/recruitment-applications` (App.tsx:777) | store ProtectedRoute |
| Neture | `/partner/recruitment-applications` (App.tsx:837, PartnerSpaceLayout) | partner |

- 3 store config(`storeMenuConfig.ts`) 모두 `basePath:'/store'` + `subPath:'/commerce/recruitment-applications'` → 매장 3서비스 동일 절대경로. 알림 클릭에서 접근 가능(로그인 guard 뒤).

## 3. 조사 3차 — serviceKey ↔ route 매핑

- `notifyApplicant`는 `recruitment.serviceId` 확보(notification top-level `serviceKey`로 저장). 값 예시: `kpa-society` / `glycopharm` / `k-cosmetics` / `neture` (모집 생성 시 serviceId, 없으면 코드상 'neture'/'glycopharm' fallback 존재).
- 헤더 필터 키와 일치: KPA=`kpa-society`, GP=`glycopharm`, KCos=`k-cosmetics`, Neture=`NOTIFICATION_SERVICE_KEY`(neture). → **알림은 serviceId 와 같은 앱에서만 소비**되므로 route 매핑이 1:1로 안전.
- fallback 필요: unknown/empty → Neture partner route.
- helper 필요: O(작은 switch).

## 4. 조사 4차 — cross-domain targetUrl 판단

- 알림 소비 위치: **serviceKey 필터로 발신 서비스 앱 헤더에서만** 노출(통합 알림센터에서 타 서비스 알림 혼재 없음). KPA 알림을 Neture에서 클릭하는 시나리오 없음.
- 상대 route 안전성: **안전**. 각 앱 헤더가 자기 도메인 기준 navigate → 상대경로면 충분.
- 절대 URL 필요 여부: **불필요**. serviceKey→public URL 매핑/환경변수 의존 회피(미사용).
- 이번 WO targetUrl 정책: **serviceKey별 상대 route + Neture fallback**.

## 5. 구현 내용 (backend only, 1 파일)

`apps/api-server/src/modules/neture/services/partner-contract.service.ts`:
- 모듈 함수 `resolveRecruitmentApplicationTargetUrl(serviceKey?)` 추가 — `kpa-society|glycopharm|k-cosmetics|cosmetics`→`/store/commerce/recruitment-applications`, default→`/partner/recruitment-applications`. (`cosmetics`는 일부 경로가 canonical `k-cosmetics` 대신 사용할 가능성 대비 동일 매핑.)
- `notifyApplicant`에서 하드코딩 `'/partner/recruitment-applications'` → `resolveRecruitmentApplicationTargetUrl(serviceKey)`. 승인/반려/참여해지 3종 알림 모두 동일 경로(공통 함수) 적용.
- 문구·serviceKey·entity·metadata 그 외 필드 무변경.

## 6. Frontend 변경 여부

- **무변경.** 4개 GlobalHeader 가 이미 `metadata.targetUrl`을 `navigate()`로 소비(WO-O4O-NETURE-GLOBAL-HEADER-...-NOTIFICATION-CLICK-FIX-V1 패턴). route 오타/누락 없음(df093f902에서 마운트 완료).

## 7. 제외 범위 (WO 준수)

새 알림 시스템·entity·migration / 이메일·SMS·알림톡 / 알림 설정·센터 개편 / 신청 취소·참여 재개 / 승인·반려·해지 로직·C bridge·allowedSellerIds·OPL·계약·RBAC·가격 / 매장 현황 UI 변경 / package.json·lock·절대 URL 매핑. **모두 미수행.** 다른 세션 WIP(web-glycopharm operator 파일들) 미접촉.

## 8. 검증

- **api-server `type-check`(tsc --noEmit): PASS (exit 0).**
- frontend build 생략(무변경).
- **정적**: 알림 serviceKey=recruitment.serviceId → 해당 앱 헤더만 소비 → 상대 navigate. 매핑 route 4개 모두 마운트 확인(데드링크 0). 미지정/unknown → Neture partner route(존재) fallback → 존재하지 않는 route 이동 없음.
- **배포 후 권장 smoke**: 모집 승인/반려/참여해지 발생 → 판매자 알림 `metadata.targetUrl` 확인(serviceId 별) → 클릭 시 해당 서비스 신청·승인 현황 이동. KPA/GP/KCos seller → `/store/commerce/recruitment-applications`, Neture partner → `/partner/recruitment-applications`.

## 9. 완료 판정 / 후속

**PASS.** serviceKey별 안전한 targetUrl 정책 확정·반영. dead link 0, cross-domain 절대 URL 불필요(상대 route + Neture fallback). 새 알림 시스템·migration·정책 무변경.

**커밋:** path-specific 2파일(service + CHECK) · `8ebd85853`.
**후속(선택):** 통합 알림센터(타 서비스 알림 혼재) 도입 시 serviceKey→절대 URL 매핑 재검토 / 신청 취소·참여 재개 알림 / 이메일 알림.

---

*Date: 2026-06-16 · PASS · 알림 serviceKey 필터 + 헤더 상대 navigate 구조 확인 → resolveRecruitmentApplicationTargetUrl(serviceKey) helper 로 KPA/GP/KCos=/store/commerce/recruitment-applications, neture/unknown=/partner/recruitment-applications. backend 1파일, frontend 무변경, migration 무. type-check PASS.*
