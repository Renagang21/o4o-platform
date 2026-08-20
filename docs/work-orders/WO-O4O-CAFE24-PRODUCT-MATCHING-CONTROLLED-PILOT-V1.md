# WO-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1

> **선행 CHECK**: [CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-RESUME-V1](../investigations/CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-RESUME-V1.md)
> **상태**: 사용자 사전작업 대기 (테스트몰 상품 등록)
> **작성일**: 2026-08-20

## 1. 목표 · 배경

선행 Census 는 `sohae2100` 몰의 상품이 2건뿐이라 매칭률을 산출해도 의미가 없었다(2/2 NOT_FOUND = 모집단 없음).
Cafe24 연동 자체(OAuth · refresh · `mall.read_product` 상품조회 · token 저장)는 실측으로 성립했으므로,
이제 확인할 것은 **연동 기술이 아니라 상품 데이터로 O4O ProductMaster 를 찾을 수 있는가**다.

이번 WO 는 **시장 매칭률 측정이 아니다.** O4O ProductMaster 에 실제로 존재하는 제품을 통제된 조건으로
테스트몰에 넣고, **Cafe24 에서 쓸 수 있는 최선의 상품 식별 계약**을 찾는 기술 Pilot 이다.

또한 선행 Census 에서 `products` 응답에 **barcode 필드가 없다**는 사실이 확인됐다. Cafe24 공식 문서상
품목 식별자는 `variants`(`variant_code` · `custom_variant_code`) 쪽에 있으므로, 이번에는 product 레벨만
보지 않고 **variants 까지 함께 조사**한다.

## 2. 승인 범위

- `products` + `products/{product_no}/variants` 조회 (scope 는 `mall.read_product` 그대로)
- census 러너 확장: variants 조회 · 식별 필드 census · 매칭 사다리 재산출
- `deploy-api.yml` 에 `CAFE24_REDIRECT_URI` 정본 env 추가 후 임시 `cafe24-redirect-uri` secret 제거 **(사용자 승인 완료)**
- CHECK 작성 → commit → push

### 2-1. 사용자 사전작업 (이 WO 실행 전 필요)

O4O `product_masters` 에 **실제로 존재하는** 제품 20~30개를 `sohae2100` 테스트몰에 등록한다.
매칭키 판별이 목적이므로 조건을 일부러 섞는다.

| 축 | 섞을 값 |
|---|---|
| 상품명 | 정확히 동일 / 약간 다름(띄어쓰기·괄호·용량 표기 차이) |
| 제조사 | 있음 / 없음 |
| 자체상품코드(`custom_product_code`) | 있음 / 없음 |
| 품목 자체코드(`custom_variant_code`) | 있음 / 없음 |
| 옵션 | 없는 상품 / 있는 상품(variants 2건 이상) |

## 3. 실행 순서

1. 연결 상태 확인 (`GET /api/v1/admin/cafe24/connections` · ACTIVE)
2. census 러너에 variants 조회 추가 — 상품당 `products/{product_no}/variants` 1회, 응답 key 실측 기록
3. 식별 필드 census: `product_code` · `custom_product_code` · `variant_code` · `custom_variant_code` ·
   `product_name` · `eng_product_name` · `model_name` · `manufacturer_code` · `brand_code` · `supplier_code`
   (present / blank / unique / duplicate / usableRate)
4. `product_masters` · `product_identifiers` 기준 매칭 사다리 재산출 → **EXACT / AMBIGUOUS / SIMILAR / NOT_FOUND**
   - barcode 단계는 응답에 필드가 없으므로 **variants 식별자 단계로 대체**하고, 그 사실을 CHECK 에 남긴다
5. 사다리 단계별 정확도 비교 → **가장 신뢰할 수 있는 매칭키 1~2개 확정**
6. `deploy-api.yml` env 정본화 + 임시 secret 제거 · 배포 후 존재 확인
7. CHECK 작성 → commit → push

## 4. 제외 범위

- ProductMaster / ProductIdentifier **생성·수정** (읽기만)
- External Commerce Ownership 설계 · organization_id / supplier_id / service_key 추가
- QR · Tablet · Signage ownership 변경
- 주문 / 회원 / 결제 / 배송 scope 사용 · Cafe24 상품 원장 복제
- Naver / Coupang API 구현
- 평문 `DB_PASSWORD` / `JWT_SECRET` / `GEMINI_API_KEY` / `SMTP_PASS` 의 Secret Manager 이관 (별도 보안 WO)

## 5. 중지 조건

- 테스트몰 상품이 10건 미만 → 판정 보류하고 보고
- `mall.read_product` 로 variants 조회가 불가 → scope 확대하지 말고 중지·보고
- DB schema / migration 이 필요하다는 결론 → 구현하지 말고 보고
- 매칭 결과를 근거로 ownership 구조를 만들고 싶어지는 시점 → 그것이 다음 WO 의 입력이다. 여기서 만들지 않는다

## 6. 검증 · Git

- census 리포트는 **repo 밖**(`C:/tmp`)에 둔다. DB write 0 (token refresh 로 인한 `cafe24_connections` 갱신은 예외)
- `apps/api-server` typecheck + cafe24 테스트 통과
- `CAFE24_REDIRECT_URI` 가 CI 배포 후에도 env 에 남아 있는지 확인 (선행 사고 재발 방지)
- path-specific stage · main 직접 커밋 · `HEAD == origin/main`

## 7. 완료 보고

- 필드별 census 실측표 (products + variants)
- 매칭 사다리 단계별 EXACT / AMBIGUOUS / SIMILAR / NOT_FOUND
- **결론**: 가장 신뢰할 수 있는 매칭키 + Cafe24 상품 → O4O ProductMaster 연결 **권장 계약**
- 이 결과로 답할 수 있는 것과 **여전히 실도매몰 Census 가 있어야 답할 수 있는 것**을 구분해 적는다
- `문서 정합` 한 줄

---

## 다음 단계 (이 WO 이후)

실제 Cafe24 **도매몰 한 곳**(상품 수백~수천)에서 실모집단 Census.
그 숫자가 나와야 자동매칭 중심 / 후보추천+수동확인 / 초기 전체 매핑 지원 중 무엇인지 결정할 수 있다.
