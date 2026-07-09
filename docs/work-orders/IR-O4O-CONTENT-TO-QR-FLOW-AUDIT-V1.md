# IR-O4O-CONTENT-TO-QR-FLOW-AUDIT-V1

> 상위 IR: `IR-O4O-QR-BUSINESS-FLOW-AUDIT-V1` §2-B (Content → QR)
> 조사 성격: **Read-only Audit** (코드 무변경)
> 작성: 2026-07-09 · Status: Audit Complete

## 업무: Content → QR

### 사용자의 목적
자료함의 콘텐츠 1건을 골라 그 콘텐츠로 안내되는 QR을 만든다.

### 현재 업무 흐름
- 목록 화면 `StoreLibraryContentsPage` (`/store/library/contents`) → 실제 목록은 `StoreContentsSelector`(`mode="page"`)가 담당.
- 콘텐츠 1건 선택 → 하단 `ActionBar`의 **"QR-code 만들기"** → `StoreQrCreateModal` 인라인 생성. **이 경로는 잘 연결되어 있음** (이 축은 4축 중 유일하게 직접 동선이 존재).
- 데이터 소스: `GET /store-library/contents` — 세 origin UNION (`snapshot`=`o4o_asset_snapshots` / `direct`=`kpa_store_contents` / `execution-asset`=`store_execution_assets`).
- 출처 탭(`SOURCE_TABS`): 전체 / 운영자 제공 / 커뮤니티 가져옴 / 내가 만든 콘텐츠 / AI 설명.

### 문제점 (단절 지점)
1. **작성 직후 단절** — `CreateContentFromResourcesModal` 저장 시 `/store/content/direct/:id`(상세)로 이동(`CreateContentFromResourcesModal.tsx:108`). 방금 만든 콘텐츠가 목록에 자동 선택돼 있지 않아, QR을 만들려면 **목록 복귀 → 행 체크 → QR 버튼 재클릭**이 필요. "저장 → QR" 원스톱 없음.
2. **상세/편집 화면에 QR CTA 부재** — `StoreDirectContentPage`(direct 상세), `StoreContentEditPage`(snapshot 편집) 어디에도 "이 콘텐츠로 QR 만들기" 버튼 없음. (편집 화면의 "QR 코드 표시" 체크박스(`:418-435`)는 *공개 페이지 노출 토글*일 뿐 QR 생성과 무관 — 오해 소지.)
3. **QR 진입은 목록 ActionBar 단 한 곳** — 다중 선택/미선택 시 disabled.

### 개선안 (최소)
| 개선안 | 활용 |
|------|------|
| 콘텐츠 상세(`StoreDirectContentPage`)·편집 화면에 **"QR 만들기" CTA 추가** → 기존 `StoreQrCreateModal` 오픈 | Front만, 기존 모달 재사용 |
| `CreateContentFromResourcesModal` 저장 후 착지 화면에 **"바로 QR 만들기"** 옵션 노출 | 화면 연결만 |
| 편집화면 "QR 코드 표시" 라벨을 "공개 페이지에 QR 표시"로 **명확화**(생성과 구분) | 문구 수정 |

### 기존 불변식과의 충돌 검토
- QR 비저장 ✅ / `/qr/{slug}` 경로 준수 ✅
- 가져오기=사본 ✅ (direct/execution은 이미 매장 소유)
- store_execution_asset 구조 ✅
- 중복 없음 (상세·편집 화면엔 QR 생성 Action 부재)

### 업무동선 점수 / 난이도
- 현재: 목록 경유 시 자연스러움 **중**, 작성 직후 경유 시 **낮음**(3단계·복귀 1회).
- 개선 후: **높음** (상세에서 1클릭).
- 난이도: **낮음** — Action 추가 + 문구 수정, **신규 기능 없음**.

### 후속 WO 방향
`WO-O4O-CONTENT-TO-QR-FLOW-IMPROVEMENT-V1` — 콘텐츠 상세/편집 QR CTA + 작성 후 원스톱 연결 + "QR 코드 표시" 라벨 명확화.
