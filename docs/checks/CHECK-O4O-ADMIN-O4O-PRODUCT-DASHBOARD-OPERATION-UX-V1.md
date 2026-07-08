# CHECK-O4O-ADMIN-O4O-PRODUCT-DASHBOARD-OPERATION-UX-V1

Status: DONE — 코드 완료 + typecheck/build 통과 + 프로덕션 브라우저 smoke PASS (2026-07-08)
WO: `WO-O4O-ADMIN-O4O-PRODUCT-DASHBOARD-OPERATION-UX-V1`

Scope: admin.neture.co.kr O4O 상품관리 **Overview(현황) Dashboard** 를 "DB 통계 조회" → "오늘 처리할 작업 중심 운영 화면"으로 개선. **Dashboard(ProductDbOverviewPage.tsx) 1파일만 변경.** 목록 화면·API·백엔드 무변경, 신규 통계 시스템 없음, DB write 0.

---

## 1. 현재 문제 확정 (조사)

`ProductDbOverviewPage.tsx` 진입 시 **26개 API 를 하나의 `Promise.all` 로 호출**하고 **전부 완료될 때까지 단일 `loading` 게이트로 첫 화면을 막음**:
- candidateCount × status 8 + matchStatus 7 + sourceType 9 = 24 + 총량 2 = **26 호출**.
→ 첫 페인트 지연의 직접 원인. 또한 화면이 숫자·DB용어(conflict/unmatched/possible) 위주라 "무엇을 해야 하는가"가 안 보임.

---

## 2. 개선 (최소 변경, 1파일)

### ① 성능 — 카드별 비동기 로딩(방향 A)
로드를 **2개 effect 로 분리**:
- **운영 섹션(오늘 처리할 작업 + 핵심 지표)**: 요약 API **6회만**(candidateTotal, masterTotal, conflict, unmatched, `description-status/summary`, `image-quality/summary`) → 즉시 표시.
- **세부 통계(26회)**: 별도 effect 로 **지연 로딩**(자체 skeleton), 첫 페인트를 막지 않음.
→ 첫 의미 있는 화면이 6호출로 뜨고, 무거운 분포는 뒤따라 채워짐. **새 통계 시스템/캐시 테이블 없이** 기존 요약 API 재사용으로 호출 수 26→6(상단).

### ② 운영 중심 용어
DB 상태값 → 관리자 용어 매핑(라벨+도움말):
- `conflict` → **충돌 · 확인 필요** / `unmatched` → **미매칭 · 신규 생성 대상** / `possible_*` → **유사 · 검토 필요** / `exact_identifier_match` → **식별자 정확 매칭** / `manually_matched` → **수동 매칭 완료** 등.
- 후보 상태·source_type 도 한글 운영 라벨로.

### ③ "오늘 처리할 작업" (최상단 우선 배치)
5개 작업 카드(우선순위 순), 각 카드 = 아이콘 + 작업명 + 건수 + 한 줄 설명 + 기존 목록 링크:
| 작업 | 이동(기존 목록) |
| --- | --- |
| 충돌 확인 | `/candidates?matchStatus=conflict` (딥필터 — candidates는 URL 필터 지원) |
| 설명 검토 | `/review` |
| OTC 초안 검토 | `/drug-description-drafts` |
| 이미지 없는 상품 | `/image-quality` |
| 신규 기본상품 생성 대상 | `/candidates?matchStatus=unmatched` |
- **0건이면 "처리할 항목이 없습니다" + 체크 아이콘**(완료 상태 표시).
- §3 준수: 목록 화면 무수정 → candidates 만 URL 딥필터, 나머지는 목록 진입(신규 API/필터 없음).

### ④ 핵심 운영 지표
기본 상품(ProductMaster) · 공공데이터 후보(ProductCandidate) · **공식 설명 보유율**(canonical/masterTotal, description-status summary 로 파생 — 추가 호출 없음).

### ⑤ 도움말(Tooltip)
의존성 없는 **CSS hover Tooltip**(`InfoTip` — HelpCircle ? + group-hover 팝오버, JS 상태 없음). 지표·매칭상태 등에 부착. AI 없이 화면 자체로 이해 가능.

### ⑥ AI Assistant
Overview 페이지는 AI 버튼을 렌더하지 않음(전역 플로팅 "AI 질문"은 별도 레이아웃 요소). **본 WO에서 AI 기능/배치 변경 없음**(§8 준수).

---

## 3. 제외 (WO 준수)

AI 기능 개선 / LLM prompt / merge·split / 재매칭 / 설명 생성 / 이미지 관리 / 새 통계 시스템 / 목록 화면 수정 — **전부 무접촉**.

---

## 4. 검증

| 항목 | 결과 |
| --- | --- |
| admin-dashboard typecheck | **에러 0** |
| admin-dashboard build | **EXIT 0** (`vite build`, ProductDbOverviewPage 청크 정상) |
| 변경 파일 | 1개 (ProductDbOverviewPage.tsx) — API/백엔드/목록/공통 컴포넌트 무변경 |
| DB write | **0** (GET-only 요약/목록 API 만 — 네트워크상 유일 POST=/auth/login) |
| 프로덕션 브라우저 smoke | **PASS** (admin.neture.co.kr, 2026-07-08, 서철환 admin) |

**smoke 상세 (PASS):**
- **점진 표시 확인**: 헤딩(오늘 처리할 작업/핵심 지표/세부 통계) 즉시 렌더 → 운영 섹션 카드가 먼저 채워지고 **세부 통계는 skeleton 유지하며 뒤이어 로딩**(첫 페인트 비차단).
- **오늘 처리할 작업 5카드**: 충돌 확인 244 / 설명 검토 3,215 / OTC 초안 검토 1,294 / 이미지 없는 상품 195,599 / 신규 기본상품 생성 대상 146,258 — 운영 용어+색상+설명.
- **핵심 운영 지표**: 기본 상품 198,389 / 공공데이터 후보 394,491 / **공식 설명 보유율 9%**(공식 17,877 / 기본상품 198,389 파생) + ? 툴팁.
- **세부 통계 운영 용어**: 접수 대기/자동 매칭됨/신규 기본상품 승인, 미매칭·신규 생성 대상/식별자 정확 매칭/충돌·확인 필요, CSV 가져오기/공공데이터·외부 API 등 한글 라벨 + 툴팁.
- **작업 카드 클릭 이동**: 충돌 확인 → `/candidates?matchStatus=conflict` (필터 적용 244건 목록) 정상.
- **네트워크**: 운영 6호출(candidates·library/search·conflict·unmatched·description-status/summary·image-quality/summary) **먼저**, 세부 통계 24호출 **뒤에** 별도 발생 → 분리 로딩 실증. 전부 GET, mutation 0. Console Error 없음(다중 인터랙션 정상 동작).

---

## 5. 완료 기준 대비

| 기준 | 상태 |
| --- | --- |
| Dashboard 최초 표시 속도 개선 | ✅ 상단 26→6 호출 + 세부 통계 지연 로딩 |
| 운영 중심 용어 | ✅ 매칭/상태/출처 한글 운영 라벨 |
| "오늘 처리할 작업" 구성 | ✅ 최상단 5카드 + 기존 목록 이동 |
| Tooltip 추가 | ✅ CSS hover InfoTip |
| 기존 기능 회귀 없음 | 목록/링크 유지, mutation 0 |
| typecheck/build | ✅ |
| CHECK / commit·push·deploy | ✅ (f622c1054, Cloud Run 배포 성공, smoke PASS) |
