# CHECK-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1

> WO: **WO-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1**
> 작업 제목: **콘텐츠 "저장 = 즉시 사용 가능" 표준화 + 내 매장 QR 대상 확장**
> 작업일: 2026-06-25 / 범위: KPA-Society 1차 / 상태: **코드 완료 · typecheck PASS · 운영 브라우저 smoke 보류(배포 후)**

---

## 1. 핵심 원칙

> 사용자가 "저장"을 누르면, 해당 콘텐츠는 즉시 다음 작업(QR·사용처)에서 선택 가능해야 한다.
> 초안은 사용자가 명시적으로 "초안"을 선택했을 때만 만들어진다.

---

## 2. 조사로 확정한 구조 (중요)

KPA 콘텐츠는 **두 개의 분리된 파이프라인**으로 존재한다:

| 구분 | 저장소 | API | 소비처 |
|------|--------|-----|--------|
| 운영자 콘텐츠 허브 | `kpa_contents` | `/api/v1/kpa/contents` | `/operator/content-hub`, **QR 피커**(`ContentHubPickerModal`, status='ready'), 자산 스냅샷 복사 |
| 매장 허브 콘텐츠 | `cms_contents` | `/api/v1/cms/contents` | `/store-hub/content`(`HubContentLibraryPage`, status='published') |

→ **두 시스템 사이에 브릿지가 없다.** 운영자가 `kpa_contents`에 저장한 콘텐츠는 상태와 무관하게 `/store-hub/content`(cms_contents)에 나타나지 않는다. `cms_contents` 타입·매핑은 **F5(Content Stable) 동결** 대상.

### 사용자 결정 (2026-06-25)

| WO 항목 | 결정 |
|---------|------|
| 7.3 매장 허브 노출 (kpa_contents → cms_contents) | **별도 WO로 분리** (F5 동결 계약 변경 필요) |
| 7.4 내 매장 QR 대상 확장 | **이번에 진행** (이전 canonical "내 자료함에서만" 결정을 명시적으로 재정의) |

---

## 3. 수정 내역

### 3.1 저장 기본 상태 = `ready` (저장 = 즉시 사용 가능)

콘텐츠 허브 신규 저장 기본값을 `draft` → `ready` 로 변경. 초안은 모달 상태를 "초안"으로 명시 선택했을 때만 생성.

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/operator/OperatorContentHubPage.tsx` | `openCreate()` 기본 status `'draft'` → `'ready'`. 모달 상태 드롭다운에 "완료(저장 즉시 사용 가능)" 를 먼저 노출하고 "초안(사용처에 노출 안 됨)" 안내 추가 |
| `apps/api-server/src/routes/kpa/kpa.routes.ts` | `POST /contents` status 미지정/무효 시 기본값 `'draft'` → `'ready'` (방어 + 전역 API 표준). draft 는 클라이언트가 명시적으로 보낼 때만 |

→ 효과(수용 기준 7.1/7.2/7.5):
- 저장 직후 콘텐츠가 `ready` 로 저장됨 → 상태 배지 "초안" 아님.
- 운영자 QR 만들기(`ContentHubPickerModal`, status='ready' 필터)에 **즉시 노출**.
- 명시적 초안은 여전히 QR 선택기/사용처에서 제외.

### 3.2 내 매장 QR 대상 확장 (§7.4) — 운영자 콘텐츠 소스 추가

조사 결과 `store_execution_assets` 에는 이미 **자료(file/link) + 내 매장 제작자료(generated) + 매장으로 가져온 콘텐츠(content)** 가 모두 포함되어 QR 선택 모달에 노출된다. 유일하게 빠진 소스는 **운영자 콘텐츠 허브(`kpa_contents`, ready)** — 별도 테이블. 따라서 모달에 opt-in **소스 전환 탭**을 추가.

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/components/store/StoreAssetSelectorModal.tsx` | `enableContentHubSource?: boolean` opt-in prop 추가. true 시 상단 소스 탭("내 매장 자료" ↔ "운영자 콘텐츠") 노출. "운영자 콘텐츠" 탭은 `listContentHubItems({ status:'ready' })` 조회. 선택 결과에 `source: 'asset' | 'content-hub'` 마커 추가 |
| `services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx` | 모달에 `enableContentHubSource` 전달. `handleCreate` 가 `source==='content-hub'` 일 때 **참조형(C-1)**: `landingType='page'`, `landingTargetId=content.id`, `libraryItemId` 미전송. 생성 폼은 콘텐츠 참조 시 연결 유형/대상 입력을 잠금 안내(GuideBlock info)로 대체 |

→ "가져오기=복사" 원칙 유지: 운영자 콘텐츠는 **참조형 연결**(사본 복사 없음). 백엔드 QR 랜딩(`/qr/public/:slug`)은 이미 `landingType='page'` → `kpa_contents` inline 렌더(ready/published)를 지원하므로 **백엔드 변경 없음**.

### 3.3 백엔드 권한 검증 (§5)

`GET /api/v1/kpa/contents` 는 `optionalAuth` 이며 `status='ready'` 필터 전달 시 소유자 제한 없이 모든 ready 콘텐츠를 반환(`kpa.routes.ts:1471` `else if (!statusFilter)` 분기 스킵 → `1478` 만 적용). 매장 경영자가 그대로 조회 가능 → **신규 엔드포인트 불필요.**

---

## 4. 수용 기준 점검

| 기준 | 결과 |
|------|------|
| 7.1 운영자 저장 → 초안 아닌 사용 가능 상태, `/operator/docs` 노출 | ✅ 코드 (기본 ready) — 브라우저 smoke 보류 |
| 7.2 저장 직후 `/operator/qr/new` 선택기 노출 + QR 생성 | ✅ 코드 (ready 필터 일치) — 브라우저 smoke 보류 |
| 7.3 매장 허브(`/store-hub/content`) 노출 | ⏸ **별도 WO 분리** (cms_contents 별도 파이프라인, F5 동결) |
| 7.4 `/store/marketing/qr` 대상이 내 자료에만 제한되지 않음 | ✅ 코드 (운영자 콘텐츠 소스 탭 + 기존 자료/제작자료) — 브라우저 smoke 보류 |
| 7.5 명시적 초안은 QR 선택기/사용처 비노출 + 안내 | ✅ 코드 (모달 안내 문구) |

---

## 5. 기존 draft 데이터 보정 (§5) — 보류 (사용자 판단 필요)

- 정책상 데이터 변경(UPDATE)은 **사용자 승인 필요**, 마이그레이션은 CI/CD 자동이 원칙.
- WO 원칙: "무조건 전체 draft 를 ready 로 바꾸지 않는다."
- **권고**: 우선 read-only 로 `kpa_contents` 중 `status='draft'` 이면서 제목·본문 존재 + 장기 미수정 건수를 확인한 뒤, 운영 데이터 성격(실데이터 vs 테스트)에 따라 보정 여부 결정. 자동 일괄 변경은 하지 않음.
- read-only 카운트 SQL(승인 시 실행 후보):
  ```sql
  SELECT COUNT(*)::int AS draft_with_body
  FROM kpa_contents
  WHERE is_deleted = false AND status = 'draft'
    AND title IS NOT NULL AND (body IS NOT NULL OR jsonb_array_length(blocks) > 0);
  ```

---

## 6. 검증

| 검증 | 결과 |
|------|------|
| `services/web-kpa-society` 전체 `tsc --noEmit` | ✅ PASS (오류 0) |
| `apps/api-server` `tsc` (kpa.routes 변경) | ✅ 변경 파일 오류 0 |
| 공유 컴포넌트 `StoreAssetSelectorModal` 다른 소비처(`StoreSignagePage`) 영향 | ✅ opt-in prop 기본 false → 기존 동작 무변경 |
| 운영 브라우저 smoke (§8.3) | ⏸ 배포 후 수행 |

### 배포 후 운영 smoke 절차 (§8.3)

1. 운영자 로그인 → `/operator/content-hub` 새 콘텐츠 작성 → **일반 저장** → 상태 "완료" 확인
2. `/operator/qr/new` 콘텐츠 선택기에 방금 콘텐츠 노출 확인 → QR 생성 → 공개 QR 페이지 렌더 확인
3. 매장 경영자 로그인 → `/store/marketing/qr` → "QR 만들기" → 선택 모달 "운영자 콘텐츠" 탭에서 ready 콘텐츠 선택 → QR 생성
4. 생성된 QR `/qr/:slug` 접속 → 콘텐츠 inline 렌더(`pageContent.available=true`) 확인
5. 명시적 "초안" 저장 콘텐츠가 QR 선택기/콘텐츠 탭에 비노출 확인

---

## 7. 후속 작업

1. **(별도 WO)** 운영자 콘텐츠 허브(`kpa_contents`) → 매장 허브(`/store-hub/content`, `cms_contents`) 노출 정합 — 7.3. F5(Content Stable) 동결 계약 검토 필요.
2. **(보정 판단)** §5 기존 draft 데이터 read-only 카운트 → 보정 여부 결정.
3. **(공통화)** 본 표준(저장=ready)을 GlycoPharm / K-Cosmetics / Neture 콘텐츠 계열에 확대 — §3.2 2차 점검 범위. KPA 안정화 후 별도 IR/WO.

---

## 8. 최종 판정

- ✅ **저장 = 즉시 사용 가능** 표준이 운영자 콘텐츠 허브(kpa_contents)에 적용됨. 저장한 콘텐츠가 QR 선택기에서 즉시 선택 가능.
- ✅ 초안은 명시적 선택 시에만 생성, 사용처 비노출.
- ✅ 내 매장 QR 대상이 운영자 콘텐츠/자료/내 매장 제작자료로 확장됨(참조형, 가져오기=복사 원칙 유지).
- ⏸ 매장 허브(cms_contents) 정합은 별도 WO. 운영 브라우저 smoke 는 배포 후.
