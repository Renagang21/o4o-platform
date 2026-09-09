# CHECK — PharmacyHub Screen Set QR Public Viewer & QR Parity Final Closure V1

**WO**: `WO-O4O-PHARMACYHUB-SCREENSET-QR-PUBLIC-VIEWER-AND-QR-PARITY-FINAL-CLOSURE-V1`
**작업일**: 2026-09-09
**선행**: `ca5b6e8ff` · `e821e2e55` (WO-O4O-STORE-QR-CANONICAL-ADOPTED-IMPLEMENTATION-GAP-AUDIT-AND-PH-SCREENSET-FINAL-CLOSURE-V1)
**결과**: **CLOSED** — 4개 완료 조건 전부 PASS

---

## 0. 이번 회차의 성격 — 구현은 이미 끝나 있었다

착수 시 실측 결과 **§2~§8(조사·계약·승격·전환)은 선행 커밋 `ca5b6e8ff` 에서 이미 완료**돼 있었다.
따라서 이번 회차의 실제 작업은 **§9 동일성 검증 · §10 잔여물 정리 · §11 E2E · §12 기록**이다.

**코드 변경 0.** 중복 구현을 만들지 않기 위해 먼저 상태를 확인했고, 재구현하지 않았다.

| WO 단계 | 상태 | 근거 |
|---|:---:|---|
| §2 KPA viewer 의존성 조사 | 완료(선행) | viewer 가 이미 서비스 밖으로 승격됨 |
| §3 KPA/PH landing 응답 타입 비교 | 완료(선행) | 양쪽 다 공통 `resolvePublicQrLanding` 위임 |
| §4 screen_set payload 공통 계약 | 완료(선행) | 공통 resolver 가 `screenSet` 를 additive 로 생성 |
| §5 공통 viewer 승격 위치 | 완료(선행) | `packages/tablet-kiosk-core/src/PublicScreenSetViewer.tsx` |
| §6 KPA 를 공통 viewer 소비자로 | 완료(선행) | `web-kpa-society/src/pages/qr/QrLandingPage.tsx:165` |
| §7 PH publicLanding screenSet | 완료(선행) | `PharmacyHubStoreQrController.publicLanding` → 공통 resolver |
| §8 PH QrLandingPage 연결 | 완료(선행) | `web-pharmacy-hub/src/pages/QrLandingPage.tsx:75` |
| §9~§14 | **이번 회차** | 아래 |

원칙 준수 확인: **PH 전용 viewer 신규 생성 0** · 복사 0(승격) · `screenSet` additive · Placement 미접촉 ·
`store_qr_codes.type` DROP 미실행.

---

## 1. §9 KPA / PH 공개 QR 동일성 (production 실측)

```text
GET /api/v1/{kpa|pharmacy-hub}/qr/public/{slug}
```

| 대상 | landingType | contentSource | screenSet | sections (순서) |
|---|---|---|:---:|---|
| KPA `tablet-corner-2` | `screen_set` | `TABLET_SCREEN_SET` | ✅ | corner_description(169) · content_list(4) · product_list(**corner_display**, 3) · qr_guide |
| KPA `tablet-corner-5` | `screen_set` | `TABLET_SCREEN_SET` | ✅ | corner_description(233) · content_list(5) · product_list(**corner_display**, 3) · qr_guide |
| PH `a-2-2` | `screen_set` | `TABLET_SCREEN_SET` | ✅ | corner_description(0) · content_list(0) · product_list(**selected**, 6) · qr_guide |
| PH `c-2` | `screen_set` | `TABLET_SCREEN_SET` | ✅ | 동일 구조 · product_list(selected, 6) |
| PH `f-2` | `screen_set` | `TABLET_SCREEN_SET` | ✅ | 동일 구조 · product_list(selected, 6) |

**판정: PASS.**

- 응답 **계약**(필드·타입·section 종류·정렬 순서)이 KPA/PH 동일하다.
- `selectionMode` 가 `corner_display`(KPA) / `selected`(PH) 로 다른 것은 **계약 차이가 아니라 저작 상태 차이**다 —
  KPA 코너는 진열 기반, PH 코너는 명시 선택 기반이며 둘 다 canonical 3단 계약의 정상 분기다.
- PH 의 `corner_description(len=0)` · `content_list(0)` 역시 그 세트의 저작 내용이 비어 있는 것이며
  뷰어·resolver 계약과 무관하다.
- Tablet resolver 와 QR resolver 의 **내용 의미 분기 0** — 같은 `resolveScreenSetSections` 산출을 쓴다.

---

## 2. §10 검증 잔여물 정리 — canonical UI/API 경로만 사용

선행 CHECK §14-A 가 남긴 2건을 정리했다. **SQL 직접 수정 0** (WO 명시 제약).

| 대상 | 착수 시 상태 | 조치 | 결과 |
|---|---|---|---|
| PH `e2e-qr-mttrdan3` "[E2E] 외부 링크 QR 검증" | **이미 `is_active=false`** (07:10:01 갱신) | 조치 불필요 | 공개 랜딩 404 · 정리됨 |
| KPA `qr-1788937224442` "뇌선 다국어 안내 (E2E 확인)" | `is_active=true` · E2E 표식 잔존 | ① `PUT /kpa/pharmacy/qr/{id}` 제목 복원<br>② `DELETE /kpa/pharmacy/qr/{id}` 내리기 | 제목 `뇌선 다국어 안내` · `is_active=false` |

> 선행 CHECK 는 PH 항목을 "내리기 미완" 으로 적었으나 **실측상 이미 비활성**이었다.
> 기록물이므로 원문을 고치지 않고 여기에 정정 사실만 남긴다 (CLAUDE.md §16-1).

### 2-1. 정리 후 상태

```text
활성 E2E 잔여물          0 건   (title ILIKE '%E2E%' OR slug ILIKE '%e2e%' AND is_active)
store_qr_codes 총 행수   90     (착수 전과 동일 — 삭제·생성 0)
활성 QR                  48
```

두 QR 모두 **행을 지우지 않고 내렸다**(soft). 인쇄물이 있어도 "만료" 안내가 뜨며, 필요하면
`POST /qr/{id}/reactivate` 로 같은 slug 를 되살릴 수 있다.

---

## 3. §11 Production Browser E2E — 7/7 PASS

모바일 뷰포트 390×844 · 비로그인 방문자 · 실브라우저(Playwright).

| # | 대상 | 결과 |
|:---:|---|:---:|
| 1 | PH `/qr/a-2-2` — `A-2 의약품 안내` + 제품 6종(QR 이미지·자세히 보기) | **PASS** |
| 2 | PH `/qr/c-2` — `C-2 건강기능식품 안내` | **PASS** |
| 3 | PH `/qr/f-2` — `F-2 화장품 안내` | **PASS** |
| 4 | KPA `/qr/tablet-corner-2` — 피부관리 · 후시딘연고 · **6,500원** | **PASS** |
| 5 | KPA `/qr/tablet-corner-5` — 구강관리 | **PASS** |
| 6 | 정리된 KPA QR 비공개 — "QR 정보를 찾을 수 없습니다" 카드 · E2E 제목 노출 0 | **PASS** |
| 7 | 정리된 PH QR 비공개 — E2E 제목 노출 0 | **PASS** |

- `표시할 내용이 아직 준비되지 않았습니다` — **5건 모두에서 0회**.
- 가격 표기(`6,500원`) · content_list · product_list 가 KPA/PH 동일 규칙으로 렌더.
- console error 0 · white screen 0 · dead link 0 · not-found shell 0.

### 3-1. 게이트 오탐 정정 (기록)

1차 실행에서 `CLEAN-kpa` 가 FAIL 났다. 원인은 **내려진 QR 의 404 응답을 결함으로 오탐**한 것이다 —
그 404 는 이 시나리오가 **의도한 결과**이고, 화면도 정상 안내 카드("QR 코드가 만료되었거나
유효하지 않습니다")를 렌더하고 있었다. `expectUnavailable` 케이스에서 404 콘솔 오류를 제외하고
안내 문구 존재를 명시 검사하도록 규칙을 좁혀 재측정했다. **제품 결함이 아니었다.**

---

## 4. 검증

| 항목 | 결과 |
|---|---|
| 코드 변경 | **0** (구현은 선행 회차에서 완료) |
| 프로덕션 데이터 변경 | QR 2건 정리(제목 복원 1 · 내리기 1) — **canonical API 경유**, SQL 직접 수정 0 |
| 행 생성·삭제 | **0** (총 90 불변) |
| KPA 회귀 | PASS (screen_set 2건 · 가격 표기 · content_list) |
| PH screen_set 공개 QR | PASS (3건) |
| Placement | 미접촉 |
| `store_qr_codes.type` | 미접촉 (DROP 범위 밖) |

코드 변경이 0이므로 typecheck/build/test 는 선행 커밋(`ca5b6e8ff`, CI 전부 success)의 결과가 유효하다.
이번 회차는 그 위에서 **운영 상태만** 바꿨다.

---

## 5. 문서 정합

문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

- 발견 1건 = 선행 CHECK §14-A 의 「PH `e2e-qr-mttrdan3` 활성 상태로 남음」 서술이 실측과 다름
  (착수 시점 이미 `is_active=false`). 기록물이므로 원문 미수정, 본 문서 §2 에 정정.

---

## 6. 종결 판정

```text
PH SCREEN_SET PUBLIC QR      = PASS
KPA / PH QR PUBLIC PARITY    = PASS
KPA REGRESSION               = PASS
TEST ARTIFACT CLEANUP        = PASS
```

→ `WO-O4O-PHARMACYHUB-SCREENSET-QR-PUBLIC-VIEWER-AND-QR-PARITY-FINAL-CLOSURE-V1` = **CLOSED**

이로써 **QR Phase 1 최종 CLOSED**. 다음 단계는 `Placement + Analytics` 구현이다.
