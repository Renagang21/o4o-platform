# IR-O4O-KPA-STANDARD-TABLE-CYCLE1-COMPLETION-AUDIT-V1

> **조사 일자**: 2026-05-26  
> **목적**: KPA 표준 테이블 정비 1차 사이클 완료 상태 고정  
> **결과**: 코드 변경 없음 (완료 상태 기록 전용)

---

## 1. 1차 사이클 범위 요약

KPA 4개 영역 14개 화면에 걸쳐 카드형 UI → 표준 테이블(`@o4o/ui DataTable` + `BaseTable` + `ActionBar`) 전환을 완료했다.  
선행 조사(IR) → WO 구현 → smoke 검증 순으로 진행했다.

---

## 2. 완료 커밋 목록

| 커밋 | 작업 | 대상 |
|------|------|------|
| `431aa7f3d` | IR — 표준 테이블 전환 대상 조사 | IR-O4O-KPA-STANDARD-TABLE-LIST-AUDIT-V1 |
| `55fd50105` | WO — 운영자 Blog/POP/QR 표준 테이블 | OperatorBlogListPage, OperatorPopListPage, OperatorQrListPage |
| `5a4518da0` | WO — 매장 HUB Blog/POP/QR 표준 테이블 | HubBlogLibraryPage, HubPopLibraryPage, HubQrLibraryPage |
| `325b00435` | WO — 내 매장 Blog/POP/QR 표준 테이블 | PharmacyBlogPage, PharmacyPopPage, StoreQRPage |
| `4f54fbec1` | WO — 자료함 목록 표준 테이블 | StoreLibraryResourcesPage |
| `fb0af1979` | WO — 상담 요청 표준 테이블 | TabletRequestsPage |
| `4f419e298` | WO — 태블릿 목록 표준 테이블 | StoreTabletDisplaysPage |
| `7d89a32fb` | IR — StoreContentsSelector DataTable 방향 조사 | IR-O4O-KPA-STORE-CONTENTS-SELECTOR-STANDARDIZATION-V1 |
| `69c75b620` | WO — StoreContentsSelector DataTable 교체 | StoreContentsSelector (자료함 콘텐츠 선택) |
| `bae565ac5` | IR — StoreAssetsPanel BaseTable 선택 활성화 방향 조사 | IR-O4O-STORE-ASSET-POLICY-CORE-DATATABLE-V1 |
| `0f452ffec` | WO — StoreAssetsPanel Regular section BaseTable 선택 + ActionBar | `@o4o/store-asset-policy-core` + KPA + GlycoPharm |
| `03a62df47` | FIX — StoreAssetsPanel _select 컬럼 보완 | BaseTable body checkbox 렌더링 누락 수정 |
| `b2615dfce` | IR — /store-hub FOUH 원인 조사 | IR-O4O-KPA-STORE-HUB-SESSION-LOSS-AUDIT-V1 |
| `202cd3b8a` | FIX — FOUH 1차 방지 | KpaGlobalHeader `isAuthenticated={isLoading \|\| !!user}` |
| `cbcc8dbff` | FIX — FOUH 완전 방지 | KpaGlobalHeader `headerUser` placeholder 전달 |

---

## 3. 영역별 완료 상태

### 3-1. 운영자 영역 (`/operator/*`)

| 화면 | 변경 전 | 변경 후 | checkbox | ActionBar | bulk action | smoke |
|------|---------|---------|:--------:|:---------:|:-----------:|-------|
| OperatorBlogListPage | 카드형 | DataTable | ✅ | ✅ | 발행/보관/삭제 | ⚠️ BLOCKED |
| OperatorPopListPage | 카드형 | DataTable | ✅ | ✅ | 발행/보관/삭제 | ⚠️ BLOCKED |
| OperatorQrListPage | 카드형 | DataTable | ✅ | ✅ | 발행/보관/삭제 | ⚠️ BLOCKED |

> BLOCKED 사유: admin 계정(`sohae2100@gmail.com`) 과다 로그인 시도로 일시 잠금. 사용자 직접 검증 예정.

### 3-2. 매장 HUB 영역 (`/store-hub/*`)

| 화면 | 변경 전 | 변경 후 | checkbox | ActionBar | bulk action | smoke |
|------|---------|---------|:--------:|:---------:|:-----------:|-------|
| HubBlogLibraryPage | 카드형 | DataTable | ✅ | ✅ | 일괄 가져가기 | ✅ PASS |
| HubPopLibraryPage | 카드형 | DataTable | ✅ | ✅ | 일괄 가져가기 | ✅ PASS (빈 데이터) |
| HubQrLibraryPage | 카드형 | DataTable | ✅ | ✅ | 일괄 가져가기 | ✅ PASS (빈 데이터) |

### 3-3. 내 매장 실행 영역 (`/store/*`)

| 화면 | 변경 전 | 변경 후 | checkbox | ActionBar | bulk action | smoke |
|------|---------|---------|:--------:|:---------:|:-----------:|-------|
| PharmacyBlogPage | 카드형 | DataTable | ✅ | ✅ | 발행/숨김/삭제 | ✅ PASS |
| PharmacyPopPage | 카드형 | DataTable | ✅ | ✅ | 발행/숨김/삭제 | ✅ PASS |
| StoreQRPage | 카드형 | DataTable | ✅ | ✅ | 발행/숨김/삭제 | ✅ PASS |

### 3-4. 자료함 / 실행자산 영역 (`/store/*`)

| 화면 | 변경 전 | 변경 후 | checkbox | ActionBar | bulk action | smoke |
|------|---------|---------|:--------:|:---------:|:-----------:|-------|
| StoreLibraryResourcesPage | 카드형 | DataTable | ✅ | ✅ | bulk 다운/삭제 | ✅ PASS |
| TabletRequestsPage | 카드형 | DataTable | ✅ | ✅ | urgency 시각 단서 보존 | ✅ PASS |
| StoreTabletDisplaysPage | select 박스 | DataTable | ✅ | ✅ | bulk 삭제 | ✅ PASS |
| StoreContentsSelector | 카드형 | DataTable | ✅ | ✅ | (선택 전달) | ✅ PASS |
| StoreAssetsPanel Regular section | BaseTable (선택 없음) | BaseTable + _select + ActionBar | ✅ | ✅ | 게시/숨김/초안 | ✅ PASS |

---

## 4. smoke 결과 전체

| URL | 결과 | 비고 |
|-----|------|------|
| `/store/library/resources` | ✅ PASS | DataTable + checkbox + ActionBar |
| `/store/requests` | ✅ PASS | DataTable + urgency 단서 유지 |
| `/store/commerce/tablet-displays` | ✅ PASS | DataTable + grid 보존 |
| `/store/library/contents` | ✅ PASS | DataTable + ActionBar + RowActionMenu |
| `/store/content` (StoreAssetsPanel) | ✅ PASS | checkbox + ActionBar 3종 |
| `/store-hub` (FOUH 방지) | ✅ PASS | isLoading 중 공개 헤더 미표시 |
| `/store-hub/blog` | ✅ PASS | DataTable + 체크박스 + ActionBar + Drawer |
| `/store-hub/pop` | ✅ PASS | DataTable 구조 정상 (빈 데이터) |
| `/store-hub/qr` | ✅ PASS | DataTable 구조 정상 (빈 데이터) |
| `/operator/blog` | ⚠️ BLOCKED | admin 계정 잠금 |
| `/operator/pop` | ⚠️ BLOCKED | admin 계정 잠금 |
| `/operator/qr` | ⚠️ BLOCKED | admin 계정 잠금 |

---

## 5. 공통 이슈 및 처리

### 5-1. /store-hub FOUH (Flash Of Unauthenticated Header)

**현상**: `/store-hub/*` 진입 시 `isLoading=true` 구간에 "로그인" 버튼이 순간 표시됨  
**원인**: `<Layout><HubGuard>` 구조에서 Layout이 Guard 바깥에 위치 + `KpaGlobalHeader`가 `isLoading` 미수신  
**수정**: `KpaGlobalHeader`에 `isLoading` 수신 + `headerUser` placeholder 전달  
**상태**: ✅ CLOSED (commit `cbcc8dbff`)

### 5-2. StoreAssetsPanel _select 컬럼 누락

**현상**: Regular section에 행 체크박스가 표시되지 않음  
**원인**: `BaseTable`의 `selectable` prop은 헤더 select-all만 auto-wire, body cell은 consumer가 정의해야 함  
**수정**: `regularColumns` useMemo에 `{key:'_select', render: checkbox}` 컬럼 prepend  
**상태**: ✅ CLOSED (commit `03a62df47`)

---

## 6. 남은 리스크

### R1 — 운영자 smoke 미완료

| 항목 | 상태 |
|------|------|
| `/operator/blog` | ⚠️ 사용자 직접 검증 예정 |
| `/operator/pop` | ⚠️ 사용자 직접 검증 예정 |
| `/operator/qr` | ⚠️ 사용자 직접 검증 예정 |

- 사유: admin 계정(`sohae2100@gmail.com`) 일시 잠금으로 자동 검증 불가
- 코드 자체는 구현 완료 — smoke만 미검증 상태

### R2 — Production smoke 계정 정합성

- `TEST-ACCOUNTS.local.md` 계정과 production 실제 잠금 상태 불일치 가능성
- admin 계정 잠금 해제 후 `TEST-ACCOUNTS.local.md` 재확인 권장

### R3 — GlycoPharm / K-Cosmetics 이식 미진행

- 이번 1차 사이클은 **KPA canonical 구현**이 목표였으므로 cross-service 이식은 미진행
- StoreAssetsPanel은 `@o4o/store-asset-policy-core` 공통 패키지 → KPA + GlycoPharm 동시 적용 완료
- K-Cosmetics는 `StoreAssetsPanel` 미사용 확인 (types만 import)
- 나머지 화면(OperatorBlogListPage 등)의 GlycoPharm 대응 여부: 별도 IR 필요

### R4 — /store-hub/pop, /store-hub/qr 빈 데이터

- 구조 검증은 PASS이나, 실제 운영자 게시 데이터가 없어 행 클릭 Drawer는 미검증
- 운영자가 POP/QR 콘텐츠를 발행한 후 재검증 권장

---

## 7. 다음 단계 제안

```text
Step 1. 사용자가 /operator/blog, /operator/pop, /operator/qr smoke 직접 검증
         → admin 계정 잠금 해제 후 진행

Step 2. IR-O4O-CROSS-SERVICE-STANDARD-TABLE-PORTING-AUDIT-V1
         → KPA canonical → GlycoPharm / K-Cosmetics 이식 가능 범위 조사
         → OperatorBlogListPage, OperatorPopListPage, OperatorQrListPage 등

Step 3. 서비스별 이식 WO
         → GlycoPharm 대상 화면 이식
         → K-Cosmetics 대상 화면 이식

Step 4. (선택) TEST-ACCOUNTS production smoke access 정비
         → 계정 잠금 재발 방지를 위한 smoke 전용 계정 분리 검토
```

---

## 8. 패키지 영향 범위 정리

| 패키지/서비스 | 변경 | 영향 |
|---------------|------|------|
| `@o4o/store-asset-policy-core` | BaseTable selection + ActionBar 추가 | KPA + GlycoPharm 양쪽 적용 |
| `services/web-kpa-society` | 14개 화면 표준 테이블 전환 | KPA 전용 |
| `services/web-glycopharm` | StoreAssetsPage bulk handler 추가 | StoreAssetsPanel 공용 패키지 경유 |
| `services/web-k-cosmetics` | 변경 없음 | StoreAssetsPanel 미사용 확인 |

---

## 9. 코드 변경 없음 확인

이번 IR에서 코드 파일을 수정하지 않았다.

```
수정된 파일: 없음
```

---

## 10. 참조 IR 목록

```
docs/investigations/IR-O4O-KPA-STANDARD-TABLE-LIST-AUDIT-V1.md
docs/investigations/IR-O4O-KPA-STORE-CONTENTS-SELECTOR-STANDARDIZATION-V1.md
docs/investigations/IR-O4O-STORE-ASSET-POLICY-CORE-DATATABLE-V1.md
docs/investigations/IR-O4O-KPA-STORE-HUB-SESSION-LOSS-AUDIT-V1.md
```
