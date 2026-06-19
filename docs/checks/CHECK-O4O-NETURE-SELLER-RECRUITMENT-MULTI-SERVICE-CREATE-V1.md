# CHECK-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1

> **작업명:** WO-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1 (안 A)
> **유형:** 판매자 모집 "모집 대상 서비스" 단일→복수. 모델은 service당 row 1개(serviceId 단일 유지). DB UNIQUE 확장 1건.
> **결과: PASS (조건부 — 런타임/브라우저·migration 검증은 배포 후).** api-server + web-neture typecheck PASS. 서비스별 exposure_status 독립 보장. 원자적 생성(하나라도 불가 시 전체 실패).
> 선행: IR-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-AUDIT-V1 (안 A 확정)

## 1. 설계 (안 A — 서비스당 row)

- recruitment ↔ service = **단일 `service_id` 유지**. 복수 서비스 선택 시 **서비스 수만큼 row 생성**.
- 각 row의 `exposure_status` 독립 → KPA 승인 / GP 반려 독립 성립. (단일 row + serviceKeys 배열[안 C]은 exposure_status 공유라 부적합 — IR §6)
- **원자적 생성**(사용자 정책 확정): 선택 서비스 중 하나라도 불가(규제 미충족/중복)면 **전체 실패**, 부분 성공 없음.

## 2. 변경 (6 + migration 1)

| 파일 | 변경 |
|------|------|
| `database/migrations/20260619000000-ExpandRecruitmentUniqueToService.ts` | UNIQUE `(product_id, seller_id)` → `(product_id, seller_id, service_id)`. 기존 제약 동적 탐색 drop + 신규 추가, 멱등(DO 블록), down 복원 |
| `entities/NeturePartnerRecruitment.entity.ts` | `@Unique(['productId','sellerId'])` → `['productId','sellerId','serviceId']` |
| `services/partner-contract.service.ts` | `createRecruitment` 멀티화: `serviceKeys[]`(우선)+`serviceKey`(하위호환) dedupe, offer/PRIVATE 1회 해소, 규제 gate=전 키 검사(원자), 중복 검사=선택 키 중 하나라도 존재 시 전체 실패, **트랜잭션으로 N row 생성**. 반환 `data.recruitments[]` + 하위호환 `id/serviceId`(첫 row) |
| `neture.service.ts` | facade `createPartnerRecruitment` 시그니처에 `serviceKeys?` 추가 |
| `controllers/partner-recruitment.controller.ts` | body 에서 `serviceKeys` 추출·전달. 기존 에러맵(SERVICE_KEY_REQUIRED/DRUG_SERVICE_NOT_PHARMACY_AUDIENCE/RECRUITMENT_ALREADY_EXISTS) 그대로 |
| `lib/api/supplier.ts` | `supplierRecruitmentApi.create` 입력 `serviceKeys?`/`serviceKey?`, 응답 타입 `recruitments?[]` |
| `components/supplier/RecruitmentCreateModal.tsx` | 단일 `<select>` → 복수 체크박스. 최소 1개 강제. 규제(regulatoryType∈DRUG/QUASI_DRUG/MEDICAL_DEVICE/HEALTH_FUNCTIONAL) 시 약국(GlycoPharm/KPA) 외 비활성. 문구 "모집할 서비스(복수 선택 가능)" |

## 3. 서비스별 승인 분리 보장

- 상품 P → KPA+GP 선택 → recruitment row 2개(serviceId=kpa-society / glycopharm), 각 `exposure_status=PENDING` 독립.
- 운영자 노출 승인: 서비스별 proxy(`service-recruitment-exposure-proxy`)가 해당 row만 승인/반려(`SERVICE_MISMATCH` 가드 유효) → KPA approved / GP rejected 독립.
- 신청/allowedSellerIds/알림 targetUrl/계약 = **무변경**(각 service row 기준 기존 동작).

## 4. 원자성 / 멱등

- 생성: `AppDataSource.transaction` 으로 N row 일괄 — 중간 실패 시 롤백(부분 성공 0).
- 규제 gate: 선택 키 전체 검사, 하나라도 비약국이면 `DRUG_SERVICE_NOT_PHARMACY_AUDIENCE`(전체 실패).
- 중복: `(productId, sellerId, serviceId)` 선택 키 중 기존 존재 시 `RECRUITMENT_ALREADY_EXISTS`(전체 실패). DB UNIQUE 가 최종 방어.
- migration: DO 블록 멱등(제약 존재 여부 확인 후 drop/add). 기존 데이터 충돌 없음(종전 UNIQUE 로 product×seller 당 ≤1 row).

## 5. 검증

| 대상 | 결과 |
|------|------|
| `apps/api-server` tsc --noEmit | **PASS** |
| `services/web-neture` tsc --noEmit | **PASS** |
| 변경 격리 | 6파일 + migration 1. 동시 세션(ProductDetailDrawer/png) 미접촉 |

## 6. 비범위 / 후속

- **목록/상세 그룹 표시**: 현재 서비스별 N행으로 자연 표시(무변경). 상품 단위 그룹 + 서비스별 뱃지 UX 는 후속(`WO-...-RECRUITMENT-LIST-GROUP-UX-V1`).
- 노출 승인 정책·offer 2축·event-offer·allowedSellerIds 의미·알림 경로 무변경.
- 하위호환: 기존 단일 `serviceKey` payload·기존 단일 모집 row 정상 동작.

## 7. 배포 후 스모크 (필수 — DB migration + 신규 생성 경로)

1. migration `ExpandRecruitmentUniqueToService` 실행 로그 확인(제약 교체 성공, 에러 0).
2. 공급자 모집 모달에서 KPA+GlycoPharm 복수 선택 → 생성 → recruitment **row 2개**(serviceId 각각) 확인.
3. 서비스 미선택 → 생성 불가(버튼/검증).
4. 규제 상품 → 비약국 서비스 비활성 + (우회 시) 백엔드 400.
5. 운영자 노출 승인: KPA 승인 / GP 대기·반려 독립 확인.
6. 기존 단일 모집 표시 회귀 없음.

## 8. PASS 기준 대비 (WO 수용)

| 기준 | 상태 |
|------|------|
| 모달 복수 서비스 선택 | ✅ |
| 미선택 시 생성 불가 | ✅ |
| 규제 약국 서비스 제한 유지 | ✅ (프론트 비활성 + 백엔드 원자 gate) |
| KPA+GP → row 2개, serviceId 각각 | ✅ (코드·tsc; 라이브는 §7) |
| exposure_status 독립 PENDING | ✅ |
| 단일 serviceKey 하위호환 | ✅ |
| 기존 단일 모집 표시 회귀 없음 | ✅ |
| typecheck PASS | ✅ |
| 배포 후 브라우저 smoke | ⏳ §7 |

---

*Date: 2026-06-19 · CHECK(조건부 PASS) · 안 A service당 row · UNIQUE(product,seller,service) 확장 · serviceKeys[] 원자 생성(트랜잭션) · exposure_status 서비스별 독립 · 단수 하위호환 · api/web tsc PASS · 목록 그룹표시·런타임/migration 검증은 후속/배포 후.*
