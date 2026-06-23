# CHECK-O4O-FOREIGN-VISITOR-PARTNER-MANAGEMENT-UI-V1

> **작업명:** WO-O4O-FOREIGN-VISITOR-PARTNER-MANAGEMENT-UI-V1
> **유형:** frontend only (KPA store-owner). backend/DB/migration **무변경**.
> **결과: PASS(코드/타입/빌드) — ForeignVisitorPartner backend(/api/v1/foreign-visitor/partners) 소비 UI. 목록/필터/등록·수정 모달/활성·비활성 + entitlement gate(쓰기 disabled+안내, 403 처리). web-kpa tsc 0 + build 0.**
> **작성일:** 2026-06-23
> 선행: WO-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1 (backend model/API, 커밋 d9f904841)

---

## 1. git 상태 / 다른 세션 WIP

- HEAD `d9f904841` 기준. 변경 = 본 WO frontend 4파일만. 다른 세션 WIP `apps/mobile-app/` **미접촉**. **api-server 무변경(clean)**. path-specific 커밋.

## 2. 변경 파일 (frontend 4 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/api/foreignVisitorPartners.ts` | **신규** — 타입/라벨 + API client 5함수(list/get/create/update/status), coreApiClient + serviceKey='kpa' 주입 |
| `services/web-kpa-society/src/pages/pharmacy/ForeignVisitorPartnersPage.tsx` | **신규** — 목록/필터/검색 + 등록·수정 모달 + 활성·비활성 + entitlement gate + empty/loading/error |
| `.../ForeignVisitorSalesSupportPage.tsx` | "파트너 관리" 진입점 카드 추가(panel 하단) |
| `services/web-kpa-society/src/App.tsx` | lazy import + 라우트 `sales-channels/foreign-visitor/partners` |

## 3. 추가 route / page

- 라우트 **`/store/sales-channels/foreign-visitor/partners`** (`ForeignVisitorPartnersPage`).
- 진입점: `ForeignVisitorSalesSupportPage`(`/store/sales-channels/foreign-visitor`) 하단 "파트너 관리" 카드 → 위 라우트. 문구에 "파트너별 QR 발급은 다음 단계에서 제공됩니다" 명시(QR 버튼 없음).

## 4. API client 함수 (coreApiClient `/api/v1`, serviceKey='kpa')

```
getForeignVisitorPartners(params) → { items, pagination }
getForeignVisitorPartner(id)
createForeignVisitorPartner(payload)
updateForeignVisitorPartner(id, payload)
updateForeignVisitorPartnerStatus(id, status)
```
- 타입: ForeignVisitorPartnerType(6) / Status(ACTIVE|INACTIVE) + PARTNER_TYPE_LABELS / PARTNER_STATUS_LABELS(한글).

## 5. 목록 / 등록·수정 / 상태변경 UI

- **목록**: 파트너명(+이메일)·유형·담당자·연락처·상태·등록일·관리(수정/활성·비활성). 필터: 상태(전체/활성/비활성)·유형(6종)·검색(파트너명/담당자/연락처).
- **등록·수정**: 모달(유형*·파트너명*·담당자·연락처·이메일·메모). 등록 시 status=ACTIVE.
- **상태변경**: 행 액션 활성화/비활성화(hard delete 없음).
- 상태: loading/error(다시 시도)/empty("아직 등록된 파트너가 없습니다").

## 6. entitlement gate 표시 방식

- mount 시 `checkSubscription(serviceKey='kpa', planCode=FOREIGN_VISITOR_SALES_SUPPORT)` → `entitled`.
- **GET 목록은 항상 표시**(entitlement 불요, backend 정책 일치).
- `entitled=false` → 등록/수정/상태변경 버튼 **disabled** + 상단 안내 배너 + **"외국인 관광객 판매 지원 시작하기"**(→ `/store/sales-channels/foreign-visitor`).
- **backend 403 `ENTITLEMENT_REQUIRED` 처리**: 쓰기 실패 시 코드 감지 → 안내 토스트 + `entitled=false` 갱신(프론트 가드만 의존하지 않음).

## 7. 보존 경계

- ✅ backend API/`foreign_visitor_partners` migration/PaymentCore/Toss/`store_paid_feature_entitlements` schema **무변경**(소비만).
- ✅ QR 생성 / AFFILIATE_MARKETING 템플릿 / landing / scan event / 방문·구매 전환 **미구현**(범위 밖, 진입점 문구로만 예고).
- ✅ STORE_SALE_PAYMENT 410 / Neture B2B / Neture partner·recruitment **미접촉**. shared 패키지(store-ui-core) 무변경(KPA 페이지 레벨에서만 처리).

## 8. 검증

- web-kpa-society `tsc --noEmit`: **EXIT 0** · `build`(tsc && vite build): **EXIT 0**(✓ built 14.63s).
- backend 무변경 → shared 소비처 영향 없음.

### 배포 후 smoke 결과 (2026-06-23, 비파괴)
- web-kpa 배포 **success**(Deploy Web Services run 28004610970, 2m51s).
- **backend route 라이브(서버측 확정):** `GET /api/v1/foreign-visitor/partners?serviceKey=kpa` 미인증 → **401 AUTH_REQUIRED**(404 아님) = 새 api 리비전에 route 등록·배포 확인.
- **인증 visual smoke: 보류(환경 한계, 코드 무관).** ephemeral headless 로 데모 store-owner 로그인(/login 모달 "🧪 체험용 약국 경영자 계정") 시도 → **토큰·네트워크 호출 미발생**으로 인증 미성립(이전 CLIENT-KEY smoke 와 동일 — KPA 데모 로그인은 headless 에서 동작 안 함). 따라서 카드 노출/목록 GET 200/entitlement 배너 시각 확인은 **실브라우저 1회**로 분리.

#### 실브라우저 read-only 확인 절차 (1회, 데이터 생성 없음)
1. store-owner 로그인 → `/store/sales-channels/foreign-visitor` → "파트너 관리" 카드 노출.
2. `/store/sales-channels/foreign-visitor/partners` → 목록/empty 렌더 + Network `GET /foreign-visitor/partners?serviceKey=kpa` **200**.
3. entitlement 미보유 → 등록/수정 버튼 disabled + 안내 배너. 보유 → 등록 모달 작동(생성은 local/staging 또는 명시 승인 후).
4. console error 0(본 WO 관련).
> 운영은 read-only(GET) 우선. 데이터 생성은 신중히.

## 9. 후속 WO

```
WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1   partner_id 기반 QR(generateQrSvg 재사용)
WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1       partnerId/qrCodeId 식별 랜딩(다국어 landing 연결)
WO-O4O-FOREIGN-VISITOR-QR-SCAN-EVENT-V1           익명 스캔 이벤트(ipHash)
```

---

*Date: 2026-06-23 · frontend only · ForeignVisitorPartner 관리 UI(목록/필터/모달/상태전환) + entitlement gate(쓰기 disabled+안내, 403 ENTITLEMENT_REQUIRED 처리) · 진입점 카드 · QR/landing/scan 미구현 · backend/migration/결제/Neture B2B 무변경 · web-kpa tsc 0 + build 0.*
