# IR-O4O-KPA-TABLET-CONTENT-LIBRARY-AND-CORNER-ASSIGNMENT-DESIGN-V1

> WO: `WO-O4O-KPA-TABLET-CONTENT-LIBRARY-AND-CORNER-ASSIGNMENT-DESIGN-V1`
> 성격: **설계·조사 전용(read-only)**. 구현/마이그레이션/API 변경 없음.
> Date: 2026-07-14

---

## 0. 요약

현재 태블릿 관리 화면을 **① 코너별 운영**과 **② 태블릿 콘텐츠 관리** 두 업무로 분리하기 위한 조사·IA 설계.

핵심 결론:

1. **"태블릿 콘텐츠" = Screen Set**(`store_tablet_screen_sets`, `template_key` + blocks). 이것이 콘텐츠 원본 단위다.
2. **코너 = `store_tablets`**(location/name). 코너는 콘텐츠를 **교체·표시·숨김**만 하고 원본을 수정/삭제하지 않는다.
3. 콘텐츠 **원본 CRUD**(추가/수정/**복제**/보관/삭제/미리보기)는 별도 "태블릿 콘텐츠" 목록에서 수행.
4. **QR 모바일 미러의 데이터/API 계층은 이미 존재·공개**(`GET /:slug/tablet/screen`). 없는 것은 (a) **idle 영상 제외** 모바일 전용 렌더 라우트, (b) `qr_guide` 자동 딥링크 생성뿐.
5. 신규로 필요한 데이터 구조는 **코너 × 콘텐츠 배정/숨김 레이어**(additive 신규 테이블)와 **복제 엔드포인트**뿐. 나머지는 기존 API/스키마 재사용.

---

## 1. 현재 구조 조사 (사실, read-only)

### 1.1 데이터 모델 (migration `20270120000000-CreateTabletScreenSetsAndBlocks`)

| 테이블 | 역할 | 핵심 컬럼 |
|--------|------|-----------|
| `store_tablets` | **코너**(1행=1코너, location/name) | `current_screen_set_id`(활성 콘텐츠, FK `ON DELETE SET NULL`) |
| `store_tablet_screen_sets` | **태블릿 콘텐츠**(=Screen Set) | `id`, `organization_id`, `service_key`, **`tablet_id`(nullable)**, `name`, `origin`('store'\|'operator'), `status`('draft'\|'active'\|'archived'\|'operator_template'), `template_key`(nullable), `deleted_at` |
| `store_tablet_screen_blocks` | 콘텐츠 내부 블록 | `screen_set_id`, `block_type`, `sort_order`, **`is_visible`**, `config`(jsonb) |

- **콘텐츠 단위 = Screen Set**: `template_key`(대기 영상형/코너 소개형/제품 진열형/상품 집중형/기본) + 블록 구성(idle_media / corner_description / content_list / product_list / qr_guide 등).
- **`tablet_id` nullable** → 스키마 주석 그대로 "코너/태블릿 단위 **또는 매장 재사용**". 즉 org 공유 콘텐츠(=`tablet_id` NULL)를 이미 지원.
- **적용(assignment)** = `store_tablets.current_screen_set_id`. **코너당 활성 콘텐츠 1개**. `current_screen_set_id`는 org 내 임의 Set 참조 가능 → 데이터상 **한 콘텐츠를 여러 코너가 참조**하는 것도 가능.

### 1.2 현재 API (`store-tablet.routes.ts`, 모두 store-auth)

| 목적 | 엔드포인트 | 비고 |
|------|-----------|------|
| 콘텐츠 목록 | `GET /screen-sets?tabletId&status&includeArchived` | `tabletId` 필터, `blockCount`, `isApplied`(EXISTS current_screen_set_id) |
| 콘텐츠 상세+블록 | `GET /screen-sets/:id` | |
| 콘텐츠 생성 | `POST /screen-sets` | `tabletId` 옵션(미지정=NULL=매장 공유), `templateKey` 화이트리스트 |
| 콘텐츠 수정 | `PATCH /screen-sets/:id` | name/status/**tabletId**/templateKey |
| 콘텐츠 블록 저장 | `PUT /screen-sets/:id/blocks` | content_list 등 |
| 콘텐츠 삭제 | `DELETE /screen-sets/:id` | **soft-delete**(`deleted_at`+`archived`), **사용 중이면 차단** |
| 코너에 적용(교체) | `POST /tablets/:id/current-screen-set` | Set `status='active'` 필수, 아니면 409 |
| 코너 적용 해제 | `DELETE /tablets/:id/current-screen-set` | current_screen_set_id=NULL |

- **없는 것**: 콘텐츠 **복제(duplicate)** 엔드포인트, **코너×콘텐츠 배정/숨김** 개념.

### 1.3 공개 runtime / QR (조사)

- 공개 화면 API = `GET /api/v1/stores/:slug/tablet/screen?tabletId=` — **완전 공개(무인증)**. resolve 결과 = `sections[]`(corner_description / qr_guide / content_list 카드 / product_list / idle_media) + `templateKey`. **이 블록 세트의 유일한 소비자 = kiosk `TabletKioskPage`**.
- `/tablet/:slug`(공개) = `TabletStorePage` → **동일 kiosk 뷰어**(`TabletKioskPage`, fullscreen 가로형, idle overlay 포함). 폰에서 로드는 되나 **모바일 전용 뷰 아님**, idle 영상 포함.
- `qr_guide.url` = 운영자가 편집기에서 입력하는 **자유 텍스트(선택)**. 자동 딥링크/시드 없음 → 보통 일반 도메인(kpa-society.co.kr)을 가리킴. 뷰어는 이 문자열을 **실제 스캔 QR**(`QRCodeSVG`)로 렌더(-TEMPLATE-THREE-PATTERNS-V1).
- 유사 공개 단일 뷰어(부분): `/qr/:slug`(단일 page/redirect), `/multilingual-products/:publicKey`(단일 상품 다국어), `/view/:snapshotId`(단일 스냅샷). **코너 전체(설명+카드목록+상품+상세)를 한 모바일 페이지로 미러하는 라우트는 없음.**

### 1.4 현재 관리 화면 상단 UI (`StoreTabletDisplaysPage.tsx`)

| 요소 | 현재 | 위치 |
|------|------|------|
| 운영 안내 | 버튼→모달(이미 정비됨, -OPERATION-GUIDE-MODAL-V1) | 상단 |
| 고객 화면 미리보기 | 상단 버튼(선택 태블릿 필요) | 상단 |
| 코너 추가 | 상단 버튼 | 상단 |
| 저장 | 상단 버튼(항상 노출, hasChanges 시 활성) | 상단 |

---

## 2. 두 업무 분리 IA

```
[코너별 운영]              [태블릿 콘텐츠]
────────────              ──────────────
코너 목록                  콘텐츠 라이브러리(원본 목록)
 └ 코너 선택                └ 콘텐츠 카드(이름·템플릿·사용 코너·미리보기)
   ├ 현재 사용 중 콘텐츠      ├ 추가 / 수정(블록 편집)
   ├ 다른 사용 가능 콘텐츠    ├ 복제
   │  └ [이 콘텐츠 사용]      ├ 보관(archive) / 복원
   ├ [이 코너에서 숨김]       ├ 삭제(soft, 사용 중 차단)
   └ [실제 태블릿 화면 열기]   └ 미리보기(카드별 모달, template_key 반영)
   (삭제 없음)
```

상단 탭/메뉴: `[코너별 운영] [태블릿 콘텐츠]`.

### 2.1 코너별 운영 화면 IA

- 코너 목록(코너 카드 홈 — 기존 TOUCH-FIRST 재사용).
- 코너 선택 →
  - **현재 사용 중 콘텐츠**(current_screen_set_id) 카드.
  - **이 코너에서 사용할 수 있는 다른 콘텐츠** 목록(배정/공유 콘텐츠 중 숨김 아닌 것).
  - `[이 콘텐츠 사용]` = 교체(apply). `[이 코너에서 숨김]` = 이 코너 목록에서만 감춤(원본·타 코너 무영향).
  - `[실제 태블릿 화면 열기]` = 공개 viewer 새 탭(기존 connect·실행 카드 재사용).
- **콘텐츠 삭제/원본 수정 없음**(원본 보호).

### 2.2 태블릿 콘텐츠 목록 IA

콘텐츠 카드 표시:

```
콘텐츠 이름 · 적용 템플릿(templateLabel) · 사용 중인 코너(들)
[미리보기] [수정] [복제] [보관] [삭제]
```

- **미리보기** = 카드별 **모달**(별도 페이지 아님, §4). `template_key` 실제 반영.
- **수정** = 블록 편집(기존 편집기).
- **복제** = 원본 복사(신규 엔드포인트 필요, §3.4).
- **보관** = `status='archived'`(라이브러리에서 숨김, 복원 가능).
- **삭제** = soft-delete(사용 중이면 차단).
- **사용 중인 코너** = `store_tablets.current_screen_set_id = set.id` 역참조(+ 배정 레이어).

---

## 3. 교체 · 표시 · 숨김 · 삭제 구분 (정의)

| 동작 | 층위 | 의미 | 원본/타 코너 영향 | 현재 지원 |
|------|------|------|-------------------|-----------|
| **교체(사용)** | 코너↔콘텐츠 | `current_screen_set_id` 변경 | 없음 | ✅ `POST /tablets/:id/current-screen-set` |
| **이 코너에서 숨김** | 코너×콘텐츠 | 이 코너의 "사용 가능 목록"에서만 감춤 | **없음**(원본·타 코너 유지) | ❌ **신규 배정/숨김 레이어 필요** |
| **보관(archive)** | 콘텐츠 원본 | 라이브러리에서 숨김, 복원 가능 | 콘텐츠 자체 상태 | ✅ `status='archived'` |
| **삭제** | 콘텐츠 원본 | soft-delete | 사용 중 차단 | ✅ `DELETE /screen-sets/:id` |
| (참고) content_list **카드 표시/숨김** | 콘텐츠 내부 | 콘텐츠 안 카드 visible | 그 콘텐츠 안에서만 | ✅ 편집기(Phase 4) |
| (참고) block **is_visible** | 콘텐츠 내부 | 블록 표시 | 그 콘텐츠 안에서만 | ✅ 스키마 |

> **혼동 주의**: "이 코너에서 숨김"(코너×콘텐츠, 신규)과 "content_list 카드 숨김"(콘텐츠 내부, 기존)은 **다른 층**이다. 코너 운영에서 다루는 것은 전자다.

### 3.1 코너 × 콘텐츠 배정/숨김 — 설계안

현재 콘텐츠는 `tablet_id`로 한 코너에 바인딩되거나 NULL(매장 공유)이다. "한 콘텐츠를 여러 코너에서 + 코너별 숨김"을 위해 **배정 레이어**가 필요.

- **권장(additive 신규 테이블)** `store_tablet_corner_content`
  - `(organization_id, tablet_id, screen_set_id, hidden BOOLEAN DEFAULT false, sort_order, ...)`, unique `(tablet_id, screen_set_id)`.
  - 콘텐츠는 org 라이브러리(`tablet_id` NULL) 로 두고, 코너에 배정(row 생성). `hidden=true` = "이 코너에서 숨김".
  - `current_screen_set_id`는 그대로 활성 1개.
  - **기존 스키마 무변경**(FK/컬럼 신설만, F3 Store Layer 동결 준수 — 명시 WO 필요).
- **대안(최소)**: 배정 없이 org 콘텐츠 전체를 "사용 가능"으로 보고, 코너별 숨김만 별도 테이블 `store_tablet_corner_hidden_content(tablet_id, screen_set_id)` 로 관리. 배정 개념 없이 숨김만.

→ 후속 구현 WO에서 택1(권장=배정 테이블).

---

## 4. 템플릿별 미리보기 구조

- **원칙**: 각 콘텐츠의 **실제 `template_key`가 반영**되어야 한다. 모든 콘텐츠가 같은 화면으로 보이면 안 됨.
- **재사용 가능**: kiosk `TabletKioskPage`는 이미 `template_key`별 레이아웃 분기(대기 영상형/코너 소개형/제품 진열형/상품 집중형/기본)를 갖는다. 미리보기 = 이 뷰어를 **모달 내부에 스코프**로 렌더(전체화면 fixed 스타일은 미리보기 컨테이너로 제한 필요).
- **입력**: 미리보기는 저장된 Set의 resolve 결과가 필요 → `GET /tablet/screen` 은 **적용된 코너 기준**이라, 미적용 콘텐츠 미리보기에는 **screen_set_id 기준 resolve(미적용 preview) 경로가 없음**(현재 preview는 적용본만). → 후속: `GET /screen-sets/:id/preview`(서버 resolve, 무적용) 또는 관리 토큰 기반 미리보기.
- 미리보기 흐름(모달):
  ```
  대기 영상형 → 영상 + "화면을 터치하세요 / Touch to start" → (하단) 코너 설명·콘텐츠·제품·QR
  코너 소개형 → 코너 설명·콘텐츠·QR (상품 생략)
  제품 진열형 → 제품 그리드·QR
  상품 집중형 → 상품 중심·QR
  ```
- **주의(fixed 스타일)**: `TabletKioskPage`는 `position:fixed; inset:0`. 모달 미리보기용으로는 컨테이너 스코프 렌더(축소/landscape 프레임) 옵션이 필요 → 후속 구현에서 뷰어에 "embedded/preview" 모드 or iframe(`/tablet/:slug?preview=`) 고려.

---

## 5. 태블릿과 QR의 동일 콘텐츠 제공 방식

### 5.1 요구
- 태블릿 콘텐츠 1개 → **태블릿 화면** + **QR 모바일 화면**(같은 원본).
- QR 화면 = **대기 동영상 제외**, 나머지 동일: 코너 설명 / 콘텐츠 목록 / 제품 목록 / 콘텐츠 상세 / 제품 상세.
- 목적: 한 사람이 태블릿을 봐도 다른 소비자가 각자 폰에서 동시 이용. **태블릿용/QR용 콘텐츠를 별도로 작성·관리하지 않음.**

### 5.2 현재 (조사)
- **데이터/API는 이미 존재·공개**: `GET /:slug/tablet/screen?tabletId=` 가 corner_description / content_list 카드 / product_list / idle_media / qr_guide 를 무인증으로 반환. `/tablet/products`, 콘텐츠·상품 resolve(canonical+store content+다국어)도 공개.
- **미러 라우트/컴포넌트 없음**: 유일 소비자는 fullscreen kiosk. `TabletKioskPage`는 가로 kiosk + **idle 포함** → 그대로 폰 미러로 쓰면 idle 영상·kiosk chrome 동반.
- `qr_guide.url` = 수동 자유 텍스트, 자동 딥링크 없음.

### 5.3 설계 (동일 원본, 렌더만 분리)
```
                      ┌───────────────────────────┐
 screen_set (원본)  → │ GET /:slug/tablet/screen   │
 (blocks, content_list│   ?tabletId=  (공개)        │
  · product_list …)   └───────────┬───────────────┘
                                  │  같은 sections
              ┌───────────────────┴────────────────────┐
   [태블릿] TabletKioskPage(가로, idle 포함)   [QR 모바일] 신규 mobile mirror
                                              = 같은 sections에서 idle_media만 제외,
                                                세로 카드 레이아웃(코너 설명/카드/상품/상세)
```
- **동일 콘텐츠 원본 사용**(별도 저작 없음). 차이 = **렌더 레이어**뿐(idle 제외 + 세로 폰 레이아웃).
- **재사용**: content_list/product resolve, `ContentRenderer`(DOMPurify), 카드/상세 모달 패턴.
- **접근 정책**: 공개(무인증) — 기존 `/tablet/screen` 그대로. QR 화면 라우트도 공개.

### 5.4 QR 딥링크 (자동)
- 목표: `qr_guide` 의 QR = "이 코너의 모바일 미러" 로 자동 연결.
- 방식(택1, 후속):
  - (A) 신규 공개 라우트 `/(t|m)/:slug?tabletId=` 를 QR 대상으로 **자동 생성**(운영자가 URL 안 적어도 됨). qr_guide.url 비어 있으면 이 딥링크를 기본값으로.
  - (B) 기존 `qr_guide.url` 자유 입력은 유지하되, 비었을 때 코너 미러 딥링크를 **fallback**.
- **원본 무추가**: QR 화면은 screen_set 을 재사용(별도 콘텐츠·별도 저장 없음).

---

## 6. 상단 UI 정비 (설계)

| 요소 | 현재 | 목표 |
|------|------|------|
| 운영 안내 | 버튼→모달 | 유지(작은 도움말 버튼) |
| 고객 화면 미리보기 | 상단 버튼 | **상단에서 제거** → 콘텐츠 카드별 작은 미리보기 버튼(모달) |
| 코너 추가 | 상단 버튼 | 작은 보조 버튼 |
| 저장 | 상단 항상 노출 | **콘텐츠 편집 중에만 표시**(맥락형) |
| [코너별 운영]/[태블릿 콘텐츠] | 없음 | 상단 탭 신설 |

---

## 7. 조사 항목 응답 (WO §조사 항목)

| 항목 | 결과 |
|------|------|
| Screen Set ↔ 코너 관계 | 코너(`store_tablets`).`current_screen_set_id` → Set. Set.`tablet_id`(nullable) = 소속/공유 힌트. 활성 1개 |
| 같은 콘텐츠 여러 코너 사용 | 데이터상 가능(current_screen_set_id 다대일 + tablet_id NULL 공유). **UI/배정 레이어는 없음** |
| 코너별 표시·숨김 저장 | **현재 없음**. 배정/숨김 테이블 신설 필요(§3.1) |
| 콘텐츠 교체 API | `POST/DELETE /tablets/:id/current-screen-set` (active 필수) |
| 복제·보관·삭제 | 보관=status archived ✅ / 삭제=soft-delete ✅(사용 중 차단) / **복제=없음(신규 필요)** |
| 템플릿별 viewer 재사용 | ✅ `TabletKioskPage` template_key 분기 존재. 단 미적용 preview resolve 경로·embedded 모드 필요 |
| 태블릿·QR 공통 데이터 | ✅ `GET /tablet/screen`(공개) 단일 소스. 미러 렌더 레이어만 신규 |
| QR URL·접근 정책 | 공개(무인증). qr_guide.url=수동 자유 텍스트, 자동 딥링크 없음 |

---

## 8. 필요한 후속 구현 WO (분리)

우선순위는 실제 사용 흐름 기준. **이 IR은 설계뿐 — 아래는 별도 WO로 착수.**

```
1. WO ...-CONTENT-LIBRARY-TAB-SPLIT-V1
   상단 [코너별 운영]/[태블릿 콘텐츠] 탭 분리 + 콘텐츠 라이브러리 목록(기존 screen-set API 재사용).
   상단 UI 정비(미리보기→카드, 코너추가 보조, 저장 맥락형). 프론트 only.

2. WO ...-SCREEN-SET-DUPLICATE-V1
   콘텐츠 복제 엔드포인트(POST /screen-sets/:id/duplicate, blocks 포함 복사). backend additive.

3. WO ...-CORNER-CONTENT-ASSIGNMENT-V1
   코너×콘텐츠 배정 + "이 코너에서 숨김"(신규 테이블 store_tablet_corner_content, additive).
   → F3 Store Layer 동결 관련 명시 WO 필요.

4. WO ...-CONTENT-PREVIEW-MODAL-V1
   콘텐츠 카드별 미리보기 모달(template_key 반영). 미적용 preview resolve(GET /screen-sets/:id/preview)
   + TabletKioskPage embedded/preview 모드(또는 iframe).

5. WO ...-QR-MOBILE-MIRROR-V1
   공개 모바일 미러 라우트(= /tablet/screen 에서 idle_media 제외, 세로 폰 레이아웃) +
   qr_guide 자동 딥링크(비었을 때 코너 미러 fallback). 원본 무추가.
```

의존: 1 → (2,4 병렬) → 3 → 5. 3은 배정 모델 확정 후.

---

## 9. 금지사항 준수 (이 IR)
- 구현/DB migration/API 변경/운영 샘플 변경/public runtime 변경/kiosk-core 변경 **없음**. read-only 조사 + 설계 문서만.

---

## 10. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 코너=교체·표시·숨김만 | ✅ IA §2.1 (삭제 없음) |
| 콘텐츠 원본 관리=별도 목록 | ✅ IA §2.2 |
| 미리보기=콘텐츠별 모달 | ✅ §4 |
| 템플릿별 실제 화면 차이 반영 | ✅ §4(template_key 분기 재사용) |
| 태블릿·QR 같은 원본 | ✅ §5(단일 /tablet/screen 소스) |
| QR=대기 동영상 제외 동일 콘텐츠 | ✅ §5.3(idle_media 제외 렌더) |
| 후속 구현 단계 분리 | ✅ §8 (5 WO) |
| 문서 commit/push | ✅ |

---

*태블릿 콘텐츠=Screen Set(template_key+blocks). 코너=store_tablets(current_screen_set_id 활성 1개). 코너 운영=교체·표시·숨김(삭제 없음), 콘텐츠 관리=CRUD+복제+미리보기 모달. "이 코너에서 숨김"=신규 코너×콘텐츠 배정/숨김 레이어(현재 없음). 복제=신규 엔드포인트. 태블릿·QR=단일 공개 /tablet/screen 원본, QR 미러=idle 제외 세로 렌더 레이어만 신규(데이터/API 이미 공개). qr_guide=수동 URL→자동 딥링크 후속. 후속 5 WO 분리.*
