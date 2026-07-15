# CHECK-O4O-KPA-TABLET-TEMPLATE-PREVIEW-SAVE-SMOKE-V1

> WO: `WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-SAVE-SMOKE-V1`
> 선행: `WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1`
> 성격: 검증 — 배포본에서 **실제 저장까지** 실측(프로덕션 write 포함).
> Date: 2026-07-15

---

## 0. 결론

**PASS.** 기존 보호 샘플 1건(구강관리)으로 템플릿 변경 + 내용 수정 + **실제 저장**을 수행했고, 재진입 hydrate·태블릿 공개 화면·QR 모바일 화면 반영까지 모두 확인했다. 콘솔/pageerror/API 4xx·5xx **0건**.

## 1. 대상 (기존 보호 샘플 — 신규 생성 없음)

| 항목 | 값 |
|------|-----|
| 콘텐츠(Screen Set) | `구강관리 기본 화면 세트` / `7280872e-00d1-4537-b4ef-ac2cef9cd7c1` |
| 코너(Tablet) | `구강관리 코너` / `c86863d8-c792-476c-b4b1-3aa1169a4395` (current = 위 세트) |
| storeSlug | `네뚜레-약국` |
| QR slug | `tablet-corner` |

`피부관리` 보호 샘플은 **미변경**(WO = 1건).

## 2. 수행한 변경 (실제 저장 · 원복 없음)

| 항목 | before | after |
|------|--------|-------|
| `templateKey` | `corner_information_basic_v1` | **`corner_overview_qr`** (코너 소개형) |
| `qr_guide.config.label` | `모바일로 더 보기` | **`휴대폰으로 자세히 보기`** |

**템플릿 선택 근거**: `corner_overview_qr` 의 requiredBlocks(`corner_description`, `qr_guide`)를 이 샘플이 이미 충족하고, 장문 코너 설명 + 코너 콘텐츠 5건 중심인 성격에 부합한다.
`product_grid_qr`(제품 진열형)는 이 샘플의 `product_list.config.items` 가 `[]` 라 데모 품질을 떨어뜨려 배제했다.
내용 수정은 관측 가능한 최소 1건(`qr_guide.label`)으로 한정했고, **원복하지 않으므로** 쓰레기 문자열 대신 자연스러운 문구를 사용했다.

## 3. 검증 결과

| 완료 기준 | 결과 | 근거 |
|-----------|:----:|------|
| 저장 API 성공 | ✅ | `PATCH 200 /screen-sets/7280872e…` + `PUT 200 /screen-sets/7280872e…/blocks` |
| 리스트 복귀 성공 | ✅ | 저장 후 표준 리스트 복귀, 행 노출 확인 |
| 재진입 시 저장값 유지 | ✅ | 재진입 hydrate: `templateKey = corner_overview_qr`, `qr_guide.label = "휴대폰으로 자세히 보기"` |
| 태블릿 화면 반영 | ✅ | 공개(비로그인) `/tablet/네뚜레-약국?tabletId=c86863d8…` → `screen.templateKey = corner_overview_qr`, 새 라벨 노출 **true** / 구 라벨 잔존 **false**. 코너 소개형 레이아웃(영상 없이 설명+QR+콘텐츠 카드) 렌더 |
| QR 모바일 화면 반영 | ✅ | 공개 `/qr/tablet-corner` (390×844) → 코너 안내 영상 + 구강관리 설명 + 코너 콘텐츠 5건 + 제품 4건 렌더 |
| console / pageerror / API 4xx·5xx | ✅ **0건** | 인증 세션 + 공개 2컨텍스트 모두 |
| QR slug 불변(금지) | ✅ | `tablet-corner` 유지(저장은 slug 를 재생성하지 않음 — 이름·템플릿 변경 ≠ slug 변경) |

### 3-1. toast 미포착 (한계 · 실패 아님)

저장 성공 toast 를 캡처하지 못했다 — toast 자동 소멸 3초 < 대기 5초(스크립트 타이밍 실수). 성공 근거는 **저장 API 200 ×2 + 리스트 복귀 + 재진입 hydrate + 공개 화면 반영**으로 충족했다. 후속 smoke 는 대기 시간을 3초 미만으로 조정할 것.

## 4. 금지사항 준수

신규 임시 샘플 생성 ❌ / 보호 샘플 삭제·보관 ❌ / QR slug 변경 ❌ / 테스트 후 자동 삭제 ❌ / 운영 데이터 임의 정리 ❌ — **전부 없음**.
저장된 변경(템플릿·라벨)은 **그대로 존치**한다. 정리가 필요하면 서비스에서 사용자가 직접 수행한다.

## 5. 이번 실측으로 무효화된 기존 전제 (중요)

> **공개 뷰어는 이제 Screen Set 을 소비한다.** 공개 `/tablet/:slug` 응답의 `screen.templateKey = corner_overview_qr` 이며, 저장한 블록(`qr_guide.label`)이 **고객 화면에 그대로 렌더**됨을 확인했다.

이는 `CHECK-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1` §2 / `CHECK-...-CORNER-CONTENT-LINK-UI-V1` 이 근거로 삼았던 **"공개 뷰어가 아직 screen set 을 미소비하므로 legacy(대기화면·화면설정·진열)가 현재 고객 화면을 결정한다"** 는 전제를 **무효화**한다(해당 전제는 2026-07-11 시점 관측이며 이후 구현으로 변경됨).

영향:
- 코너 상세의 legacy 편집기를 "삭제하지 않고 접이식 보존" 한 판단 자체는 **여전히 유효**하다 — 블록이 `idle_media.source = legacy_idle_playlist`, `product_list.source = legacy_tablet_displays` 로 legacy 데이터를 **참조**하므로 편집 경로는 필요하다.
- 다만 근거는 "legacy 가 고객 화면을 결정한다"가 아니라 **"블록이 legacy 데이터를 참조한다"** 로 정정한다.
- 후속: legacy 편집기의 위치·표현을 screen-set 소비 사실에 맞춰 재정리할지 판단 필요(별도 WO).

## 6. 후속

```
③ 보관 가드 일원화 (DELETE 링크 가드) — 연결 해제 UI 확보로 안전
표시숨김(is_visible) 토글: 백엔드 엔드포인트 선행 필요
SCREEN-SET-DUPLICATE-V1 (복제) — 미착수
legacy 편집기 위치 재정리 판단 (§5)
```

---

*보호 샘플 구강관리 1건: corner_information_basic_v1 → corner_overview_qr + qr_guide.label 변경, 실제 저장(PATCH200+PUT200). 리스트 복귀·재진입 hydrate·태블릿 공개(templateKey 서빙, 새 라벨 노출)·QR 모바일 전부 PASS, 오류 0. QR slug 불변. 원복 없음. 공개 뷰어의 screen set 미소비 전제는 무효화됨(§5).*
