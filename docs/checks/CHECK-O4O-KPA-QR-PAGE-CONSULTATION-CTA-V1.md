# CHECK-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1

> WO: `WO-O4O-KPA-QR-PAGE-CONSULTATION-CTA-V1`
> 선행: 상담 알림 wiring(`9c49a0c9b`) + 메뉴 hidden route화(`66df866b1`)
> 작업일: 2026-06-25 / 범위: KPA

---

## 1. 변경 요약

QR `landingType=page` 콘텐츠를 본 고객이 **본문 하단의 상담 요청 버튼**으로 바로 상담을 요청할 수 있게 했다.
요청은 기존 `tablet_interest_requests` + `POST /stores/:slug/tablet/interest` + 매장 알림(`store.consultation_requested`) 흐름을 재사용한다.

- **본문 HTML 에 버튼을 박지 않음** — `store_qr_codes` 설정값(`consultation_cta_enabled`) + QR landing 렌더러로 처리(콘텐츠 재사용성 보존).
- **기본 OFF** — 기존 QR 은 그대로 본문만 렌더(회귀 0).
- 상품 없는 콘텐츠 상담을 허용하기 위해 `tablet_interest_requests.master_id` 를 nullable 로 완화.

---

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/database/migrations/20261125000000-AddQrConsultationCtaAndNullableInterestMaster.ts` | (신규) store_qr_codes CTA 컬럼 2개 + tablet_interest_requests.master_id DROP NOT NULL |
| `apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts` | `consultationCtaEnabled`(default false) / `consultationCtaLabel`(nullable) 추가 |
| `apps/api-server/src/routes/platform/entities/tablet-interest-request.entity.ts` | `masterId` nullable(`string | null`) + ManyToOne nullable |
| `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` | `POST /:slug/tablet/interest`: masterId 선택형, 콘텐츠 상담 허용(productName fallback), source/qr metadata |
| `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts` | public SELECT 에 CTA 컬럼 + 생성/수정 API 에서 CTA 저장(page 타입에서만 ON) |
| `services/web-kpa-society/src/api/storeQr.ts` | `QrLandingData` + create/update 타입에 CTA 필드 |
| `services/web-kpa-society/src/api/tablet.ts` | `submitQrPageConsultation()` (source='qr', masterId 없음) |
| `services/web-kpa-society/src/pages/qr/QrLandingPage.tsx` | page 콘텐츠 하단 `ConsultationCta` 조건부 렌더 + 인라인 폼 |
| `services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx` | 콘텐츠(page) QR 생성 폼에 CTA 토글 + 문구 입력 |

---

## 3. migration

`20261125000000-AddQrConsultationCtaAndNullableInterestMaster`:
- `store_qr_codes.consultation_cta_enabled boolean NOT NULL DEFAULT false`
- `store_qr_codes.consultation_cta_label varchar(100) NULL`
- `tablet_interest_requests.master_id` → `DROP NOT NULL`

기존 데이터 보정 불필요(기본 false / 기존 master_id 유지). down 은 CTA 컬럼만 제거(master_id NOT NULL 복원은 수동 — nullable 동안 생성된 콘텐츠 상담 행 보호).

---

## 4. master_id nullable 전환 사유 (핵심 결정)

- QR page 상담은 **상품(ProductMaster)이 아닌 콘텐츠 상담**이므로 masterId 가 없다. 그런데 `tablet_interest_requests.master_id` 는 `NOT NULL + ProductMaster FK` 였다.
- WO 원칙(기존 `tablet_interest_requests` + `/store/requests` 처리 화면 재사용)을 지키려면 별도 테이블/경로 신설보다 **master_id nullable 완화**가 최소·자연스러운 길.
- **상품 상담(태블릿)은 그대로 master_id 저장**, **콘텐츠 상담(QR page)만 master_id=NULL**.
- 회귀 안전성: `/store/requests` 목록(`/interest/recent`)·통계(`/interest/stats`)·처리(acknowledge/complete/cancel)·pending-count 쿼리는 모두 저장된 `product_name` 과 `master_id` 를 직접 사용하며 **ProductMaster JOIN 의존이 없음** → null master_id 로 누락/오류 없음(정적 점검 완료).

---

## 5. CTA 설정 구조

`store_qr_codes`:
- `consultation_cta_enabled`(bool, 기본 false) — page 타입에서만 ON 가능(백엔드가 강제: `landingType==='page' && enabled===true`).
- `consultation_cta_label`(varchar 100, nullable) — 버튼 문구. NULL 이면 프론트 기본값 `상담 요청하기`.

생성/수정 API 모두 CTA 저장 지원. 비-page 타입은 항상 OFF 로 저장.

---

## 6. QR public response 구조

`GET /qr/public/:slug` 응답에 flat field 추가(기존 스타일 유지):
```json
{
  "landingType": "page",
  "pageContent": { "available": true, "title": "...", "body": "...", ... },
  "storeSlug": "...",
  "consultationCtaEnabled": true,
  "consultationCtaLabel": "상담 요청하기"
}
```
기존 필드 불변 — 비-page / CTA off QR 은 `consultationCtaEnabled=false`.

---

## 7. 상담 요청 생성 API 연결 방식

- 프론트 `submitQrPageConsultation(storeSlug, { productName, customerName?, customerNote?, qrSlug, landingTargetId })` → `POST /stores/:slug/tablet/interest` (`source='qr'`, `landingType='page'`, masterId 없음).
- 백엔드: masterId 없으면 master_id=NULL, `productName` = 전달값(콘텐츠 제목) 또는 fallback `QR 콘텐츠 상담 요청`.
- 연락처/문의는 `customer_note` 로 합쳐 보존(`[QR 콘텐츠 상담] / 연락처: ... / 문의: ...`).

---

## 8. 알림 연동

- 요청 생성 후 기존 best-effort 알림(`store.consultation_requested`, serviceKey=`kpa-society`, 매장 owner/admin/manager 대상) 그대로 동작.
- metadata 에 출처 컨텍스트 추가: `source='qr'`, `qrSlug`, `landingType='page'`, `landingTargetId`. `targetUrl='/store/requests'` 유지 → 알림 클릭 시 처리 화면 진입.
- productName 이 콘텐츠 제목이면 알림 본문도 `{콘텐츠 제목} 상담 요청이 접수되었습니다.`

---

## 9. 검증 결과

| 항목 | 결과 |
|---|---|
| api-server typecheck | ✅ PASS (error 0) |
| web-kpa-society typecheck | ✅ PASS (error 0) |
| 기존 QR(CTA off) 본문만 렌더 | ✅ (기본값 false) |
| 비-page landingType 영향 | ✅ 없음(CTA page 전용, 백엔드 강제) |
| 운영 smoke | ⏳ 배포+migration 후 수행 |

---

## 10. 제외 범위 (WO §4 제외 그대로)

- `/store/requests` route/메뉴, `tablet_interest_requests` 삭제
- 공통 customer_requests 모델 통합 / GP·KCos 적용
- QR video/product CTA / 다국어 CTA / 알림센터 인라인 처리
- `tablet_interest_requests` source **컬럼** 추가(이번엔 metadata 로만 기록) — 후속

---

## 11. 후속 과제

1. `tablet_interest_requests` 에 `source` 컬럼 도입(qr/tablet 구분 표준화)
2. 기존 QR 의 CTA on/off 편집 UI(현재 생성 폼에서만 설정 — StoreQRPage 에 편집 모달 부재)
3. QR video/product CTA 확장
4. GP/KCos customer_requests 모델과 통합
5. CTA 다국어 문구 / 고객 연락처 필수화 정책
