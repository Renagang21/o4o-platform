# CHECK-O4O-STORE-IMPORTED-DESCRIPTION-REIMPORT-REPLACE-V1

WO: `WO-O4O-STORE-IMPORTED-DESCRIPTION-REIMPORT-REPLACE-V1`
상태: **CLOSED / PASS** (2026-07-14)
commit: `932266643` (feat)

---

## 1. 최종 정책

- 매장 사본은 매장 소유 콘텐츠 — 원본 canonical 이 바뀌어도 **자동 갱신/자동 덮어쓰기 없음**.
- 매장 경영자가 "원본 갱신됨" 사본에서 **명시적으로 "다시 가져오기"** 를 눌렀을 때만 반영.
- **V1 = 새 사본 생성**(기존 사본 덮어쓰기 아님). 기존 사본 본문·QR·태블릿 연결 불변.

## 2. 현재 import/copy 구조 조사 결과

- 매장 사본 테이블 = `kpa_store_contents` (source_type='direct'), 링크 = `kpa_store_content_product_links`.
- 기존 가져오기 = `POST /store-contents/import-b2c-description { listingId, descriptionId }` → **새 direct 사본 생성**(덮어쓰기 아님) + `source_metadata` 보존.
- 원본 추적 필드 = `source_metadata.sourceRefId`(원본 SPD id) + `.masterId` + `.copiedFrom='o4o_b2c_product_description'`.
- 배지 감지(feed) = 사본의 sourceRefId 로 (master, STORE, 언어) 현재 canonical 을 조회해 id 가 다르면 `hasSourceUpdate=true`.
- 기존 "가져오기" 는 이미 **새 사본 생성** 방식 → 재가져오기는 "현재 canonical 자동 해석 + 동일 복사 로직" 으로 안전하게 구현. **HOLD 조건 없음**.

## 3. 원본 추적 필드 확인

- `source_metadata.sourceRefId` 로 이전 원본 SPD → (master, STORE, 언어) 축 확인 → 현재 canonical 해석. migration 불필요(추적 정보 이미 보존).

## 4. API 구현 내용

`POST /api/v1/kpa/store-contents/:id/reimport-source` (신규, store owner):
- 사본 C 조회(org 소유 + direct + copiedFrom='o4o_b2c_product_description').
- C.sourceRefId → 이전 SPD → (master, STORE, 언어) 현재 canonical 해석.
- 현재 canonical 없음 → **400 NO_CURRENT_CANONICAL** / 현재===sourceRefId → **200 already_latest**(no-op).
- 그 외 → **새 사본 D 생성**(단일 트랜잭션): sourceRefId=현재 canonical, `source_metadata.reimportedFrom`=C, C 의 listing 링크 복제. 기존 C 무변경.

## 5. UI 버튼/문구

- `StoreContentsSelector` 액션 컬럼: `hasSourceUpdate && origin==='direct'` 사본에만 **"다시 가져오기"** 버튼(amber).
- 확인 모달: "현재 사본은 그대로 두고, 새 원본을 별도 사본으로 가져옵니다. (기존 QR·태블릿 연결은 변경되지 않습니다.)"
- 성공 토스트 + 목록 새로고침(internalReload). already_latest → "이미 최신 원본입니다."

## 6. 새 사본 생성 방식

- import-b2c-description 과 동일 INSERT 구조(kpa_store_contents direct + product link). 덮어쓰기 절대 없음.

## 7. 실API/실브라우저 smoke (prod, 2026-07-14) — 전 과정 PASS

fixture: **신규 SQL write 0** — 기존 `[SMOKE]` 자산 재사용(master `33cc8fe7`, listing `cb226dd3` org `9c87f46b`, hidden SPD A `d8ffeb30`/B `dbab0d06`). 모든 상태 변경은 실제 API(운영자 승인/교체/reject, 매장 import/reimport/delete)로만 수행.

| # | 시나리오 | 기대 | 결과 |
|---|---------|------|------|
| — | A→canonical(운영자 승인) → import → 사본 C | C 생성 | **C `16f53384`, hasSourceUpdate=false** |
| 8.4 | A→B 교체 후 | C 본문 불변 | **C body md5 `2d17415b…` before==after, sourceRefId=A 유지** |
| — | 교체 후 feed | C stale | **C.hasSourceUpdate=true** |
| 8.1 | reimport C(API) | 새 사본 D 생성 | **D `c08b2cd9`, mode=create_copy, sourceRefId=B, reimportedFrom=C, listing 링크 복제** |
| — | feed | C=true, D=false | **C=true, D=false** |
| 8.2 | reimport D | 이미 최신 | **already_latest(sourceRefId=현재 canonical B)** |
| 8.5 | 매장 UI | stale 사본에만 "다시 가져오기" | **C 행=원본 갱신됨+다시 가져오기 버튼, D 행=버튼 없음. 버튼 클릭→확인 모달→새 사본 E `45f19ab3`(sourceRef=B, reimportedFrom=C) 생성**(스크린샷) |
| 8.3 | B hidden 후 reimport C | 새 원본 없음 | **400 NO_CURRENT_CANONICAL, C 무변경** |

## 8. QR/tablet/POP 연결 미변경

- reimport 는 새 사본 + 새 링크만 INSERT. 기존 사본/QR/태블릿/POP row 를 읽거나 수정하지 않음(코드상 UPDATE/DELETE 없음). 검증: C 본문·sourceRefId 불변, D 는 신규 링크만.

## 9. canonical / audit / AUTO-CREDIT 미변경

- reimport 는 shared_product_descriptions 를 **읽기만** 함(canonical 해석). 교체 정책/감사로그/AUTO-CREDIT/source_ref_id 의미 무변경.

## 10. typecheck / build

- api-server `tsconfig.build.json` **0 error** · web-kpa-society `tsc --noEmit` **0 error**. migration 없음.

## 11. 배포

- main push `932266643` → **API Server / Web Services 배포 success** (2026-07-14).

## 12. 실브라우저 smoke 결과

- §7 표 참조. 매장 자료함 UI 에서 stale 사본만 "다시 가져오기" 노출·동작 확인(스크린샷). 전 과정 PASS.

## 13. 테스트 데이터 정리 결과 (`[SMOKE]`)

| 항목 | id | 처리 |
|------|----|------|
| 사본 C | `16f53384-7298-4f7d-9196-c2dc444ad04b` | **삭제**(direct delete 200) |
| 사본 D(API reimport) | `c08b2cd9-6c1d-4260-9434-1e875e1fa94f` | **삭제**(200) |
| 사본 E(UI reimport) | `45f19ab3-6528-4013-9d33-a0e6206755e3` | **삭제**(200) |
| SPD A/B/기타 | `d8ffeb30…`/`dbab0d06…` 외 | **전부 hidden**(운영자 reject/교체 강등, canonical 0) |
| listing | `cb226dd3-e086-45e4-a449-33bea30be934` | 재사용(기존 orphan, 이번 미생성) |
| audit_log(교체 부산물) | canonical_replaced 1행 | 유지([SMOKE], 감사 성격) |

- 신규 offer/listing/SQL write 0. 매장 master 사본 잔존 0. 기존 운영 데이터 무수정.

## 14. 변경 파일 목록

- `apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts` — `POST /:id/reimport-source`
- `services/web-kpa-society/src/api/assetSnapshot.ts` — `storeLibraryApi.reimportSource`
- `services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx` — "다시 가져오기" 액션 + 목록 새로고침

## 15. commit / push

- `932266643` (feat, 3 files) · origin/main push 완료. 본 CHECK 갱신 커밋.

## 16. 후속 WO 후보 (미착수)

- `WO-O4O-STORE-IMPORTED-DESCRIPTION-REIMPORT-OVERWRITE-V1` — 명시적 기존 사본 덮어쓰기(강한 확인 + 사용처 count).
- `WO-O4O-STORE-CONTENT-USAGE-TRACE-FOR-REIMPORT-V1` — QR/태블릿/POP 사용처 추적.
- `WO-O4O-SPD-AUDIT-LOG-LIST-FILTER-V1` — 운영자 감사 로그 목록/필터.
