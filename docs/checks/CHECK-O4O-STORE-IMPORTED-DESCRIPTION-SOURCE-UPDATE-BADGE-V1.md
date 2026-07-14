# CHECK-O4O-STORE-IMPORTED-DESCRIPTION-SOURCE-UPDATE-BADGE-V1

> 매장이 가져간 O4O STORE 설명서 사본의 원본(canonical)이 교체/갱신되면 **"원본 갱신됨" 배지**만 표시. 사본 본문 자동 변경 없음.

## 1. 현재 매장 import 사본 구조 조사 결과

- 매장 가져오기(복사) = `POST /store-contents/import-b2c-description` → `kpa_store_contents`(source_type='direct') INSERT. `source_metadata` jsonb = `{ copiedFrom:'o4o_b2c_product_description', sourceRefId:<원본 SPD id>, masterId, copiedAt }`.
- 이 사본이 매장 UI 에 노출되는 곳 = **`GET /store-library/contents`**(`store-library-feed.controller.ts`, UNION 의 direct 브랜치) → 프론트 `services/web-kpa-society` `StoreLibraryContentsPage`/`StoreContentsSelector`.
- 참고: 프론트에는 현재 `import-b2c-description` 호출자가 없음(복사 흐름은 `...-DESCRIPTION-USAGE-POLICY-FIX-V1` 로 **읽기전용 뷰어**로 대체됨). "다시 가져오기" 진입선은 §7 참조.

## 2. 원본 추적 필드 존재 여부 → **보존됨**

- `source_metadata.sourceRefId` = 가져온 시점의 원본 SPD id 보존. `masterId`/`copiedAt` 보존.
- 교체(replace) 시 기존 canonical 은 `hidden` 으로 강등(삭제 아님) → 원본 SPD row 잔존, `language`/`master_id` 조회 가능.

## 3. migration 유무 → **없음**

- 원본 SPD id 가 이미 `source_metadata` 에 보존되어 있어 신규 컬럼/마이그레이션 불필요.

## 4. 원본 갱신 감지 기준 (§6.1 최선 기준)

- 사본의 `source_metadata.sourceRefId`(=원본 SPD id A) 로 원본 SPD 조회 → 그 row 의 `master_id`/`description_type`(=STORE)/`language`.
- 같은 `(master_id, description_type, COALESCE(language,'ko'))` 의 **현재 canonical** SPD id B 조회(partial-unique 상 최대 1건).
- `hasSourceUpdate = (B 존재 AND B.id != A)`. 교체 시 A=hidden, B=신규 canonical → id 상이 → true. 재승인(동일 row)이면 B=A → false. 감지 실패 시 false(안전).
- 구현: `store-library-feed.controller.ts` — direct 브랜치에 `source_metadata` select 추가(다른 브랜치는 `NULL::jsonb`), fetch 후 direct import 사본들의 sourceRefId 를 **1회 배치 쿼리**로 현재 canonical 과 비교 → `hasSourceUpdate` 주입. UNION/정렬/페이지네이션 구조 무변경.

## 5. API 응답 변경

- `GET /store-library/contents` item 에 `hasSourceUpdate: boolean` 추가(direct 이며 O4O b2c import 사본일 때만 true 가능, 그 외 false). 기존 필드 무변경.

## 6. UI 배지 표시 위치와 문구

- `StoreContentsSelector.tsx` 제목 컬럼(기존 "내 콘텐츠" direct 배지 옆)에 **`원본 갱신됨`** 배지(amber). tooltip: "원본 설명서가 갱신되었습니다. 현재 매장 사본은 자동으로 바뀌지 않습니다. 필요하면 새 원본을 다시 가져오세요."
- 위치 = 매장 자료함/콘텐츠 목록(`StoreLibraryContentsPage` → `StoreContentsSelector`). V1 은 이 1곳.

## 7. 새 원본 다시 가져오기 진입선 여부

- **V1 = 배지 + 안내(tooltip)만.** 재-가져오기 버튼은 **미구현**. 사유: 프론트 복사 흐름(`import-b2c-description` 호출)이 정책상 **폐기**(읽기전용 뷰어로 대체)되어, 재-가져오기 버튼 신설은 폐기 정책을 되살리는 것이라 별도 결정 필요. §7.3 허용(복잡 시 안내만)에 따름. → 후속 `WO-O4O-STORE-IMPORTED-DESCRIPTION-REIMPORT-REPLACE-V1` 로 분리.

## 8. 매장 사본 본문 불변

- 감지는 **읽기 전용**(조회 시 canonical 비교만). 사본 `content_json`/title/status 무수정. import writer·사본 테이블 write 없음.

## 9~10. 미변경 확인

- QR / product landing / tablet / store content write 무변경. canonical 승인/교체 정책 무변경. AUTO-CREDIT/source_ref_id 의미 무변경. 알림 없음.

## typecheck / build

- api-server `tsconfig.build.json` **0 error** · web-kpa-society `tsc --noEmit` **0 error**. **migration 없음.**

## 배포 결과

- main push `6467fb91d` → **API Server / Web Services 배포 success** (2026-07-14). **migration 없음**.
- 배포 확인: `GET /api/v1/kpa/store-library/contents` item 에 `hasSourceUpdate` 반영(기존 direct 13건 전부 `false` — negative 정상).

## 실브라우저 smoke 결과 (prod, 2026-07-14) — 전 과정 PASS

매장 경영자(renagang21=테스트 약국 매장) + 운영자(sohae2100). renagang21 토큰=supplier+store owner 겸용, 운영자 approve=admin 쿠키.
데이터: master `33cc8fe7` · offer `30ebefdd` · SPD#1(원본 canonical A) `2bf8f57c` · SPD#2(교체 후 B) `fd1c5a8e` · listing `cb226dd3` · 매장 사본 C `29ae7921`.

1. 원본 canonical A: 공급자 STORE#1→운영자 승인→canonical. ✅
2. 매장 import: A 를 `import-b2c-description`→사본 C(`source_metadata.sourceRefId=A`). ✅
3. 교체 전: C `hasSourceUpdate=false`(A=현재 canonical), 본문 캡처. ✅
4. canonical 교체: 공급자#2→운영자 replaceExisting→A `hidden`·#2 `canonical B`(replaced=true). ✅
5. 교체 후(API): C **`hasSourceUpdate=true`**(sourceRefId=A ≠ 현재 canonical B). ✅
6. 사본 본문 불변: C `content_json.html` = 교체 전과 **동일**(자동 변경 없음). ✅
7. UI: `/store/library/contents` 에서 C 행에 **`원본 갱신됨`** 배지(tooltip) 렌더, 다른 17행 배지 없음. ✅

## 테스트 데이터 정리 결과 (`[SMOKE]`)

| 항목 | id | 처리 |
|------|----|------|
| 매장 사본 C | `29ae7921` | **삭제**(200) |
| offer | `30ebefdd` | **삭제**(1) |
| SPD#1(원본 A) | `2bf8f57c` | **hidden**(교체 강등) |
| SPD#2(canonical B) | `fd1c5a8e` | **hidden**(정리 reject) |
| listing | `cb226dd3` | 잔존(remove 404·pending·offer0·`[SMOKE]` master → 무해 orphan) |
| master | `33cc8fe7` | 잔존(orphan `[SMOKE]`) |

## 변경 파일 목록

- `apps/api-server/src/routes/o4o-store/controllers/store-library-feed.controller.ts` — direct 브랜치 source_metadata + hasSourceUpdate 배치 감지
- `services/web-kpa-society/src/api/assetSnapshot.ts` — LibraryContentItem `hasSourceUpdate`
- `services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx` — DocumentRow `hasSourceUpdate` + `원본 갱신됨` 배지

## commit SHA / push / 완료 판정

- (기록)

## 후속 WO

- `WO-O4O-STORE-IMPORTED-DESCRIPTION-REIMPORT-REPLACE-V1` — 매장 경영자 명시적 재-가져오기/교체(폐기된 복사 흐름 재설계 포함).
- `WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-AUDIT-LOG-V1` — 교체 감사 로그.
