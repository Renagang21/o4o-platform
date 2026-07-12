# CHECK-O4O-KPA-TABLET-V1-TEST-CORNER-SCREEN-SET-SEED-V1

> WO: `WO-O4O-KPA-TABLET-V1-TEST-CORNER-SCREEN-SET-SEED-V1`
> 성격: 최종 점검용 **운영 테스트 데이터 seed** (관리 API 경로). 기존 구강관리 샘플 무접촉. 이 샘플은 **유지**(삭제 안 함).
> 선행(라이브): 태블릿 V1 전 체인 + FRESH-CORNER-SEED(구강관리) + DIRTY-GUARD. 실행일: 2026-07-12.

---

## 0. 결론

기존 구강관리 코너와 **별도**로 `피부관리 코너` 태블릿 + `피부관리 기본 화면 세트` + 블록 4개를 관리 API로 생성·적용. 공개 `/screen` screen_set + 뷰어 실화면(코너 헤더/QR) 확인. **기존 구강관리 샘플 불변.** V1 최종 smoke에서 두 코너 비교 가능.

## 1. 생성한 샘플 (persistent — 유지)

| 대상 | id / 값 |
|---|---|
| store_tablets | **`f8b78a16-2d8a-4b3a-9fa6-e03c0cbd96d9`** "피부관리 코너" (org 네뚜레-약국) |
| store_tablet_screen_sets | **`8c6eb9fe-5ab5-4ca5-8800-db486ed8e510`** "피부관리 기본 화면 세트" |
| templateKey | **corner_information_basic_v1** |
| store_tablet_screen_blocks | 4 (idle_media / corner_description / product_list / qr_guide) |
| current_screen_set_id | 적용됨 (피부관리 코너 → 위 세트) |

## 2. 사용한 API 흐름 (실제 운영 경로)

```
POST /store/tablets                              {name:'피부관리 코너', location}         → 201 tabletId
POST /store/screen-sets                          {name, tabletId, templateKey}            → 201 setId (templateKey=corner_information_basic_v1)
PUT  /store/screen-sets/:id/blocks               {blocks:[idle_media,corner_description,product_list,qr_guide]} → 200 (4)
PATCH /store/screen-sets/:id                     {status:'active'}                        → 200
POST /store/tablets/:tabletId/current-screen-set {screenSetId}                            → 200
```
> DB 직접 INSERT 없이 **관리 API 경로**로 생성(운영 흐름 검증 겸).

## 3. 블록 내용

| block | config 요지 |
|---|---|
| idle_media | custom_media image(placeholder `placehold.co/1920x1080`, 30s) |
| corner_description | title "피부관리 코너" + body(피부 보습/진정/자외선 안내 + "약사 등 전문인 문의" 주의 문구) |
| product_list | `{items:[]}` — 0건(기존 gate, 빈 목록 안전) |
| qr_guide | `{label:'모바일로 더 보기', url:'https://kpa-society.co.kr'}` (배포 계약 = label/url) |

## 4. 검증 결과 (production)

### 공개 `/tablet/screen?tabletId=` (피부관리)
- ✅ mode **screen_set**, templateKey **corner_information_basic_v1**
- ✅ sections **[idle_media, corner_description, product_list, qr_guide]**
- ✅ corner body "건조함, 민감함, 자외선…", product_list **0건**(크래시 없음), idle items 1

### 공개 뷰어 `/tablet/네뚜레-약국?tabletId=`
- ✅ h1 **"피부관리 코너"** + QR 배너 **"모바일로 더 보기"** 실제 표시. `/idle` 200, `/products` 200, console error 0.

### 기존 구강관리 코너 불변
- ✅ before/after 동일: mode screen_set, templateKey corner_information_basic_v1 (unchanged=true). current_screen_set_id·세트 무변경.

## 5. 금지 범위 준수

기존 구강관리 삭제·변경·current 변경 / DB migration / API 변경 / block_type·templateKey whitelist·새 템플릿 / public runtime / kiosk-core / 대량 데이터 / 상품 대량 연결 / OPL·service_key·Supplier 혼합 — **전부 없음.** 코너 1·세트 1·블록 4만.

## 6. 완료 기준 대비

- [x] 피부관리 코너 + 세트 + 블록 4 생성·적용
- [x] public /screen screen_set + templateKey corner_information_basic_v1 + 4 sections
- [x] product_list 0건 무크래시
- [x] 기존 구강관리 샘플 불변
- [x] CHECK commit/push

## 7. 최종 smoke에서 사용할 방법 (다음 WO)

`WO-O4O-KPA-TABLET-V1-FINAL-OPERABILITY-SMOKE-V1` 에서 **두 코너 비교**:
```
구강관리 코너  tablet c86863d8-c792-476c-b4b1-3aa1169a4395 / set 7280872e-00d1-4537-b4ef-ac2cef9cd7c1
피부관리 코너  tablet f8b78a16-2d8a-4b3a-9fa6-e03c0cbd96d9 / set 8c6eb9fe-5ab5-4ca5-8800-db486ed8e510
```
- 각 코너 공개 /screen·/idle·/products·뷰어 + templateKey · product_focus 전환(원복 전제) · dirty guard · 저장/적용/해제 의미 · console/network error 0. 두 샘플 모두 **유지**.
