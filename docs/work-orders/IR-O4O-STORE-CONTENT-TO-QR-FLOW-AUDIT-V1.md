# IR-O4O-STORE-CONTENT-TO-QR-FLOW-AUDIT-V1

> 상위 IR: `IR-O4O-QR-BUSINESS-FLOW-AUDIT-V1` §2-C (Store Content → QR)
> 조사 성격: **Read-only Audit** (코드 무변경)
> 작성: 2026-07-09 · Status: Audit Complete

## 업무: Store Content(매장 제작 콘텐츠) → QR

### 사용자의 목적
매장이 직접 만든 콘텐츠(직접 작성 `kpa_store_contents` / 제작 자료 `store_execution_assets`)로 QR을 만든다.

### 현재 업무 흐름
- 자료함 목록의 세 origin 중 **`direct`(매장 직접 작성) + `execution-asset`(매장 제작 자료)** 가 대상.
- `qrEligible = origin === 'direct' || origin === 'execution-asset'` (`StoreContentsSelector.tsx:338`) → **이 두 유형은 QR 생성 가능**. 목록에서 선택 → "QR-code 만들기" → `StoreQrCreateModal`.
- `StoreQrCreateModal.handleSave`: `execution-asset` → `libraryItemId`(사본 참조), `direct` → `landingTargetId`(content_json). 이미 매장 소유이므로 별도 사본 불필요.

**→ 이 축은 기술적으로 완성도가 가장 높음.** 매장 제작 콘텐츠는 QR 대상 자격을 갖추고 인라인 생성이 동작함.

### 문제점 (단절 지점)
1. **작성 직후 원스톱 부재** (축 B와 동일) — 매장 직접 작성 저장 → direct 상세로 이동, QR로 자동 연결 안 됨.
2. **제작 자료(execution-asset) 편집 화면(`/store/library/production-materials/:id/edit`)에 QR CTA 없음** — 제작 자료를 만들고 나서 QR을 만들려면 자료함 목록으로 나와 재선택해야 함.
3. **진입 산개** — 매장 제작 콘텐츠는 자료함 목록에서만 QR 진입. 제작 카탈로그(`productionTargets`)·POP 화면 등에서 QR로 오는 통일된 동선은 부분적.

### 개선안 (최소)
| 개선안 | 활용 |
|------|------|
| 제작 자료·직접 콘텐츠 **편집/상세 화면에 "QR 만들기" CTA** | 기존 `StoreQrCreateModal` 재사용, Front만 |
| 작성/제작 완료 화면에서 **QR 이어가기** | 화면 연결만 |

### 기존 불변식과의 충돌 검토
- QR 비저장 ✅ / `/qr/{slug}` ✅
- **사본 가드**: direct/execution은 이미 매장 소유라 원본→사본 가드 트리거 안 됨(정상) ✅
- store_execution_asset 구조: `library_item_id`(uuid) 참조 유지 ✅
- 중복 없음

### 업무동선 점수 / 난이도
- 현재: 목록 경유 **중~높음**, 작성 직후 **낮음**.
- 개선 후: **높음**.
- 난이도: **낮음** — Action 추가·화면 연결. **신규 기능/API/DB 변경 없음**.

### 후속 WO 방향
`WO-O4O-STORE-CONTENT-TO-QR-FLOW-IMPROVEMENT-V1` — 제작 자료/직접 콘텐츠 편집·상세 QR CTA + 제작 완료 원스톱 연결. (축 B WO와 통합 가능.)
