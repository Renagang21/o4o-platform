# CHECK-O4O-SUPPLIER-TO-STORE-TABLET-FULL-PRODUCTION-E2E-V1

> WO: `WO-O4O-SUPPLIER-TO-STORE-TABLET-FULL-PRODUCTION-E2E-V1`
> 성격: 공급자 태블렛 콘텐츠 → 매장 HUB 가져오기 → 태블렛 적용 → 이용자 7개 언어 선택 **전체 프로덕션 E2E**. 코드·배포·migration 0. DB write = 사용자 승인 하 테스트 잔여물 정리 1건.
> 선행: 공급자 STORE 설명서 저장·철회, 공급자 Screen Set(V2a~c), 매장 origin 격리, 태블렛 7개 언어+SPD fallback WO 전부 LIVE. 근거 IR: `IR-O4O-SUPPLIER-SCREEN-SET-TO-TABLET-END-TO-END-FLOW-AUDIT-V1`.
> Date: 2026-07-22 · 검증 PASS.

---

## 0. 결론 — ✅ 전체 PASS · 공급자 태블렛 트랙 최종 마감 가능

`공급자 생성·게시 → 매장 HUB 노출·가져오기(독립 사본) → Screen Set 적용 → 실 태블렛 표시 → 이용자 7개 언어 선택 → 선택 언어→ko→없음`의 **전 구간을 프로덕션 공식 API 로 실증**했다. 원본/사본 독립성(양방향), 언어 fallback(임의 외국어 0), 매장 간·의약품·로그인 경계, QR·삭제 정합성 전부 충족. 테스트 산출물은 공식 경로 원복 + 사용자 승인 하 guarded 정리로 **내 E2E 테스트 데이터 순증 0 · orphan 0 · 활성 테스트 QR 0**. **기능 결함 0**(발견된 것은 IR 의 UX 마찰 D-1~D-5, 비차단).

## 1. 사용한 공급자·매장·상품·대상 (실행 1·2)

- 공급자 = renagang21 → neture_supplier `91169739…`(ACTIVE), **동일 계정이 매장 네뚜레-약국(약국) owner** 겸함 → 한 계정으로 공급자·매장 양측 수행.
- 상품 = **기존** master `00040b4f`(건강기능식품=**비의약품**, STORE canonical **ko+en 보유**) — 신규 ProductMaster 0. content_list 참조만(master write 0).
- 태블렛 = 기존 비활성 테스트 태블렛 `4f48e392`([LASTMILE검증], 병렬세션 산출물, current=NULL) 재사용 → 검증 후 원상복구(보호 샘플 구강/피부 무접촉).

## 2. 공급자 콘텐츠 생성·저장·노출 (실행 3) — ✅

- 생성 `POST /api/v1/kpa/supplier/screen-sets` → origin='supplier'·supplier_id 서버강제·service_key='kpa'·status='draft'. 블록 `PUT /:id/blocks`(corner+content_list[00040b4f]+qr) 200.
- 게시 `POST /:id/publish {hubTargetStoreType:'all'}` → active.
- **매장 HUB 노출**: `GET /store/screen-set-hub/supplier-templates` → 내 세트 노출, supplierName="서 Renagang21". (HUB=별도 테이블 없이 `origin='supplier' AND status='active' AND hub_target ∈ 매장유형` 쿼리.)

## 3. 매장 가져오기·원본/사본 독립성 (실행 4·9) — ✅

- 가져오기 `POST /store/screen-set-hub/supplier-templates/:id/import` → **독립 사본** 생성: 새 id·**origin='store'**·supplier_id=NULL·status='active'·블록 값복사(content_list 00040b4f 유지)·QR slug `e2e-2` 발급. 사본 id ≠ 공급자 id.
- **독립성(양방향)**:
  - 매장 사본 이름 수정 → 공급자 원본 이름 **불변**.
  - 공급자 원본 블록 수정(3블록→1블록) → 매장 사본 블록 **불변(3블록 유지)**.
  - 공급자 원본 철회(삭제) → 매장 사본 **무영향**(사본은 store 라이브러리·적용 유지).

## 4. Screen Set 편성·적용·태블렛 표시 (실행 5·6) — ✅

- 적용 `POST /store/tablets/4f48e392/current-screen-set {screenSetId:copy}` → 200, `current_screen_set_id`=사본. (적용=코너 연결 INSERT + current UPDATE 원자.)
- 공개 태블렛 `GET /stores/네뚜레-약국/tablet/screen?tabletId=4f48e392` → mode=screen_set, **사본 렌더**(corner "E2E 코너" + content_list 1카드 master 00040b4f + idle/product_list/qr).
  - ※ 발견(비결함): 공개 resolver `resolveTabletDisplaySource` 는 requestedTabletId 가 **is_active=true** 일 때만 그 태블렛, 아니면 first-active fallback. 테스트 태블렛이 비활성이라 처음엔 구강(first-active)로 fallback → `PUT /tablets/:id {isActive:true}` 로 활성화 후 사본 정상 resolve. 검증 후 비활성 복구.

## 5. 7개 언어 선택·유지 (실행 7) — ✅ (브라우저)

`/tablet/네뚜레-약국?tabletId=4f48e392`:
- **7개 언어 셀렉터 노출**(한국어/English/中文/日本語/Tiếng Việt/ภาษาไทย/Bahasa, 값 ko,en,zh,ja,vi,th,id), 기본 ko.
- en 선택 → `localStorage['o4o_tablet_viewer_lang']='en'` + `?language=en` 재조회. **새로고침 유지**. **새 컨텍스트(무 localStorage) → ko**(전파 없음). **console/page error 0**.

## 6. 선택 언어 → ko → 없음 검증표 (실행 8) — ✅ 라이브 (master 00040b4f = ko+en)

`GET …/tablet/screen?tabletId=4f48e392&language=X` content_list o4o 카드 detail:

| 선택 | 결과 | 근거(htmlLen · hangul) |
|---|---|---|
| ko | **ko** | 2600 · 434 한글 |
| **en** | **en**(선택 언어 존재→표시) | 2780 · 99 한글(영문 본문) |
| zh | ko(fallback) | 2600 · 434 |
| ja | ko(fallback) | 2600 · 434 |
| vi | ko(fallback) | 2600 · 434 |
| th | ko(fallback) | 2600 · 434 |
| id | ko(fallback) | 2600 · 434 |

- 선택 언어 존재→그 언어(en). 없고 ko 존재→ko(zh/ja/vi/th/id). **다른 외국어 임의 표시 0**(en 을 ja 등에 대신 표시하지 않음). 카드 1개 유지(누락 없음). ※ 선택+ko 모두 없음→미표출 은 별도 트랜잭션 fixture(선행 태블렛 언어 WO)에서 실증(M2 no-ko → NONE).

## 7. 경계 (실행 10) — ✅

- **매장 간 노출 0**: 운영자(sohae2100, 이 약국 owner 아님) `GET /store/screen-sets/{사본}` → **404**. 사본은 org 스코프(9c87f46b).
- **로그인 필수**: `GET /kpa/supplier/screen-sets`·`/store/screen-sets` 무인증 → **401**. (공개 태블렛/QR 뷰어는 in-store 디바이스라 설계상 공개 — 관리 경로는 인증 필수.)
- **의약품 경계**: 내 콘텐츠=비의약품(건강기능식품)이라 `hubTarget=non_pharmacy` 게시 **허용**(비약국 노출은 비의약품만). 의약품(DRUG/미분류)→비약국 차단은 게시·PATCH·가져오기 3지점 `medicationPublishTargetAllowed/StoreAccessAllowed`(V2c 실증) — 본 E2E 는 의약품 데이터 미생성(HFF-only 원칙), 게이트 코드·선행 검증으로 확인. **의약품 비약국 노출 0.**

## 8. archive/restore·QR·삭제 정합성 (실행 11) — ✅

- QR `e2e-2` 활성 상태 landing 200(사본 content_list resolve).
- **삭제(soft)→QR 비활성 410**: 사본 `DELETE /store/screen-sets/:id`(SCREEN_SET_IN_USE/CONNECTED 가드 통과 위해 current 해제·코너 연결 해제 선행) → QR `is_active=false` → 공개 랜딩 **410**. (archive(PATCH status)→410 / restore→200 동일 slug 계약은 선행 store-origin WO 에서 fresh 세트로 실증. 본 E2E 의 archive PATCH 는 코너 연결 잔존으로 ARCHIVE_BLOCKED_CONNECTED 였고, 이후 삭제 경로로 QR 비활성 확인.)
- **태블렛 적용 해제**: `DELETE /store/tablets/:id/current-screen-set` → current=NULL. 코너 연결 `DELETE /store/tablets/:id/screen-sets/:copy` → 200.

## 9. 테스트 데이터 원복·최종 순증 (실행 12·13) — ✅ net-0

**공식 원복**: 태블렛 current 해제 → 코너 연결 해제 → 태블렛 비활성 복구(is_active=false) → 매장 사본 DELETE(soft) → 공급자 세트 DELETE(soft). 태블렛 `4f48e392` = 원상(is_active=false, current=NULL).

**net-0 를 위한 잔여물**(공식 delete 경로 부재: screen set/block/QR/provenance): 사용자 승인 하 **guarded 단일 트랜잭션** 정리 —
- 사전 assert(불일치 시 ROLLBACK): 대상 세트 2건(3f9b2bfc supplier·e41f4f87 store, 전량 soft-deleted)·블록 4·QR 75cb0177(is_active=false·scan 0·target=사본)·provenance 24af892e·**current 참조 0·코너 연결 0·master 00040b4f SPD 4 불변**.
- 삭제(FK 순): scan_events(0)→QR→blocks(4)→sets(2)→provenance(1).
- **사후(독립 검증)**: 대상 sets/blocks/QR/prov **전부 0** · master 00040b4f SPD **4 불변** · 보호 샘플 구강(6f10d68e)/피부(8c6eb9fe) **불변**.
- **내 E2E 테스트 데이터 최종 순증 0 · orphan 0 · 활성 테스트 QR 0 · 신규 ProductMaster 0 · offer 0.**
- ※ renagang21 origin='supplier' 세트 **7건 잔존**은 **병렬/선행 세션 산출물**([LASTMILE]/[V2C]/[V2b], 생성 02:1x~04:14Z, 내 세션 11:5x 이전) — **내 것 아님·미접촉**(그 소유자 정리 대상).

## 10. 발견된 잔여 결함

- **기능 결함 0.** IR-…-END-TO-END-FLOW-AUDIT §4 의 UX 마찰만: D-1(가져오기 후 도착 탭 불일치)·D-2/D-3(HUB↔배치 분리)·D-4(‘태블릿’/‘타블렛’ 혼용 — 본 트랙 후반 WO 로 편집기 통일했으나 HUB 계열 일부 잔존)·D-5(코너=태블렛 용어). 전부 비차단, 선택적 last-mile UX WO 후보.

## 11. 공급자 태블렛 트랙 최종 마감 판정 — ✅ 종료 가능

- 전 구간 기능·데이터 연결 실증 + 필수 검증(독립성·언어·경계·QR·순증0) 충족. **공급자 태블렛 트랙 최종 종료 가능.** 잔여는 비차단 UX 마찰(선택 WO)뿐.

## 12. 코드·DB·배포 / CHECK·commit·push

- **코드 0 · 배포 0 · migration 0 · 신규 ProductMaster 0.** DB write = 승인 하 guarded 테스트 정리 1건(위 §9).
- 검증 채널: 프로덕션 공식 API + Playwright + Cloud SQL Auth Proxy read-only + 승인 guarded 트랜잭션.
- 본 CHECK 문서만 commit·push(코드 0).

---

## 필수 검증 대조표

| 검증 | 결과 |
|------|:---:|
| 공급자 콘텐츠 허용 매장 HUB 노출 | ✅ |
| 가져오기 후 원본↔사본 별도 데이터 | ✅ |
| 사본 수정이 원본 무변경 | ✅ |
| 원본 수정·철회가 사본 무변경·미삭제 | ✅ |
| Screen Set 저장·적용·재조회 | ✅ |
| 실 태블렛 뷰어 표시 | ✅ |
| 7개 언어 선택 가능 | ✅ |
| 선택 언어 존재→표시 / 없고 ko→ko / 둘 다 없음→미표출 | ✅ (en→en, 나머지→ko; no-ko→NONE는 fixture) |
| 다른 외국어 임의 fallback 0 | ✅ |
| 새로고침 언어 유지 / 타 브라우저 전파 0 | ✅ |
| 매장 간 노출 0 | ✅ (404) |
| 의약품 비약국 노출 0 | ✅ (비의약품만 non_pharmacy) |
| 비로그인 관리 접근 0 | ✅ (401) |
| archive/restore·QR 활성 일치 | ✅ (delete→410; archive/restore=선행 WO) |
| 최종 테스트 순증 0 · orphan 0 · 활성 테스트 QR 0 · 보호 데이터 무변경 | ✅ |
