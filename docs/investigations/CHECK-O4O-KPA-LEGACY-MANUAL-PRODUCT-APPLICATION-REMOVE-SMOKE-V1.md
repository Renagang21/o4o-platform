# CHECK-O4O-KPA-LEGACY-MANUAL-PRODUCT-APPLICATION-REMOVE-SMOKE-V1

> **대상 WO:** WO-O4O-KPA-LEGACY-MANUAL-PRODUCT-APPLICATION-REMOVE-AND-LISTING-MANAGEMENT-PRESERVE-V1 (구현 커밋 `0cbc3952f`, HUB-P1-07)
> **검증일:** 2026-07-27
> **성격:** 배포·운영 smoke 결과 기록. 코드 변경 0.

---

## 1. 배포 상태

| 항목 | 값 |
|------|------|
| 구현 커밋 | `0cbc3952f` (2026-07-27 00:58 UTC) |
| KPA 웹 리비전 | `kpa-society-web-01713-fbt` (2026-07-27 01:01 UTC, traffic 100%) — 커밋 3분 후 빌드 → 변경 반영 확인 |
| API | `o4o-core-api` `/health` = alive, production, v0.5.0 |
| 커밋 도달성 | `0cbc3952f` ∈ origin/main |

## 2. 검증 방식 및 제약

- **브라우저 자동화(Playwright)**: 실행 불가 — 지속 프로파일 `C:\Users\home\.playwright-o4o-profile` 이 다른 세션에 점유되어 launch 실패(알려진 함정). 사용자 Chrome 세션 강제 종료는 미수행.
- **API 인증 로그인**: auto-mode 분류기 차단(비밀번호 외부 전송 패턴) — 우회하지 않음.
- 따라서 CLAUDE.md §8 허용 채널 중 **① 배포 리비전 대조 ② API 직접 호출(무자격 401 게이팅) ③ 배포 프론트 번들 정적 분석**으로 대체 검증. 인증 상태의 인터랙티브 동작(클릭 라운드트립·채널 저장→재조회 실측)은 사용자 브라우저 확인 필요(§5).

## 3. API 라우트 게이팅 (무자격 GET, 비밀번호 미전송)

| 엔드포인트 | HTTP | 판정 |
|-----------|:---:|------|
| `/api/v1/kpa/pharmacy/products/catalog` | 401 | 마운트+게이팅 ✓ |
| `/api/v1/kpa/pharmacy/products/listings` | 401 | ✓ |
| `/api/v1/kpa/pharmacy/products/orderable` | 401 | ✓ |
| `/api/v1/kpa/pharmacy/products/approved` | 401 | ✓ |
| `/api/v1/kpa/pharmacy/products/applications` | 401 | 백엔드 라우트 존속(404 아님) — WO 범위는 **프론트 소비처+dead 클라이언트** 제거였고 백엔드 라우트 제거는 범위 밖 → 정상 |

## 4. 배포 프론트 번들 정적 분석

배포 청크를 직접 fetch 하여 문자열/계약 확인.

### 4.1 `PharmacySellPage-DwPsC-GY.js`
| 확인 | 결과 |
|------|------|
| 신규 CTA "HUB에서 상품 추가" | **FOUND** ✓ |
| 새 제목 "상품 진열 관리" | **FOUND** ✓ |
| 채널 라벨 B2C / KIOSK / TABLET / SIGNAGE | **4종 모두 FOUND** ✓ (채널 설정 편집기 보존) |
| 구형 폼 필드 `externalProductId` | **ABSENT** ✓ (수동 신청 폼 제거) |
| 구형 탭 라벨 "판매 신청" | **ABSENT** ✓ |

### 4.2 `PharmacyB2BPage-ClVaxfh7.js`
| 확인 | 결과 |
|------|------|
| 서브내비 라벨 "진열 관리" | **FOUND** ✓ (판매 신청 → 진열 관리 relabel) |

### 4.3 `pharmacyProducts-M3_cigYT.js` (클라이언트, tree-shaken 701B — 전체 확인)
배포 클라이언트가 노출하는 함수 = 정확히 다음 8종:
```
get  /pharmacy/products/catalog
get  /pharmacy/products/orderable
post /pharmacy/products/apply { supplyProductId }   ← canonical apply (올바른 계약)
del  /pharmacy/products/by-offer/{id}
get  /pharmacy/products/listings
put  /pharmacy/products/listings/{id}
get  /pharmacy/products/listings/{id}/channels      ← 채널 조회 보존
put  /pharmacy/products/listings/{id}/channels      ← 채널 저장 보존
```
- **제거 확인**: 구형 `applyProduct(external_product_id)`·`getApplications` 는 배포 번들에 **부재** ✓
- apply 계약이 `{ supplyProductId }` 로, externalProductId→supplyProductId 단순치환(404 유발) 없이 canonical 경로만 존재 ✓
- (주: 심볼은 minify 되어 함수명 문자열은 사라지나, 엔드포인트 경로·페이로드 형태로 계약 확정)

## 5. 사용자 브라우저 확인 잔여 항목 (인증 인터랙티브)

정적/API 로 계약은 GREEN 이나, 실 로그인 동작은 사용자 확인 권장:

1. `/store-hub/b2b` 카탈로그 조회 — *현재 `supplier_product_offers` 0행이라 목록은 비어 있을 수 있음(정상)*
2. "HUB에서 상품 추가" CTA → `/store-hub/b2b` 이동
3. `/store/commerce/products/b2c` 진열 관리 진입 (활성 listing 20건 존재)
4. 상품 채널 설정(B2C/키오스크/태블릿/사이니지) 저장 → 재조회 라운드트립
5. 구형 externalProductId 수동 신청 폼이 어디에도 노출되지 않음

## 6. 판정

**배포·정적·API 검증 GREEN.** 구현 변경(수동 신청 폼·dead 클라이언트 제거 + 진열/채널 편집기 보존 + relabel + HUB CTA)이 프로덕션 리비전에 정확히 반영됨. 인증 인터랙티브 라운드트립만 사용자 브라우저 확인 대기.

- 코드 변경: **0** / DB write: **0** / 배포: **0** (본 검증은 조회 전용, 본 문서만 생성)

---

*배포 리비전 대조 · API 401 게이팅 · 배포 번들 정적 분석 = GREEN · 인증 인터랙티브 = 사용자 확인 대기*
