# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-INFO-DISTRIBUTION-SUMMARY-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-PRODUCT-INFO-DISTRIBUTION-SUMMARY-V1 (후보 A)
> **유형:** frontend-only 표시 정비 — drawer view 모드에 "공급 방식" 요약 섹션 추가 + "기본 정보"→"상품 정보" 리네임. backend/API/DB 변경 0.
> **결과: PASS(코드/타입) — 상품 정보 ↔ 공급 방식 표시 분리. 평이한 공급 방식 라벨(B2B 전체 공급/서비스 공급/내부 상품) + 설명 + 공급가 + 노출 + 서비스별 승인 요약. distributionType 내부 용어 미노출. web-neture tsc 0. 라이브 smoke는 배포 후.**
> 선행: IR-O4O-NETURE-SUPPLIER-PRODUCT-INFO-AND-DISTRIBUTION-UX-AUDIT-V1 (V1 후보 A) — 2026-06-18

---

## 1. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx` | view 모드: "기본 정보"→"상품 정보" 리네임 + "공급 방식" 요약 Section 신규 추가 |

> backend/API/DB/migration 무변경. 다른 파일 무접촉.

## 2. drawer 구조 변경 요약

- **"기본 정보" Section → "상품 정보"** 로 리네임(상품 정체성 영역 명확화: 바코드/상품명/규제명/브랜드/카테고리/사양/원산지/규제유형/MFDS번호/제조사 — 기존 그대로, 제목만).
- **"공급 방식" Section 신규**(상품 정보 바로 아래, view 전용): 이 상품을 "어디에 어떤 상태로 공급하는가"를 요약.
- 기존 가격 점검 / 상태 / 서비스 / 스팟 / 재고 섹션 **무변경**(공유 drawer 영향 최소화 — §6 참조). 새 섹션은 상단 요약, 하단은 상세.

## 3. 상품 정보 / 공급 방식 표시 분리 방식

- **상품 정보**(= 이 상품이 무엇인가): 기존 "상품 정보"(전 "기본 정보") Section. 공급/가격/노출 컬럼 없음.
- **공급 방식**(= 어디에 어떤 상태로 공급): 신규 Section. 현재 공급 방식 라벨 + 설명 + 기본 B2B 공급가 + 노출 상태 + 서비스별 승인 요약 + 이벤트 오퍼 분리 안내.
- IR 근거: 구조는 이미 ProductMaster(정보)/SupplierProductOffer(공급) 분리 → frontend 표시만 분리.

## 4. 공급 방식 라벨 기준 (distributionType 내부 용어 미노출)

`isPublic`(=isPublic ?? distributionType==='PUBLIC') + `serviceKeys`(neture 제외) 파생:

| 조건 | 라벨 | 설명 |
|------|------|------|
| isPublic | **B2B 전체 공급** | 서비스 운영자 승인 없이 HUB 노출될 수 있습니다 |
| serviceKeys 존재 | **서비스 공급** | 선택 서비스 운영자 승인 후 해당 서비스 HUB 노출 |
| 그 외(미공개·서비스 없음) | **내부 상품** | 공급 방식 미설정 — HUB 미노출 |

- 내부 용어 `distributionType`/`PUBLIC`/`SERVICE`/`PRIVATE`는 새 섹션에 **노출하지 않음**(§5.2 준수). (하단 기존 "상태" 섹션의 기술 표시는 §6대로 무변경.)

## 5. 서비스별 승인 상태 표시 (가능 범위)

- `product.serviceApprovals`(이미 FE 수신, neture 제외)에서 serviceKey별 status 매핑:
  - approved→**승인됨** / pending→**승인대기** / rejected→**반려됨** / 없음→**미신청**.
- API 확장 불요(기존 응답 사용). → §5.3 중단 기준 해당 없음(표시 가능 데이터 존재).

## 6. 가격 표시 위치 / 공유 drawer 영향

- 새 "공급 방식" 섹션에 **기본 B2B 공급가**(`price_general`) 표시(§5.4 — 가격은 공급 영역). gold/platinum(참고용)·소비자참고가는 기존 "가격 점검" 섹션 유지.
- **ProductDetailDrawer는 supplier + operator(OperatorProductApprovalPage) 공유**(§9 중단 기준 대상). → 위험 회피 위해 **기존 섹션 이동/삭제 없이 순수 추가 + 제목 1개 리네임**만. 새 요약 섹션은 operator 뷰에도 무해(공급 방식 가독성 향상).

## 7. 준수 / 비범위

- ✅ 공급 방식 변경/serviceKeys PATCH/submitForApproval/route/이벤트 진입 추가 **안 함**(후보 C/D/E). [공급 방식 관리] 버튼 미추가(§5.6 기본).
- ✅ backend/API/DB/migration 0. B2C/B2B 설명 편집·승인요청 기존 동작 무변경.

## 8. 검증

- **web-neture `tsc --noEmit`: EXIT 0** (ProductDetailDrawer).
- 정적: 새 섹션은 `!isEditing` view 전용, 기존 helper(formatPrice/Badge/Section/InfoRow)·기존 필드(serviceKeys/serviceApprovals/priceGeneral/isActive)만 사용. edit/operator 경로 무변경.

### 배포 후 browser smoke (보류 — 사유)
- 자동 브라우저 세션 프로필 락으로 직접 자동화 불가 → **배포 후 사용자 관측** 권장. 확인 항목:
  1. drawer에 "상품 정보" / "공급 방식" 섹션 분리 표시.
  2. PUBLIC 상품→"B2B 전체 공급", SERVICE 상품→"서비스 공급"+서비스별 승인, 미설정→"내부 상품".
  3. 공급가 공급 방식 영역 표시 / 노출 상태 표시.
  4. 기존 이미지/정보/설명/수정/승인요청·operator 승인 화면 회귀 없음.

## 9. 회귀 위험

- 공유 drawer지만 **순수 추가 + 제목 리네임**이라 위험 낮음. operator 승인 화면도 새 요약 섹션 표시(무해).
- 가격이 "공급 방식"(공급가) + "가격 점검"(서비스가/참고가) 두 곳 — 요약/상세 중복이나 의미 충돌 없음.

## 10. 후속 후보

- **C** `...-DISTRIBUTION-MANAGEMENT-ENTRY-V1` — [공급 방식 관리] 진입 추가.
- **D** `...-DISTRIBUTION-MANAGEMENT-FLOW-V1` — PUBLIC/SERVICE 변경 플로우 + serviceKeys PATCH 정식화 + SERVICE 제거 시 approval row 정책.
- **B** `...-PRODUCT-CREATE-INFO-FIRST-V1` / **E** `...-PRODUCT-TO-EVENT-OFFER-ENTRY-V1`.

---

*Date: 2026-06-18 · frontend-only · drawer "상품 정보"/"공급 방식" 표시 분리 · 평이 라벨(B2B 전체/서비스/내부) + 설명 + 공급가 + 노출 + 서비스별 승인 요약 · distributionType 내부용어 미노출 · 공유 drawer 순수 추가(operator 무해) · backend/API/DB 0 · web-neture tsc 0 · 라이브 smoke 배포 후 · 후속 C(진입)→D(플로우).*
