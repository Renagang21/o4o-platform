# CHECK-O4O-KPA-STORE-LIBRARY-CONTENTS-EDIT-ROUTE-UNIFY-V1

> WO: `WO-O4O-KPA-STORE-LIBRARY-CONTENTS-EDIT-ROUTE-UNIFY-V1`
> 화면: `/store/library/contents` (KPA Society 매장)
> 작업일: 2026-06-26 / 범위: KPA (web-kpa-society)

---

## 1. 문제 / 목표

콘텐츠 목록의 [편집] 클릭이 유형별로 달랐다 — 일부는 편집기로 직행, **direct(매장 직접 작성)는
상세 보기(`/store/content/direct/:id`)로 이동 후 다시 [수정]을 눌러야** 편집기 진입.

목표: 모든 편집 가능 콘텐츠의 [편집] 은 상세 보기를 거치지 않고 **편집기로 직행**한다.

---

## 2. 선행 상태 (동시 세션 기 완료분)

직전 WO 들이 execution-asset / snapshot 의 [편집] 직행은 이미 처리한 상태였다:

| origin | 편집기 라우트 | 처리 WO |
|---|---|---|
| execution-asset | `/store/library/production-materials/:id/edit` | WO-...-EXECUTION-ASSET-EDIT-ACTION-V1 |
| snapshot | `/store/content/:id/edit` (StoreContentEditPage) | WO-...-SNAPSHOT-SINGLE-EDIT-V1 |
| **direct** | `/store/content/direct/:id` → **상세 보기(미직행)** | ← 본 WO 대상 |

액션 라벨은 이미 3종 모두 "편집" 으로 통일됨. **남은 불일치는 direct 뿐.**

---

## 3. 변경 (2 파일, 최소)

`direct` 는 자체 페이지(`StoreDirectContentPage`, 상세+수정 토글)를 쓰며 저장구조(kpa_store_contents
source_type='direct')가 snapshot/execution 과 달라 별도 라우트로 보낼 수 없다. 따라서 **direct 상세
페이지가 `?edit=1` 로 편집 모드 자동 진입**하도록 하고, 목록 링크에 `?edit=1` 을 부여한다.

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx` | `toDocumentRow` direct href `/store/content/direct/:id` → `/store/content/direct/:id?edit=1` |
| `services/web-kpa-society/src/pages/pharmacy/StoreDirectContentPage.tsx` | `useSearchParams` + 콘텐츠 로드 후 `?edit=1` 이면 `startEdit()` 1회 자동 호출(`autoEditRef` 가드) |

execution-asset / snapshot 경로는 **변경하지 않음**(동시 세션 결과 보존). 신규 라우트/API/migration 없음.

---

## 4. 동작

| origin | 목록 [편집] 클릭 | 결과 |
|---|---|---|
| direct | `/store/content/direct/:id?edit=1` | 상세 보기 거치지 않고 **편집 모드 즉시 진입** |
| execution-asset | `/store/library/production-materials/:id/edit` | 편집기 직행(기존) |
| snapshot | `/store/content/:id/edit` | 편집기 직행(기존) |

- `?edit=1` 없이 `/store/content/direct/:id` 직접 진입 시에는 기존 상세 보기 그대로(보기 흐름 보존).
- 자동 진입은 콘텐츠 로드 후 1회만(`autoEditRef`) — 사용자가 [취소] 하면 재진입하지 않음.

---

## 5. 검증 결과

| 항목 | 결과 |
|---|---|
| web-kpa-society `tsc --noEmit` | ✅ PASS |
| direct [편집] → 상세 보기 거치지 않고 편집기 진입 | ⏳ 배포 후 smoke |
| execution-asset / snapshot [편집] 직행 회귀 없음 | ⏳ |
| `?edit=1` 없는 상세 보기 직접 진입은 보기 모드 유지 | ⏳ |
| 저장 후 목록 복귀 정상 / PDF·QR·제작시작 선택작업 무영향 | ⏳ |

---

## 6. 제외 (WO 범위)

- 상세 보기 화면 자체 삭제 / UI 개편 / 삭제 정책·데이터 구조 변경 / 편집기 기능 추가 / PDF 수정.
- execution-asset·snapshot 라우팅(동시 세션 완료분) 재변경 없음.
