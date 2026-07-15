# IR-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-DESIGN-V1

> WO: `WO-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-DESIGN-V1`
> 성격: **설계·조사 전용(read-only)**. migration/API/UI 구현·운영 데이터 변경 없음.
> 선행: `IR-O4O-KPA-TABLET-CONTENT-LIBRARY-AND-CORNER-ASSIGNMENT-DESIGN-V1`(§3.1 배정 레이어 스케치)
> Date: 2026-07-15

---

## 0. 요약

하나의 **코너**(`store_tablets`)에 **여러 태블릿 콘텐츠**(Screen Set)를 **연결**하고, 그중 하나를 **현재 콘텐츠**로 빠르게 전환하는 운영 구조를 확정한다.

핵심 결론:

1. **연결 = 신규 테이블 `store_tablet_corner_content`**(additive). 코너×Screen Set 다대다 연결의 SSOT. **콘텐츠 원본을 복사하지 않고 링크만** 만든다.
2. **현재 콘텐츠 = 기존 `store_tablets.current_screen_set_id` 유지**(활성 1개). 불변식: current 는 **연결된 + active** Screen Set 중 하나(legacy=NULL 허용).
3. **추가/제거/보관/전환** 4 동작을 서로 다른 층으로 분리(연결 CRUD ↔ 콘텐츠 원본 상태 ↔ current 전환).
4. **현재 콘텐츠 제거 시 자동 전환하지 않음** — 다른 콘텐츠 선택 또는 legacy 복귀를 **명시적** 처리(409 가드).
5. 신규 데이터 구조는 **연결 테이블 1개**뿐. 기존 스키마/current 계약/공개 runtime 불변. F3 Store Layer 동결 관련 별도 구현 WO 필요.

---

## 1. 현재 구조 조사 (사실, read-only)

| 항목 | 사실 |
|------|------|
| 코너 | `store_tablets`(1행=1코너). `current_screen_set_id`(활성 콘텐츠 1개, FK `ON DELETE SET NULL`) |
| 콘텐츠 | `store_tablet_screen_sets`(template_key + blocks). `tablet_id`(nullable) = 소속/공유 힌트, `status`(draft/active/archived/operator_template), `public_qr_slug` |
| 현재 적용 | `POST /tablets/:id/current-screen-set` — set org 일치 + **status='active' 필수(409 `SCREEN_SET_NOT_ACTIVE`)** → `current_screen_set_id` UPDATE |
| 해제 | `DELETE /tablets/:id/current-screen-set` → NULL(legacy 복귀) |
| 콘텐츠 삭제 가드 | `DELETE /screen-sets/:id` — `current_screen_set_id = set.id` 사용 중이면 차단 |
| 콘텐츠 목록 | `GET /screen-sets?tabletId=` — 프론트가 `tablet_id` 로 코너 바인딩 조회(현재 1코너=자기 tablet_id + null 공유) |
| **코너×콘텐츠 연결** | **없음**. 코너는 "current 1개 + tablet_id 로 느슨히 바인딩된 목록"만 표현. 다중 연결·표시/숨김·순서 개념 부재 |

**한계**: 코너에 "이 코너에서 쓸 수 있는 콘텐츠 여러 개"를 명시적으로 연결하고, 코너별 표시/숨김/순서를 저장하며, current 를 그 목록 안에서 빠르게 바꾸는 구조가 없다.

---

## 2. 목표 구조

```
store_tablets (코너)
 ├─ current_screen_set_id ─────────────► 현재 콘텐츠 1개 (기존, 유지)
 └─ store_tablet_corner_content (신규 연결) ─┬─► Screen Set A (피부관리 기본)
                                            ├─► Screen Set B (피부관리 중국어)
                                            └─► Screen Set C (피부관리 영어)
```

- 코너 = current 1개 + **연결된 Screen Set 목록**(0..N).
- Screen Set 은 **여러 코너에 재사용 가능**(연결 행이 코너별로 존재; 원본 1개 공유).

---

## 3. 연결 모델 — `store_tablet_corner_content` (확정)

**신규 테이블(additive)**. 코너×Screen Set 연결의 SSOT.

| 컬럼 | 타입 | 역할 |
|------|------|------|
| `id` | uuid PK | |
| `organization_id` | uuid NOT NULL | 경계(코너 org = set org = 이 값) |
| `tablet_id` | uuid NOT NULL | 코너(store_tablets) |
| `screen_set_id` | uuid NOT NULL | 연결 콘텐츠 |
| `sort_order` | int NOT NULL DEFAULT 0 | 코너 내 표시 순서 |
| `hidden` | boolean NOT NULL DEFAULT false | 코너에서 숨김(연결 유지, 선택 목록에서 감춤) |
| `created_at` / `created_by_user_id` | | 감사 |

- **UNIQUE `(tablet_id, screen_set_id)`** — 같은 콘텐츠를 한 코너에 중복 연결 금지.
- FK: `tablet_id → store_tablets(id) ON DELETE CASCADE`(코너 삭제 시 연결 정리), `screen_set_id → store_tablet_screen_sets(id) ON DELETE CASCADE`(원본 삭제 시 연결 정리). **연결 삭제 ≠ 원본 삭제**.
- 인덱스: `(organization_id, tablet_id)`, `(screen_set_id)`.
- **current 는 이 테이블에 저장하지 않는다** — `store_tablets.current_screen_set_id` 그대로. (연결 목록 ⊇ {current}).

> 선행 IR(§3.1)의 `store_tablet_corner_content` 스케치를 **채택·확정**. `tablet_id` 컬럼(Screen Set 소속 힌트)은 **legacy/origin** 으로 남기고, **연결의 진실은 이 테이블**로 이동(Screen Set 은 org 라이브러리 성격).

---

## 4. 4개 동작 계약 (§핵심 정책)

| 동작 | 정의 | 데이터 | 원본/타 코너 |
|------|------|--------|-------------|
| **코너에 추가** | 원본 복사 없이 **연결만 생성** | `store_tablet_corner_content` INSERT | 무영향 |
| **코너에서 제거** | **연결만 삭제** | 연결 행 DELETE | 원본·타 코너 유지 |
| **콘텐츠 보관** | **원본 상태 변경** | `screen_set.status='archived'` | 원본 자체(모든 코너에서 current 불가) |
| **현재 콘텐츠 전환** | current 변경(빠른 교체) | `current_screen_set_id` UPDATE | 무영향 |
| (참고) **표시/숨김** | 코너 선택 목록에서 감춤 | 연결 `hidden` | 코너 한정 |
| (참고) content_list 카드 표시/숨김 | 콘텐츠 **내부** | block config | 콘텐츠 내부 |

### 4.1 불변식
- **current ∈ 연결 목록**: current 로 전환하려면 그 Screen Set 이 코너에 **연결**되어 있어야 한다(전환 시 미연결이면 자동 연결 or 400 — §6 택1). current 는 **active** 여야 한다(기존 게이트 유지).
- **archived 콘텐츠**: current 불가(기존 409). 연결은 유지 가능하나 선택 목록에서 비활성/숨김 표기. archived → current 전환 차단.
- **org 경계**: 연결 3자(코너/연결/Set) organization_id 일치 필수. 교차 org 연결 차단.

### 4.2 현재 콘텐츠 제거 처리 (§핵심)
- 코너에서 **현재 사용 중(current) 콘텐츠의 연결을 제거**하려 하면 **자동 전환하지 않는다**.
  - 기본: **409 `CURRENT_IN_USE`** — "먼저 다른 콘텐츠를 현재로 선택하거나 적용을 해제해 주세요".
  - 명시 경로 2택: ① 다른 연결 콘텐츠를 current 로 전환 후 제거, ② current 해제(legacy 복귀, `current_screen_set_id=NULL`) 후 제거.
- 즉 "제거"가 조용히 current 를 바꾸거나 legacy 로 떨어뜨리지 않는다(운영 사고 방지).

---

## 5. 재사용 / 순서 / 표시·숨김

- **재사용**: 같은 Screen Set 을 여러 코너에 연결 → 코너별 연결 행. 원본 1개, 편집은 모든 연결 코너에 반영(원본 공유). (코너별 override 는 이번 범위 밖.)
- **순서**: `sort_order` — 코너 콘텐츠 목록 표시 순서. 위/아래(빠른 교체 UI).
- **표시/숨김**: `hidden` — 연결 유지하며 선택 목록에서 감춤(계절/임시 비노출). current 인 콘텐츠는 hidden 불가(또는 hidden 시 current 해제 명시).

---

## 6. 빠른 교체 API (설계, 구현은 후속)

| 목적 | 엔드포인트(안) | 비고 |
|------|---------------|------|
| 코너 콘텐츠 목록 | `GET /tablets/:id/contents` | 연결 Set 목록 + `isCurrent`/`hidden`/`sortOrder` + set 메타(name/template/status/blockCount/publicQrSlug) |
| 코너에 추가 | `POST /tablets/:id/contents { screenSetId }` | org 검증 + 미삭제 + 중복(UNIQUE) 방지. 연결만 |
| 코너에서 제거 | `DELETE /tablets/:id/contents/:screenSetId` | current 면 **409 CURRENT_IN_USE** |
| 표시/숨김·순서 | `PATCH /tablets/:id/contents/:screenSetId { hidden?, sortOrder? }` | 연결 속성 |
| 현재 전환(빠른 교체) | `POST /tablets/:id/current-screen-set`(기존 확장) | **연결 필수 + active 필수**. 미연결 시 자동 연결(택1) 또는 400 |
| 현재 해제 | `DELETE /tablets/:id/current-screen-set`(기존) | legacy 복귀 |

- 모든 관리 API = 기존 owner 인증 + org 경계 유지. 공개 runtime 무변경(current 기준 그대로).
- **전환 시 미연결 처리 결정 필요(§11 오픈 이슈)**: (A) 전환이 곧 연결(없으면 자동 INSERT) — UX 단순 / (B) 반드시 먼저 추가 — 명시적. 권장 A(전환=연결 보장), 단 명시적 "추가" 도 별도 제공.

---

## 7. archived / 상태 게이트

- **archived Screen Set**: current 전환 차단(기존 409). 연결은 남을 수 있으나 목록에서 "보관됨" 비활성 표기. 신규 연결 추가는 허용하되 current 승격 불가(또는 추가 자체 차단 — §11 택1, 권장: 추가 허용/‌current 차단).
- **deleted Screen Set**: FK CASCADE 로 연결 자동 제거.
- **코너 삭제**: 연결 CASCADE 정리. current 는 FK SET NULL(기존).

---

## 8. 백필 (설계, 구현은 후속)

기존 데이터를 연결 테이블로 이관(원본/이름/slug/블록 무변경).

- **규칙 1 — current**: `store_tablets.current_screen_set_id IS NOT NULL` 인 코너 → 그 (tablet, current_set) 연결 행 ensure(없으면 INSERT). current 는 반드시 연결 목록에 포함(불변식 §4.1).
- **규칙 2 — tablet_id 바인딩**: `store_tablet_screen_sets.tablet_id IS NOT NULL` 인 Set → (tablet_id, set) 연결 행 ensure(기존 "이 코너 소속" 을 연결로 승격).
- 멱등: UNIQUE(tablet_id, screen_set_id) + `ON CONFLICT DO NOTHING`. 청크 실행, 실행 전/후 집계 기록.
- **org 일치 검증**: 연결 3자 org 동일한 경우만. 불일치는 skip + 기록.
- 보호 샘플(구강 7280…/피부 8c6e…): current 연결 행 생성 대상(구현 WO에서, 원본 무변경).

---

## 9. 모바일 중심 코너 관리 UI (설계, 구현은 후속)

- 코너 카드 홈(기존 TOUCH-FIRST 재사용) → 코너 선택 →
  - **현재 사용 중 콘텐츠**(강조) + **연결된 다른 콘텐츠 목록**(hidden 배지, sort).
  - 액션(터치 44px): `이 콘텐츠 사용`(빠른 교체) · `코너에서 숨김/표시` · `코너에서 제거`(current 면 가드 안내) · `코너에 콘텐츠 추가`(라이브러리 picker).
  - current 제거 시도 → "먼저 다른 콘텐츠를 사용하거나 적용을 해제" 안내(§4.2).
- 편집(블록)·미리보기는 기존 화면 재사용. 이 트랙은 **연결·교체 운영**에 집중.

---

## 10. 조사 항목 응답 (WO §조사·설계 범위)

| 항목 | 결과 |
|------|------|
| 현재 current 적용 구조 | `current_screen_set_id` 1개, active 필수 409, ON DELETE SET NULL |
| 코너×Set 연결 테이블 필요 | **필요** → `store_tablet_corner_content`(§3) |
| 동일 콘텐츠 다중 코너 재사용 | 연결 행 코너별 존재(원본 1개 공유) |
| 연결 순서·표시/숨김 | `sort_order` + `hidden`(연결 속성) |
| 제거 vs 원본 보관/삭제 분리 | 제거=연결 DELETE / 보관=status / 삭제=원본 soft-delete(§4) |
| 현재 콘텐츠 제거 처리 | **자동 전환 없음, 409 명시**(§4.2) |
| archived 연결 차단 | current 차단(§7) |
| org 경계 | 연결 3자 org 일치(§4.1) |
| 빠른 교체 API | §6(list/add/remove/hide·sort/switch) |
| 모바일 코너 관리 UI | §9 |
| 기존 적용 백필 | §8(current + tablet_id 승격, 멱등) |
| 운영 샘플 보호 | 원본/이름/slug/블록 무변경, 연결 행만 |

---

## 11. 오픈 이슈 (구현 WO 착수 전 결정)
1. **전환 시 미연결**: (A) 자동 연결(권장) / (B) 반드시 먼저 추가.
2. **archived 콘텐츠 신규 연결**: 허용(권장, current 만 차단) / 차단.
3. **current 콘텐츠 hidden**: 금지(권장) / hidden 시 current 자동 해제(명시).
4. **tablet_id 컬럼 향후**: legacy 유지(권장) / 연결 테이블 이관 후 deprecate.

---

## 12. 후속 구현 WO (분리)
```
1. WO ...-CORNER-CONTENT-SCHEMA-V1
   store_tablet_corner_content 테이블(additive migration) + org/FK/UNIQUE/인덱스. F3 Store Layer 동결 명시 WO.
2. WO ...-CORNER-CONTENT-API-V1
   list/add/remove(current 가드)/hide·sort/switch(연결·active 불변식). owner 인증·org 경계.
3. WO ...-CORNER-CONTENT-BACKFILL-V1
   기존 current + tablet_id 바인딩 → 연결 행 ensure(멱등·청크·집계). 보호 샘플 포함.
4. WO ...-CORNER-CONTENT-MOBILE-UI-V1
   모바일 코너 관리(현재/연결 목록·빠른 교체·표시숨김·추가·제거 가드).
```
의존: 1 → 2 → (3 병렬 가능) → 4. §11 오픈 이슈는 2 착수 전 확정.

---

## 13. 금지사항 준수 (이 IR)
- DB migration/API/UI 구현·운영 데이터 변경·보호 샘플 변경 **없음**. read-only 조사 + 설계 문서만.

---

## 14. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 연결 모델 확정 | ✅ `store_tablet_corner_content`(§3) |
| current ↔ 연결 목록 관계 확정 | ✅ current ∈ 연결, current=기존 컬럼(§4.1) |
| 추가·제거·전환 계약 확정 | ✅ §4·§6 |
| 백필 방식 확정 | ✅ §8 |
| 후속 구현 WO 분리 | ✅ §12(4 WO) |
| commit/push | ✅ |

---

*코너×콘텐츠 다대다 = 신규 store_tablet_corner_content(tablet_id·screen_set_id·sort_order·hidden, UNIQUE(tablet,set), FK CASCADE, org 일치). current=기존 current_screen_set_id 유지(∈연결·active). 추가=연결 INSERT(복사X)/제거=연결 DELETE(current면 409 자동전환 없음)/보관=status/전환=current UPDATE. 표시숨김=연결 hidden, 순서=sort_order. archived→current 차단. 백필=current+tablet_id 바인딩→연결 ensure(멱등). API/UI/migration=후속 4 WO. 코드·데이터 무변경.*
