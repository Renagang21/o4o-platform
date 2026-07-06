# WO-O4O-ADMIN-O4O-PRODUCT-MANAGEMENT-BASE-CONSOLE-V1

## 0. 목적

`admin.neture.co.kr > O4O 상품 DB`를 단순 조회 화면에서, 향후 실제 상품 관리를 할 수 있는 기본 콘솔 구조로 정리한다.

이번 WO는 **데이터 정비 작업이 아니다.**

현재 의약품, 의료기기, 건강기능식품, 의약외품 등 데이터 등록/정비 트랙이 병행 중이므로, 실제 데이터 승격·삭제·병합·bulk archive는 아직 진행하지 않는다.

이번 작업의 목표는 admin에서 상품을 관리할 수 있는 **화면 구조, 정보 배치, 조회 중심의 운영 기반**을 먼저 완성하는 것이다.

> 핵심 문장: "데이터를 고치는 작업이 아니라, 앞으로 데이터를 관리할 수 있는 admin 상품관리 콘솔의 기본 골격을 완성한다."

---

## 1. 현재 상태

이미 완료된 작업:

- `admin.neture.co.kr > O4O 상품 DB` read-only skeleton 완료
- 후보 목록/상세 조회 완료
- 기본상품 목록/상세 조회 완료
- 현황 dashboard 완료
- 프로덕션 배포 완료
- smoke 완료
- 상품 데이터 mutation 0

최근 배포 커밋: `318827279`

현황 dashboard smoke 기준:

| 항목 | 값 |
| --- | ---: |
| ProductCandidate total | 394,491 |
| ProductMaster total | 181,241 |
| 충돌 후보 | 244 |
| 후보매칭 | 0 |
| 미매칭 | 163,406 |

주의: 이 수치는 smoke 시점 기준이다. 이번 WO에서 수치 자체를 고치거나 정비하지 않는다.

---

## 2. 이번 WO의 핵심 방향

| 구분 | 방향 |
| --- | --- |
| 기본상품 관리 | ProductMaster 중심의 관리 콘솔 구조 강화 |
| 후보 데이터 | 데이터 유입 확인용 read-only 화면 유지 |
| 설명 관리 | 후속 설명 작업이 붙을 자리 마련 |
| 이미지 관리 | 이미지 있음/없음, 대표 이미지 상태 확인 자리 마련 |
| 원천/식별자 | 상품의 identifier/source 정보를 관리자가 쉽게 확인 |
| 작업 로그 | 향후 write/audit가 붙을 자리 마련 |
| 데이터 정비 | 준비중 유지. 실제 action 없음 |

---

## 3. 이번 WO에서 하지 않는 것 (금지)

- ProductCandidate → ProductMaster 승격
- ProductMaster 생성/수정/삭제
- ProductIdentifier 생성/수정/삭제
- 후보 bulk archive / bulk delete / 상태 변경
- review note 저장
- 의료기기/건기식/의약외품 데이터 정비
- 설명서 생성 / AI 설명 생성
- 이미지 업로드/교체
- 매장 노출 연결 / QR·POP·태블릿 연결
- Offer 생성 / OrganizationProductListing 생성 / StoreLocalProduct 생성

원칙:

```
GET-only
mutation 0
backend/DB write 0
```

---

## 4. 대상 화면

| 화면 | 현재 | 이번 WO |
| --- | --- | --- |
| 현황 | 완료 | 유지, 회귀 방지 |
| 기본상품 | 목록/상세 read-only | 관리 콘솔 중심으로 강화 |
| 후보 데이터 | 목록/상세 read-only | 유입 데이터 확인용으로 정리 |
| 데이터 정비 | 준비중 | 계속 준비중 |
| 설명 관리 | 없음/미흡 | 상세 내부 섹션 자리 마련 |
| 이미지 관리 | 상세 일부 표시 | 상태 확인 섹션 강화 |
| 작업 로그 | 없음 | 상세 내부 placeholder |

> IA 주의: 메뉴가 과하게 늘어나면 기본상품 상세 내부 섹션으로 우선 배치한다. 빈 route 메뉴 신설은 하지 않는다 (CLAUDE.md Shared Module / Core+Extension Change Rule — route 없는 메뉴 노출 금지).

---

## 5. 기본상품 목록 개선

`ProductMastersPage.tsx` — 관리 목적에 맞게 정리. 현재 목록 API(`GET /neture/products/library/search`)가 제공하는 값만 사용한다:
`id, barcode, name, regulatoryName, manufacturerName, specification, category, brand, primaryImageUrl`.

목록 API에 없는 값(regulatoryType, 설명 상태 등)은 목록에서 무리하게 만들지 않고 상세에서 표시한다.

---

## 6. 기본상품 상세 개선

`ProductMasterDetailPage.tsx` — 상품 관리 콘솔의 중심 화면으로 정리.

권장 섹션:

| 섹션 | 표시 내용 |
| --- | --- |
| 기본 정보 | 상품명, 공식명, 제조사, 브랜드, 규격, 원산지, 생성일 |
| 규제 정보 | regulatoryType, MFDS 검증 여부 |
| 식별자 | barcode (+ 추가 식별자는 후속 GET API 필요 표시) |
| 이미지 | 대표 이미지, 추가 이미지, 이미지 없음 상태 |
| 설명 | canonicalDescription (있으면 표시), draft/needs_review 후속 |
| 후보/원천 연결 | 후속 GET API 필요 표시 |
| 사용 상태 | O4O 주문/매장 취급 연결 후속 표시 |
| 관리 메모 | 후속 write 기능 자리 |
| 작업 이력 | 후속 audit log 자리 |

주의: 현재 상세 API에 없는 값은 backend를 크게 확장하지 않고 "후속 GET API 필요"로 명확히 표시한다. 이미 GET API에 있는 필드(`canonicalDescription` 등)는 표시한다.

---

## 7. 후보 데이터 화면 정리

후보 화면은 "정비 action" 화면이 아니라 "데이터 유입 확인" 화면으로 유지한다. 안내 문구:

```
공공데이터, import, 공급자/매장 입력 등에서 들어온 상품 후보를 확인합니다.
현재 화면에서는 후보를 승격하거나 삭제하지 않습니다.
```

후보 상세는 rawPayload 확인 유지. 버튼 금지: 승인/승격/삭제/병합/보관/반려.

---

## 8. 데이터 정비 탭

`ProductDbMaintenancePage.tsx`는 준비중 유지. 문구 조정:

```
데이터 정비 기능은 전체 주요 데이터 등록이 완료된 뒤 별도 WO에서 진행합니다.
현재는 상품 관리 콘솔 기반을 완성하는 단계이며, 승격/삭제/병합/bulk 작업은 제공하지 않습니다.
```

---

## 9. API 원칙

허용 (기존 GET):

```
GET /operator/product-candidates
GET /operator/product-candidates/:id
GET /neture/products/library/search
GET /neture/products/library/:id
```

후속 GET API 후보 (이번 WO 구현 불필요, 자리만):

```
GET /neture/products/library/:id/identifiers
GET /neture/products/library/:id/descriptions
GET /neture/products/library/:id/source-links
GET /neture/products/library/:id/usage-summary
```

---

## 10. 검증 기준

```bash
pnpm --dir apps/admin-dashboard type-check
pnpm --dir apps/admin-dashboard build:prod
git diff --check
```

프로덕션 smoke:

| 항목 | 기대 |
| --- | --- |
| `/admin/o4o-product-db` | 현황 화면 정상 |
| `/admin/o4o-product-db/overview` | 현황 화면 정상 |
| `/admin/o4o-product-db/masters` | 기본상품 목록 정상 |
| 기본상품 상세 | 관리 콘솔형 섹션 표시 |
| 후보 목록 | 기존 동작 회귀 없음 |
| 후보 상세 | rawPayload 확인 가능 |
| 데이터 정비 | 준비중 유지 |
| 네트워크 | 상품 DB 관련 GET only |
| mutation | 0 |
| backend/DB write | 0 |

> 배포 후 stale chunk 발생 시 fresh index 강제: `/login?cb=YYYYMMDD`

---

## 11. 완료 기준

| 기준 | 완료 조건 |
| --- | --- |
| 관리 콘솔 구조 | 기본상품 상세가 관리 섹션형으로 정리됨 |
| 기본상품 목록 | 관리자가 필요한 핵심 정보를 보기 쉬움 |
| 후보 화면 | 데이터 유입 확인용으로 정리됨 |
| 설명/이미지/로그 | 후속 기능 자리 마련 |
| 데이터 정비 | 준비중 유지 |
| write | 없음 |
| mutation | 0 |
| typecheck/build | 통과 |
| deploy/smoke | 통과 |

---

## 12. 다음 WO 후보

데이터 정비로 바로 가지 않는다. 다음 후보:

- `WO-O4O-ADMIN-O4O-PRODUCT-MASTER-DETAIL-GET-ENRICHMENT-V1` — 상세에 identifiers/descriptions/source links를 GET-only로 보강
- `WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-REVIEW-SHELL-V1` — 설명 검토 화면 read-only shell
- `WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-QUALITY-SHELL-V1` — 이미지 없음/대표 이미지 품질 확인용 read-only 화면

---

*Author: 사용자 초안 접수 → Claude Code 실행. GET-only / mutation 0 / frontend(admin-dashboard) 한정.*
