# CHECK-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1

> 대응 WO: `WO-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1`
> 실행일: 2026-07-09 · 성격: admin 제품 리스트/상세 → 설명서/QR 후속 작업 진입 동선 1차 연결.
> **제품 등록 0 / 설명서 생성 0 / QR 생성 0 / migration 0 / 대량 write 0.** read-only summary API 1건만 추가.

---

## 1. 작업 목적

제품 리스트/상세에서 **설명서(KO/ZH) 상태를 확인하고 설명 보기로 진입**할 수 있는 동선을 만든다. "만들기 버튼 = 실제 생성"이 아니라, 후속 작업으로 진입할 수 있게 하는 1차 연결 작업이다.

## 2. 조사한 화면/API/테이블

| 대상 | 결과 |
|---|---|
| admin `/admin/o4o-product-db/masters` (ProductMastersPage) | BaseTable + O4OColumn + RowActionMenu. 리스트 row에 설명서/QR 필드 없음 → 배치 요약 API 필요 |
| admin `/admin/o4o-product-db/masters/:id` (ProductMasterDetailPage) | 이미 `공식 소비자 설명`/`설명 후보` 섹션 존재(GET-only). descriptions[]에 status/language 보유 |
| `/admin/o4o-product-db/description-status` | 기존 master 설명 상태(canonical/needs_review/draft/none). **drug-OTC 튜닝 + language 분해 없음** → 재사용 부적합 |
| `/admin/o4o-product-db/masters/:id/usage-links` | QR은 `notMapped: qr_direct` — **master↔QR 직접 매핑 테이블 없음** |
| `shared_product_descriptions`(SPD) | master_id + `language`(default ko) + status. ko/zh 집계 가능 |
| `store_multilingual_product_content_*` | 매장 다국어 콘텐츠 = **store-scope**(admin master 레벨 대상 아님) |
| store handled-products | DISPLAY-POOL-SIMPLIFY 베이스라인으로 상태 컬럼 제거됨 → 상태 badge 부착 대상 아님 |

## 3. 구현한 상태 badge

- ProductMastersPage 리스트에 **`설명서` 컬럼** 신설 — `KO [있음/검토/초안/없음]` · `ZH [...]` pill. 톤: canonical=green, needs_review=amber, candidate=blue, 없음=gray. (기존 imageStatus pill 스타일 준수)
- ProductMasterDetailPage `설명 후보` 섹션 상단에 **KO/ZH 상태 요약 + QR 후속 표식**.

## 4. 구현한 row/detail action

- 리스트 RowActionMenu: `상세 보기`(기존) + **`설명 보기`**(SPD id로 `/admin/o4o-product-db/review/:id` deep-link, id 없으면 hidden) + **`QR 연결 (후속 WO)`**(disabled).
- 상세: 각 설명 항목 + KO/ZH 요약에 **`보기`** deep-link(review/:id).

## 5. 연결한 기존 화면/API

- 설명 보기 → 기존 설명 검토 화면 `/admin/o4o-product-db/review/:id` (신규 화면 생성 없음).
- 상태 조회 → 신규 read-only `GET /api/v1/admin/o4o-product-db/masters/description-qr-summary?ids=` (배치, 최대 100, N+1 회피).

## 6. 구현하지 않은 액션과 사유 (후속 WO 분리)

| 미구현 | 사유 |
|---|---|
| 설명서 **만들기** | admin에 설명서 생성 편집기 destination 없음(전 화면 GET-only 큐레이션). |
| QR **만들기/보기** | admin QR 화면·route **전무** + master↔QR 직접 매핑 없음(store-scope). 표시 자리만(disabled). |
| ZH 매장 다국어 콘텐츠 상태 | `store_multilingual_product_content_*`는 store-scope → admin master 레벨에서 미집계. |
| locale 표준화(zh vs zh-CN) | 이번엔 읽기 호환만(zh* 접두 = zh 버킷). |

→ 후속: `WO-O4O-PRODUCT-UNIT-MULTILINGUAL-DESCRIPTION-QR-LINK-V1`, `WO-O4O-PRODUCT-UNIT-DESCRIPTION-DRAFT-GENERATION-V1`, `WO-O4O-PRODUCT-UNIT-LOCALE-STANDARDIZATION-V1`.

## 7. read-only API 추가 여부

- 추가함: `product-description-qr-summary.controller.ts` (read-only, SELECT-only, ADMIN 롤셋, ids parameterized `ANY($1::uuid[])`). 기존 drug 튜닝 서비스 미변경.

## 8. DB migration 없음 여부

- **migration 0.** 스키마 변경 없음. 기존 `shared_product_descriptions` join/lookup만.

## 9. 제품 등록/설명서 생성/QR 생성 없음 여부

- 제품 등록 0 · 설명서 생성/수정 0 · QR 생성 0 · 대량 write 0. 모든 신규 경로 GET-only.

## 10. typecheck/build/smoke 결과

- **admin-dashboard typecheck**: exit 0, error 0.
- **api-server typecheck** (`tsc -p tsconfig.build.json --noEmit`): exit 0, error 0.
- **admin-dashboard build** (`vite build`): exit 0 (35s).
- **browser smoke**: 배포 후 검증 (본 CHECK 하단 갱신). 신규 백엔드 엔드포인트는 배포 후 활성.

## 11. QR 정책 정합성

- 기존 QR 4축 Audit `상품당 QR 1개 + 언어탭(B-1)` 정책과 충돌 없음 — 언어별 QR 다중 생성하지 않음. QR은 상태 자리만 + 후속 WO.

## 12. 후속 WO 제안

- `WO-O4O-PRODUCT-UNIT-MULTILINGUAL-DESCRIPTION-QR-LINK-V1` (QR↔다국어 콘텐츠 브리지 + QR 액션 실연결)
- `WO-O4O-PRODUCT-UNIT-DESCRIPTION-DRAFT-GENERATION-V1` (설명서 만들기 destination)
- `WO-O4O-PRODUCT-UNIT-LOCALE-STANDARDIZATION-V1` (zh/zh-CN 표준화)
- `WO-O4O-PRODUCT-MFDS-ADMIN-DISPOSITION-CHECK-PIPELINE-V1` (행정처분/회수 상태 실판정 — 현재 표시 자리만)

## 변경 파일

```
apps/api-server/src/modules/neture/controllers/product-description-qr-summary.controller.ts  (신규)
apps/api-server/src/bootstrap/register-routes.ts                                             (route 등록)
apps/admin-dashboard/src/api/o4o-product-db.api.ts                                           (client fn+type)
apps/admin-dashboard/src/pages/o4o-product-db/ProductMastersPage.tsx                          (badge+action)
apps/admin-dashboard/src/pages/o4o-product-db/ProductMasterDetailPage.tsx                     (KO/ZH+보기)
docs/checks/CHECK-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1.md                               (신규)
```
