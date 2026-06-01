# CHECK-O4O-CROSSSERVICE-STORE-HUB-CANONICAL-ALIGNMENT-CYCLE1-V1

**날짜**: 2026-06-01  
**목적**: KPA-Society canonical 기준으로 GlycoPharm / K-Cosmetics Store HUB 1차 정렬 완료 상태 문서화  
**범위**: read-only — 코드·DB·API 수정 없음  
**제외 서비스**: Neture (내 매장 / Store HUB 기능 미지원)

---

## 핵심 판정

**PASS with known minor drift**

Store HUB 6개 핵심 영역(상품 카탈로그 / 블로그 / POP / QR / 사이니지 / 콘텐츠)의 **구조 및 기능** 정렬은 1차 완료로 고정한다.

- GlycoPharm 콘텐츠 `copyLabel: '내 약국에 복사'`(약국 문맥 유지)는 사용자 표현 drift로 인식하고 후속 레이블 정리 후보로 분리한다.
- 일부 K-Cosmetics live import 검증은 store-owner 계정·데이터 부재로 BLOCKED이며, 기능 구현 미완이 아닌 검증 환경 이슈로 분리한다.

---

## 1. 영역별 정렬 상태

| 영역 | KPA | GlycoPharm | K-Cosmetics | 판정 | 비고 |
|------|-----|-----------|-------------|------|------|
| **상품 카탈로그** | HubB2BCatalogPage (793줄) | HubB2BCatalogPage (368줄) | HubB2BPage (369줄) | ✅ 정렬 완료 | DataTable+ActionBar 통일 |
| **블로그** | HubBlogLibraryPage (400줄) | HubBlogLibraryPage (322줄) | HubBlogLibraryPage (320줄) | ✅ 정렬 완료 | DataTable+ActionBar 통일 |
| **POP** | HubPopLibraryPage (374줄) | HubPopLibraryPage (324줄) | HubPopLibraryPage (320줄) | ✅ 정렬 완료 | DataTable+ActionBar 통일 |
| **QR** | HubQrLibraryPage (385줄) | HubQrLibraryPage (324줄) | HubQrLibraryPage (320줄) | ✅ 정렬 완료 | DataTable+ActionBar 통일 |
| **사이니지** | HubSignageLibraryPage (604줄) | HubSignageLibraryPage (580줄) | HubSignagePage (579줄) | ✅ 정렬 완료 | assetSnapshot.copy 통일 |
| **콘텐츠** | HubContentLibraryPage (171줄) | HubContentListPage (204줄) | HubContentPage (201줄) | ✅ 정렬 완료* | ContentHubTemplate 통일, copy API 통일 |

\* GlycoPharm 콘텐츠 `copyLabel: '내 약국에 복사'` 레이블 minor drift 잔존 — 기능 정렬 완료, 표현 후속 대상

---

## 2. 서비스별 정렬 상태

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|-----------|-------------|
| route `/store-hub/*` | ✅ 6영역 완비 | ✅ 6영역 완비 | ✅ 6영역 완비 |
| DataTable (B2B/Signage/Blog/Pop/QR) | ✅ | ✅ | ✅ |
| ActionBar (bulk 가져가기) | ✅ | ✅ | ✅ |
| ContentHubTemplate (콘텐츠) | ✅ single-action | ✅ single-action | ✅ single-action |
| `assetSnapshotApi.copy({ assetType:'signage' })` | ✅ | ✅ | ✅ |
| `assetSnapshotApi.copy({ assetType:'cms' })` | ✅ | ✅ | ✅ |
| `dashboardCopyApi` 잔존 | ❌ 없음 | ❌ 없음 | ❌ 없음 |
| Hub 루프 (`/store-hub/content` infoLinks 루프) | ❌ 없음 | ❌ 없음 | ❌ 없음 |
| 내 매장 연결 (`/store/library/contents`) | `/store/content` | ✅ | ✅ |
| copyLabel 문구 | '내 매장에 복사' | '내 약국에 복사'* | '내 매장에 복사' |

\* GlycoPharm 약국 문맥 유지, 후속 레이블 정리 후보

---

## 3. 완료된 WO / IR 흐름

### 사이니지 축

```
IR-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-STRUCTURE-DECISION-V1
  → redirect 구조가 비의도적 누락임을 확인, Option B → C 권장

WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-WRAPPER-V1
  → GlycoPharm /store-hub/signage redirect 제거, HubSignageLibraryPage wrapper 추가

CHECK-O4O-GLYCOPHARM-HUBCONTENTAPI-SIGNAGE-SUPPORT-V1
  → hubContentApi / assetSnapshotApi GlycoPharm signage 지원 PASS

WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-CANONICAL-ALIGNMENT-V1
  → KPA 패턴 완전 이식 (DataTable + 가져가기 + sourceService 제거)

IR-O4O-KCOSMETICS-STORE-HUB-SIGNAGE-ALIGNMENT-V1
  → K-Cosmetics placeholder drift 확인, backend 완전 지원 확인

WO-O4O-KCOSMETICS-STORE-HUB-SIGNAGE-CANONICAL-ALIGNMENT-V1
  → placeholder(33줄) → canonical(580줄) 교체
```

### 콘텐츠 축

```
IR-O4O-CROSSSERVICE-STORE-HUB-CONTENT-PAGE-ALIGNMENT-V1
  → dashboardCopyApi legacy drift 확인
  → K-Cosmetics /store-hub/content placeholder, 실구현 /library/content 확인

WO-O4O-KCOS-STORE-HUB-CONTENT-PAGE-CANONICAL-ALIGNMENT-V1
  → K-Cosmetics placeholder 교체 + dashboardCopyApi → assetSnapshotApi 전환
  → /store/library/contents 연결, 허브 루프 제거

WO-O4O-GLYCOPHARM-STORE-HUB-CONTENT-COPY-API-FIX-V1
  → GlycoPharm dashboardCopyApi → assetSnapshotApi 전환
  → /hub/content/:id 구 경로 카드 이동 제거
  → infoLinks 허브 루프 제거

WO-O4O-CROSSSERVICE-STORE-HUB-CONTENT-LABEL-ALIGNMENT-V1
  → K-Cosmetics: '내 매장에 복사' ✅
  → GlycoPharm: '내 약국에 복사' (약국 문맥 유지, 후속 후보)
```

---

## 4. Smoke 상태

| 영역 / 서비스 | 구조 smoke | 데이터/live import smoke |
|-------------|-----------|------------------------|
| KPA B2B | PASS | N/A (canonical 기준) |
| KPA 사이니지 | PASS | N/A |
| KPA 콘텐츠 | PASS | N/A |
| KPA Blog/Pop/QR | PASS | N/A |
| GlycoPharm B2B | PASS | PASS (store-owner 계정 존재) |
| GlycoPharm 사이니지 | PASS | PASS |
| GlycoPharm 콘텐츠 | PASS | PASS |
| GlycoPharm Blog/Pop/QR | PASS | PASS |
| **K-Cosmetics B2B** | **PASS** | BLOCKED (store-owner 계정 부재) |
| **K-Cosmetics 사이니지** | **PASS** | BLOCKED (hub signage 데이터 부재) |
| **K-Cosmetics 콘텐츠** | **PASS** | BLOCKED (hub cms 데이터 부재) |
| **K-Cosmetics Blog** | **PASS** | BLOCKED |
| **K-Cosmetics Pop/QR** | **PASS** | BLOCKED |

**BLOCKED 사유 공통**: K-Cosmetics store-owner 계정 및 운영자 게시 데이터(hub content) 부재 — 기능 구현 미완이 아닌 검증 환경 이슈

---

## 5. 남은 리스크

| 항목 | 유형 | 우선순위 |
|------|------|---------|
| K-Cosmetics live import 검증 미완 | 검증 환경 이슈 | 낮음 (기능 정상) |
| GlycoPharm 콘텐츠 `'내 약국에 복사'` 레이블 | 사용자 표현 minor drift | 낮음 |
| service-local 병렬 구현 (공통 컴포넌트 미추출) | 장기 기술부채 | 낮음 |
| 이벤트/특가(`/store-hub/event-offers`) 정합 미확인 | 별도 후속 후보 | 중간 |
| `/library/content` 중복 경로 정리 (K-Cosmetics) | cleanup 후보 | 낮음 |

---

## 6. 후속 후보

```
1. CHECK-O4O-KCOS-STORE-HUB-LIVE-IMPORT-SMOKE-V1
   - K-Cosmetics store-owner 계정과 운영자 게시 데이터 확보 후 live import 검증

2. WO-O4O-GLYCOPHARM-STORE-HUB-CONTENT-LABEL-CLEANUP-V1
   - GlycoPharm 콘텐츠 copyLabel '내 약국에 복사' → '내 매장에 복사' 표현 정리

3. IR-O4O-CROSSSERVICE-STORE-HUB-EVENT-OFFER-ALIGNMENT-V1
   - /store-hub/event-offers 영역 정합 확인

4. IR-O4O-CROSSSERVICE-STORE-HUB-PAGE-COMMONIZATION-V1
   - service-local 병렬 구현 → shared component 추출 가능성 조사 (장기)

5. WO-O4O-KCOS-LIBRARY-CONTENT-ROUTE-CLEANUP-V1
   - K-Cosmetics /library/content 중복 경로 정리
```

---

## 7. 검증 결과 요약

### copy API 통일 현황

| API | KPA | GlycoPharm | K-Cosmetics |
|-----|-----|-----------|-------------|
| `assetSnapshotApi.copy({ assetType:'signage' })` | ✅ | ✅ | ✅ |
| `assetSnapshotApi.copy({ assetType:'cms' })` | ✅ | ✅ | ✅ |
| `dashboardCopyApi` | ❌ 없음 | ❌ 없음 | ❌ 없음 |

### UI 패턴 통일 현황

| 패턴 | B2B/Signage/Blog/Pop/QR | 콘텐츠 |
|------|------------------------|--------|
| DataTable | ✅ 3서비스 통일 | N/A (ContentHubTemplate) |
| checkbox selection | ✅ 3서비스 통일 | N/A |
| ActionBar (bulk copy) | ✅ 3서비스 통일 | N/A (single-action 정책) |
| ContentHubTemplate | N/A | ✅ 3서비스 통일 |
| single-action copy | N/A | ✅ 3서비스 통일 |

### route 구조 통일 현황

| route | KPA | GlycoPharm | K-Cosmetics |
|-------|-----|-----------|-------------|
| `/store-hub/b2b` | ✅ | ✅ | ✅ |
| `/store-hub/signage` | ✅ | ✅ | ✅ |
| `/store-hub/content` | ✅ | ✅ | ✅ |
| `/store-hub/blog` | ✅ | ✅ | ✅ |
| `/store-hub/pop` | ✅ | ✅ | ✅ |
| `/store-hub/qr` | ✅ | ✅ | ✅ |

---

## 최종 판정

**PASS with known minor drift** ✅

```
Store HUB canonical alignment cycle 1 완료 범위:
✅ 상품 카탈로그  — DataTable+ActionBar, KPA 기준 정렬
✅ 블로그        — DataTable+ActionBar, DataTable 통일
✅ POP           — DataTable+ActionBar, KPA 기준 이식 완료
✅ QR-code       — DataTable+ActionBar, KPA 기준 이식 완료
✅ 사이니지       — DataTable+ActionBar+media-playlist 탭, assetSnapshot 통일
✅ 콘텐츠        — ContentHubTemplate single-action, assetSnapshot(cms) 통일

잔존 항목 (기능 완료, 표현/검증 후속):
⚠️ K-Cosmetics live import BLOCKED (검증 환경 이슈)
⚠️ GlycoPharm 콘텐츠 '내 약국에 복사' 레이블 (약국 문맥 유지, 후속 레이블 정리 후보)
```

---

*검증 수행: Claude Code (2026-06-01)*
