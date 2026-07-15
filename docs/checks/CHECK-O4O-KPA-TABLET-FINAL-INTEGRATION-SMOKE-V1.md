# CHECK-O4O-KPA-TABLET-FINAL-INTEGRATION-SMOKE-V1

> 성격: 통합 검증 — 태블릿 전체 흐름 실측 + 발견된 실제 결함만 수정.
> 범위 결정: `표시·숨김 백엔드`는 **의도적으로 건너뜀**(사용자 판단: 숨김 ≈ 코너에서 제거, 실제 요구 미확인 → 상태만 3개로 늘리는 과설계).
> Date: 2026-07-15

---

## 0. 결론

**PASS + 결함 1건 발견·수정.**
전체 흐름(제작 → 저장 → 연결 → 전환 → 공개 반영 → 제거)을 배포본에서 실측했다. **보관 정책이 경로마다 다르게 동작하는 실제 결함**을 찾아 수정·재검증했다. 보호 샘플 무결성 유지.

## 1. 통합 smoke 결과

| # | 흐름 | 결과 |
|---|------|------|
| A | **신규 제작**(그동안 미검증 경로) — 템플릿 카드 → 기본 정보 → 대기 화면 → 코너 설명 → 추가 정보 → 저장 | ✅ `POST /screen-sets 201` + `PUT /blocks 200`, toast `"…생성됨"`, 리스트 복귀 |
| A-2 | 신규 세트 QR 자동 확보 | ✅ `publicQrSlug = tablet-corner-3` (저장 시 멱등 생성) |
| A-3 | 재진입 hydrate | ✅ name / `templateKey=corner_overview_qr` / 코너설명 title·body 유지 |
| A-4 | **블록 자동 준비** | ✅ 5블록 `idle_media, corner_description, content_list, product_list, qr_guide` |
| B | 코너 연결(기존 콘텐츠 추가) | ✅ `201`, 코너 목록 표시 |
| B-2 | **점 3개 메뉴** | ✅ `["미리보기","이 화면 사용","코너에서 제거"]` |
| B-3 | **콘텐츠 미리보기** | ✅ 모달 렌더(저장 원본 read-only) |
| C | 보관 가드 경로 | ❌→✅ **결함 발견·수정**(§2) |
| D | 보호 샘플 무결성 | ✅ 구강 `active/corner_overview_qr/tablet-corner`, 피부 `active/corner_information_basic_v1/tablet-corner-2` |
| E | console / pageerror / API 4xx·5xx | ✅ 0건(의도한 409 제외) |

## 2. 발견된 결함 — 보관 정책 경로 불일치 (수정 완료)

### 증상 (수정 전 · 실측)

임시 콘텐츠(연결됨 · 비현재) 기준:

| 경로 | 결과 |
|------|------|
| `PATCH /screen-sets/:id {status:'archived'}` | **409 `ARCHIVE_BLOCKED_CONNECTED`** — "1개 코너에 연결되어 있어 보관할 수 없습니다" |
| `DELETE /screen-sets/:id` — **UI '보관' 버튼이 쓰는 경로** | **200 `{deleted:true}`** |

→ 같은 "보관" 의도가 경로에 따라 정반대. **보관 버튼을 누르면 연결된 코너에서 콘텐츠가 조용히 사라졌다**(연결 목록 3 → 2). 공개·관리 GET 이 `deleted_at IS NULL` 로 JOIN 하므로 **경고 없이 없어지고, 링크 행만 DB 에 잔존**(soft delete 라 FK CASCADE 미발동).

### 수정

`DELETE /screen-sets/:id` 에 `PATCH` 와 동일한 연결 가드 추가 — `ASSIGNMENT-MODEL-V1 §6`("현재/연결 시 보관 거부 · 자동 연결 삭제 없음") 에 두 경로를 일치.
현재 사용 중 가드의 영문 메시지도 업무 언어로 정리(코드 `SCREEN_SET_IN_USE` 는 프론트 매핑 보존 위해 불변).
**프론트 무변경** — `err.message` 폴백이 서버 한글 메시지를 그대로 노출.

> 이 수정이 안전한 이유: `CORNER-CONTENT-LINK-UI-V1` 이 **코너에서 제거(연결 해제)** UI 를 제공하므로 사용자에게 탈출 경로가 있다. (연결 해제 UI 가 없던 시점에 이 가드를 넣었다면 보관이 영구히 막혔을 것 — 그래서 당시 후속으로 미뤘다.)

### 수정 후 재검증 (배포본 실측)

```
미연결 세트          → DELETE 200            (정상 보관 가능)
연결된 세트 PATCH    → 409 ARCHIVE_BLOCKED_CONNECTED
연결된 세트 DELETE   → 409 ARCHIVE_BLOCKED_CONNECTED   ← 일치
연결 해제 후 DELETE  → 200                   (탈출 경로 동작)
```
**두 경로 일치 = true.**

| 검증 | 결과 |
|------|------|
| api-server `tsc -p tsconfig.build.json` | ✅ EXIT=0 |
| `jest` 태블릿 | ✅ **29 PASS** |
| API 배포 | ✅ Deploy API Server (Cloud Run) run 29420233041 success |

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | `DELETE /screen-sets/:id` 에 연결 가드 추가 + 현재 사용 중 메시지 업무 언어화 |

DB migration 없음. 프론트 변경 없음. kiosk-core·QR 계약 무변경.

## 4. 데이터 상태

```
구강관리 코너 연결: [구강관리 기본 화면 세트(현재), 피부관리 기본 화면 세트]
보호 샘플 2건: 원본 무결(status/template/QR slug 불변)
```
- 통합 검증용 임시 콘텐츠(`통합 점검용 화면(임시)` 외 2건)는 **보관 처리**되어 목록에서 보이지 않는다(신규 제작 경로 검증 산출물).
- 수정 전 결함으로 생겼던 **dangling link 1건(보관된 세트 → 링크 행)은 제거**했다. 이는 테스트 데이터 은폐가 아니라 결함이 만든 정합성 깨짐의 정리이며, 수정 후에는 같은 상태가 생길 수 없다.

## 5. 남은 항목 (요구 확인 시)

```
복제(SCREEN-SET-DUPLICATE)  — 운영 필요성 확인되면
표시·숨김(is_visible)        — 실제 요구 생기면(현재 '코너에서 제거'로 충분)
```

## 6. smoke 기술 메모

- 인증 API 직접 호출은 **`localStorage.o4o_accessToken` Bearer** 필요(쿠키만으로는 `401 AUTH_REQUIRED`).
- 표준 `RowActionMenu` kebab 트리거 = `button[title="더보기"]`, 드롭다운 항목은 `role` 없는 plain button(카드 범위로 스코프 필요). 카드의 `getByRole('button').last()` 는 kebab 이 아니라 비활성 `아래로` 버튼을 잡는다.
- 성공 toast 는 3초 자동 소멸 → 캡처하려면 대기 3초 미만.

---

*통합 smoke: 신규 제작(201+200·QR 자동·hydrate·5블록 자동준비) · 연결/점3개/미리보기 · 보호 샘플 무결 · 오류 0. 결함 1건: 보관 가드가 DELETE(=UI 보관 버튼) 경로에만 없어 연결된 콘텐츠가 코너에서 조용히 사라짐 → PATCH 와 동일 가드 추가, 두 경로 일치 재검증(tsc0·jest29·배포 success). 표시·숨김은 의도적 미구현.*
