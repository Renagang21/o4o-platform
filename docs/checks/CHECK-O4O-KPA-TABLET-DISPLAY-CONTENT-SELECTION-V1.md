# CHECK — KPA 타블렛 진열 콘텐츠 선택 V1

> **WO:** WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1
> **선행:** CONTENT-LINK-V1 / CONTENT-ACTIONS-V1 (콘텐츠 연결 + by-product)
> **작성일:** 2026-06-27

---

## 1. 사전 조사 결과 (WO §4) — 구조 finding + 사용자 결정

조사 결과 선행 IR 전제와 **실제 구조가 달랐다**:

- **타블렛 진열 구성 테이블** `store_tablet_displays`(설정 UI 가 관리)는 **공개 kiosk 와 연결되어 있지 않다.**
  공개 `/api/v1/stores/:slug/tablet/products` 는 supplier=**채널 게이트**(organization_product_channels + channel_type=TABLET),
  local=**전체 active** 를 반환한다. `store_tablet_displays` 의 유일한 런타임 reader 는 스토어 측 관리 API 뿐이다.
- 공개측은 **"스토어 첫 active tablet"** 단일 뷰 모델(idle 엔드포인트 `store_tablets … ORDER BY created_at ASC LIMIT 1`,
  주석: device pairing 도입 시 per-tablet 진화).

→ §4 가드대로 범위 확대 전 **보고 → 사용자 결정: "전체 WO — attach 방식"**.

**채택안(attach, 재배선 없음):** 공개 제품 집합은 그대로 두고, 첫 active tablet 의 `store_tablet_displays.content_id`
→ `kpa_store_contents` 를 LEFT JOIN 으로 **attach**. 링크 유효 시에만 노출.
- local: 선택이 항상 공개 반영(전체 active 노출).
- supplier: 제품이 채널 가시 상태일 때만 반영(독립 게이트) — 문서화된 한계.

---

## 2. 변경 (커밋)

| Phase | 파일 | 커밋 |
|---|---|---|
| P1-2 | migration `20261129000000-AddContentIdToStoreTabletDisplays` + StoreTabletDisplay 엔티티 + store-tablet.routes(저장/검증/목록) | `ce204d9e2` |
| P3 | store-public-utils(supplier, TABLET 한정) + store-public-tablet.handler(local) attach | `b670b6ba1` |
| P4-5 | tabletDisplays client + StoreTabletDisplaysPage 드롭다운 + tablet-kiosk-core(공유) 렌더 | `aa1dda2ec` |

## 3. DB

`store_tablet_displays.content_id UUID NULL` → `kpa_store_contents(id)` **ON DELETE SET NULL**
(콘텐츠 삭제 시 진열 유지 + 선택 자동 해제). 인덱스 `IDX_store_tablet_displays_content`.
기본/대표 컬럼(is_default 등) **없음**.

## 4. 저장 검증 (WO §6)

`PUT /tablets/:id/displays` 진열별 optional `contentId`. 검증:
같은 org + 해당 제품에 `product_description` 으로 실제 연결 + `product_source_type/id` 정확 일치
(supplier↔listing / local↔local). 미연결/타제품/타조직/삭제 콘텐츠 **400** 차단. `contentId:null` = 선택 해제.

## 5. 설정 UI (WO §8)

StoreTabletDisplaysPage 진열 항목별 **"표시할 설명 콘텐츠"** 드롭다운:
by-product 후보(제목·상태·최근수정일), "설명 콘텐츠 선택 안 함" 기본, **1개여도 자동선택 안 함**,
연결 없으면 "이 제품에 연결된 콘텐츠가 없습니다." unlink 된 선택은 후보 로드 후 자동 해제(저장 400 방지).
listing/local/UUID 미노출.

## 6. 타블렛 표시 (WO §9)

공개 응답에 `selectedContentId/Title/Html` attach. kiosk(tablet-kiosk-core, 공유) 상세 뷰에서
선택 콘텐츠가 있으면 **제목+본문**을 기존 `ContentRenderer`(DOMPurify sanitize) 로 표시, 없으면 기존 description/summary.
콘텐츠 삭제(content_id SET NULL) / 연결 해제(링크 join 실패) 시 **자동 폴백**.
공유 패키지 변경 additive — GP/KCos 는 `selectedContent` 미주입 → 동일 동작.

## 7. 비범위 확인 (WO §10)

기본 상세설명 지정 / 자동 선택 / 우선순위·정렬 / B2C 복사 / 다중 선택·슬라이드 / 제품 원본·주문 변경 — **없음**. ✅

## 8. typecheck

| 대상 | 결과 |
|---|---|
| api-server | **PASS** |
| web-kpa-society | **PASS** |
| web-glycopharm | **PASS** |
| web-k-cosmetics | **PASS** |

## 9. API smoke — lifecycle **ALL PASS** (2026-06-27, prod, renagang21)

임시 tablet/product/content 로 전 라이프사이클 검증 → 삭제(정리 완료).

| 검증 | 결과 |
|---|---|
| `PUT /tablets/:id/displays` 진열별 contentId 저장 → 200, 응답 contentId 반영 | ✓ |
| `GET /tablets/:id/displays` → contentId / contentTitle / **contentSourceType=direct** / contentStatus | ✓ |
| 미연결 콘텐츠 contentId → **400 VALIDATION_ERROR** (org+링크+제품 일치 검증) | ✓ |
| contentId=null → 선택 해제, GET contentId null | ✓ |
| 콘텐츠 삭제 → 진열 유지 + `content_id` **SET NULL**(FK) + 제품 row 유지 | ✓ |
| 공개 `/stores/:slug/tablet/products` 쿼리 정상 실행 + 선택 해제/삭제 시 selectedContent **null 폴백** | ✓ |

**공개 POSITIVE attach(selectedContent SET):** 코드 RCA 검증 + 쿼리 구조 라이브 검증 완료.
공개측은 설계상 **"스토어 첫 active tablet"** 기준(idle 엔드포인트와 동일 관례)이라, 라이브 positive 확인은
실 first-active tablet("화장품 코너", 운영 데이터) 변경이 필요 → **실 데이터 보호를 위해 라이브 positive smoke 보류**.
1차 smoke 의 2건 미스는 신규(비-first) tablet 사용에 따른 **테스트 아티팩트**(코드 정상).

## 10. browser smoke — **보류 (실 운영 데이터 보호)**

설정 UI("표시할 설명 콘텐츠" 드롭다운) + kiosk 렌더는 정적·타입 검증 완료(4패키지 PASS).
라이브 통합(설정 → 공개 kiosk) 검증은 스토어의 **실 first-active tablet("화장품 코너", 운영 데이터)** 에
진열·선택을 주입해야 하므로, **실 운영 데이터 변경 회피를 위해 보류**. 별도 검증 tablet/환경 확보 시 수행.

## 11. 후속

`WO-O4O-KPA-O4O-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1`.
(별도 검토 후보: store_tablet_displays ↔ 공개 kiosk 제품 집합 정합 — 채널/진열 이원화 해소.)

---

## 상태

- 구현 / typecheck(api-server + web-kpa/glyco/kcos): **완료**
- 배포: `ce204d9e2`/`b670b6ba1`/`aa1dda2ec` → API/Web success, migration(content_id) 적용
- API smoke: **lifecycle ALL PASS** (공개 positive attach = 코드 RCA, 실 데이터 보호로 라이브 보류)
- 데이터 정리: **완료** (임시 tablet/product/content 삭제)
- browser smoke: **보류** (실 운영 first-active tablet 변경 회피)
- 비범위 가드 충족. 공개 kiosk ↔ store_tablet_displays 제품 집합 정합은 별도 검토(§11).
