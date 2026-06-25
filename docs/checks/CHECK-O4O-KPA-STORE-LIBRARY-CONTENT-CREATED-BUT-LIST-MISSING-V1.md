# CHECK-O4O-KPA-STORE-LIBRARY-CONTENT-CREATED-BUT-LIST-MISSING-V1

> 작업: **KPA 매장 — QR 선택기엔 보이나 `/store/library/contents` 목록엔 안 보이는 콘텐츠 정합 (A안: 목록 소스 확장)**
> 대상: `/store/library/contents` 문서형 목록 + `/store/marketing/qr` 콘텐츠 선택기
> 작업일: 2026-06-25 / 상태: **코드 완료 · typecheck PASS · 배포 `aeb84cdcf` · 운영 smoke 대기**

---

## 1. 증상 / 사용자 흐름

서Renagang21(renagang21@gmail.com)이 운영하는 **"테스트 약국"**(org `9c87f46b…`, KPA)에서:

1. 콘텐츠를 만들었다.
2. `/store/marketing/qr` 로 이동, QR 만들기에서 그 콘텐츠를 선택할 수 있었다.
3. 콘텐츠형 QR-code를 만들었다 (3건).
4. 그러나 `/store/library/contents` 목록에는 그 콘텐츠가 **보이지 않는다.**

콘텐츠형 QR 3건: 미백·광채·탄력 집중관리 세트 / 혈당·혈행·항산화 활력관리 3종 세트 / 역노화 피부관리 3종 세트.

---

## 2. 근본 원인 (DB read-only 역추적, cloud-sql-proxy)

QR 만들기 선택기와 콘텐츠 목록이 **서로 다른 데이터 소스**를 본다.

| 소스 | QR 만들기 "내 매장 자료" 선택기 | `/store/library/contents` 목록 |
|------|:--:|:--:|
| `store_execution_assets` (제작자료) | ✅ getStoreExecutionAssets | ❌ **제외** |
| `o4o_asset_snapshots` (cms/content) | ❌ | ✅ |
| `kpa_store_contents` (direct) | ❌ | ✅ |
| `kpa_contents` (운영자 콘텐츠) | ✅ listContentHubItems | ❌ |

**3개 콘텐츠형 QR 역추적 (DB 확정):** 세 QR 모두 `store_qr_codes.library_item_id` → `store_execution_assets.id` 참조.

| QR 제목 | library_item_id | 테이블 | asset_type | source_type | html |
|---|---|---|---|---|---|
| 미백·광채·탄력 집중관리 세트 | 955581bf… | store_execution_assets | content | generated | 있음 |
| 혈당·혈행·항산화 활력관리 3종 세트 | da85dbd0… | store_execution_assets | content | generated | 있음 |
| 역노화 피부관리 3종 세트 | 35fa2584… | store_execution_assets | content | generated | 있음 |

이 org의 콘텐츠 피드 소스 건수: snapshot(cms/content) **1**, direct **0**, **store_execution_assets(content) 3** ← 피드에서 누락.

→ `/store/library/contents` 피드(`store-library-feed.controller`)는 snapshot + direct 만 UNION 하고 `store_execution_assets` 를 제외하므로, "내 매장 자료" 선택기로 QR을 만든 제작 콘텐츠가 목록에 나타나지 않는다.

> QR은 `library_item_id` 로 자산을 **직접 참조** → 자산 삭제 시 QR 공개 URL 깨짐. 따라서 **삭제/이동 불가, 비파괴 노출**이 정답.

---

## 3. 수정 (A안 — 목록 소스 확장, 비파괴)

| 파일 | 변경 |
|------|------|
| `apps/api-server/.../store-library-feed.controller.ts` | snapshot+direct UNION 에 **`store_execution_assets`(asset_type='content', is_active) 브랜치 추가**. `origin='execution-asset'`, `content_json = jsonb_build_object('html', html_content)`, `sort_at=created_at`. data/count 쿼리 + search($4/$2) 양쪽. normalized origin 타입 확장. **KPA 전용 mount**(kpa.routes.ts:400) → GP/KCos 무영향 |
| `services/web-kpa-society/src/api/assetSnapshot.ts` | `LibraryContentOrigin` 에 `'execution-asset'` 추가 |
| `services/web-kpa-society/.../StoreContentsSelector.tsx` | `RowOrigin`/`DocSourceType` 확장. `toDocumentRow`: 원본유형 "매장 제작 자료", 작성자 "내 매장", href→`/store/library/production-materials`(전용 단건 뷰어 부재). 배지 "제작 자료"(보라). 액션 "열기". 제작 선택(`handleStart`) 시 `'execution-asset'`→canonical `'library'` 매핑(기존 production 흐름 재사용) |

- 신규 API/migration 없음. 원본 `store_execution_assets`·QR `library_item_id` **무변경**(비파괴). 데이터 삭제 0.
- 신규 빈작성 콘텐츠는 직전 작업(`dc22dfb1d`)으로 이미 direct 저장 → 본 작업은 **수정 전 만들어진 레거시 제작 콘텐츠의 목록 노출**을 해결.

---

## 4. 검증

| 검증 | 결과 |
|------|------|
| `web-kpa-society` tsc --noEmit | ✅ 오류 0 |
| `api-server` tsc --noEmit (store-library-feed) | ✅ 오류 0 |
| 운영 브라우저 smoke (renagang21 / 테스트 약국) | ⏳ 배포 후 |

### smoke 계획 (배포 후)
1. renagang21 로그인 → `/store/library/contents` → 3개 콘텐츠가 "매장 제작 자료 / 제작 자료" 배지로 표시되는지.
2. 행 "열기" → `/store/library/production-materials` 이동 + 본문 열람 가능.
3. `/store/marketing/qr` 3개 콘텐츠형 QR 유지 + 공개 URL(/qr/slug) 정상 렌더(자산 무변경).
4. 검색/페이지네이션 정합(UNION search 바인딩).
5. GP/KCos 무영향(피드는 KPA mount 전용).

---

## 5. 최종 판정

> QR "내 매장 자료" 선택기에서 선택 가능한 제작 콘텐츠(store_execution_assets content)가 `/store/library/contents` 목록에도 "매장 제작 자료"로 노출된다. 원본 자산·기존 QR 공개 URL은 무변경(비파괴). GP/KCos 무영향.

→ **코드 충족. 운영 smoke 확인 후 종료.**
