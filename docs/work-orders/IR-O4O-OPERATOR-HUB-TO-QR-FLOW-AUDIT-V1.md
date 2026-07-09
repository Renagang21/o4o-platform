# IR-O4O-OPERATOR-HUB-TO-QR-FLOW-AUDIT-V1

> 상위 IR: `IR-O4O-QR-BUSINESS-FLOW-AUDIT-V1` §2-D (Operator Hub → QR)
> 조사 성격: **Read-only Audit** (코드 무변경)
> 작성: 2026-07-09 · Status: Audit Complete
> **주의: 4축 중 가장 복잡하며 정합성(규칙 불일치) 이슈가 있음.**

## 업무: Operator Hub → QR

### 사용자의 목적
운영자가 Hub에 게시한 자산(QR 템플릿 / 콘텐츠)을 매장이 가져와 QR로 활용한다.

### 현재 업무 흐름 — **문(door)이 3개, 규칙이 서로 다름**

| # | 진입 문 | 대상 | QR 가능? | 사본 처리 |
|:-:|------|------|:---:|------|
| 1 | **매장 HUB QR 라이브러리** `/store-hub/qr` (`HubQrLibraryPage`) → `importOperatorQr` | 운영자 **QR 템플릿**(`operator_qr_templates`, published) | ✅ | `POST /stores/:slug/qr/staff/import` → 매장 소유 `store_qr_codes` 사본 생성 (`qr.controller.ts:120`) |
| 2 | **StoreQRPage "QR 만들기"** 셀렉터의 `enableContentHubSource` | 운영자 **콘텐츠**(`kpa_contents`, content-hub) | ✅ | `landingType='page'` + `ensureStoreCopyForPageTarget` 사본 가드 → 매장 사본 참조 (`qr-content-hub-copy.service.ts:68`) |
| 3 | **자료함 목록**(`/store/library/contents`)에서 운영자 제공 **snapshot(cms)** 선택 | 운영자 콘텐츠 snapshot(`o4o_asset_snapshots`) | ❌ | `qrEligible` 거부 → "가져온 콘텐츠는 QR 대상 아님" 안내만 |

### 문제점 (단절 지점) — **핵심: 동일 대상에 대한 규칙 불일치**
1. **정합성 모순** — *같은 운영자 콘텐츠*가 문 #2(StoreQRPage 셀렉터)로는 QR이 되는데, 문 #3(자료함 목록 snapshot)으로는 QR이 안 됨. 사용자는 "운영자 콘텐츠를 가져왔는데 여기선 QR이 되고 저기선 안 된다"는 혼란을 겪음.
2. **진입점 분산** — QR 템플릿은 `/store-hub/qr`, 운영자 콘텐츠는 StoreQRPage 셀렉터, 가져온 snapshot은 자료함. "운영자 Hub에서 가져와 QR" 이라는 하나의 업무가 3개 화면에 흩어져 있음.
3. **왕복 단절** — Hub에서 가져온 뒤(문 #1/#3) QR을 만들려면 다시 QR 메뉴를 찾아가야 함(자료함 snapshot의 경우 아예 막힘).

### 개선안 (최소~중간)
| 우선순위 | 개선안 | 활용 |
|:-:|------|------|
| 1 | **자료함 snapshot(cms/content)에서도 QR 허용** — 선택 시 문 #2의 `ensureStoreCopyForPageTarget` 사본 가드를 태워 매장 사본 후 QR. 문 #3의 dead-end 제거로 #2/#3 규칙 통일 | 기존 copy-guard 재사용. snapshot→원본(`kpa_contents`) id 해석 경로 확인 필요 → **Backend 소폭 확장** |
| 2 | `/store-hub/qr` 가져오기 완료 화면에서 **바로 매장 QR 목록/출력으로 연결** | 화면 연결 |
| 3 | "운영자 Hub → QR" 진입을 **QR 화면 한 곳으로 안내** (셀렉터 소스 탭이 이미 content-hub 지원) | 메뉴/문구 정리 |

### 기존 불변식과의 충돌 검토
- QR 비저장 ✅ / `/qr/{slug}` ✅
- **가져오기=사본**: ⭐ 개선안 1은 반드시 `ensureStoreCopyForPageTarget`를 경유해야 함(운영자 원본 직접 참조 금지, `author_role='operator' AND status='published'` 검증). 이를 지키면 불변식 준수, 어기면 위반. **WO에서 최우선 가드**.
- store_execution_asset 구조 ✅ (사본은 `assetType='content'`, `sourceType='generated'`로 생성).
- **중복 검토**: 문 #2와 개선안 1이 같은 copy-guard를 공유하므로 중복 로직 아님(단일 경로로 수렴).

### 업무동선 점수 / 난이도
- 현재: 자연스러움 **낮음**(문 3개·규칙 불일치·snapshot dead-end), 끊김 다수.
- 개선 후: **중~높음**(경로 통일).
- 난이도: **중간** — 개선안 1은 **Backend 소폭 확장**(snapshot→원본 해석 + 기존 copy-guard 연결), 나머지는 Front. **신규 QR 화면·신규 QR API 불필요**, 단 snapshot QR 허용은 **별도 WO 권장**(불변식 게이트 검증 필요).

### 후속 WO 방향
`WO-O4O-OPERATOR-HUB-TO-QR-FLOW-IMPROVEMENT-V1` — 자료함 snapshot QR 허용(copy-guard 경유) + 진입 경로 통일. 불변식 게이트 우선 검증.
