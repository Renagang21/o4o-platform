# CHECK-O4O-KPA-TABLET-CORNER-TEMPLATE-LABEL-V1

> WO: `WO-O4O-KPA-TABLET-CORNER-TEMPLATE-LABEL-V1`
> 성격: 프론트 UI 결함 — 코너 관리 화면에서 현재/연결 콘텐츠의 템플릿을 알 수 없음.
> Date: 2026-07-16

---

## 0. 결론

**PASS.** 코너 관리(`TabletCornerContentsPanel`)의 **현재 사용 중 카드 + 연결 콘텐츠 카드마다 템플릿 배지**를 표시. 내부 `template_key` 대신 사용자용 라벨. **API·DB 무변경.**

## 1. 변경

| 파일 | 변경 |
|------|------|
| `TabletScreenSetManager.tsx` | `templateLabel` 을 `export`(라벨 드리프트 방지 — 코너 패널이 같은 소스 재사용) |
| `TabletCornerContentsPanel.tsx` | `TemplateBadge` 컴포넌트 추가 → 현재 사용 중 카드 + 연결 목록 각 카드에 배치. `import { templateLabel }` |

데이터: `CornerContent.templateKey` 는 이미 `GET /tablets/:id/screen-sets` 가 `COALESCE(template_key,'corner_information_basic_v1')` 로 반환 → 추가 조회/스키마 변경 없음.

## 2. 라벨 매핑 (사용자용 — key 미노출)

```
corner_information_basic_v1 → 기본 코너 안내형
product_focus               → 상품 집중형
product_grid_qr             → 제품 진열형
corner_overview_qr          → 코너 소개형
idle_touch_video            → 대기 영상형
```

## 3. 실패 기준 대비 (배포본 실측)

| 실패 기준 | 결과 |
|-----------|:----:|
| 콘텐츠 이름만 보이고 템플릿 모름 | ✅ 해소 — 배지 표시 |
| `template_key` 원문 노출 | ✅ 없음 — 페이지 텍스트에서 key 문자열 **0건** |
| 현재/연결 콘텐츠의 템플릿 표시가 서로 다름 | ✅ 동일 컴포넌트(TemplateBadge)·동일 소스 |

## 4. 검증

보호 샘플 2건(구강=`코너 소개형`, 피부=`기본 코너 안내형`).

| 항목 | 결과 |
|------|------|
| 현재 사용 중 카드 배지 | ✅ `[코너 소개형]` |
| 연결 목록 배지 | ✅ 1) `[코너 소개형]`(현재) 2) `[기본 코너 안내형]` |
| 배지는 세트 따라감(전환 시 갱신) | ✅ 현재 콘텐츠 = 그 세트의 templateKey 배지 |
| PC(1440) 잘림 | ✅ 없음 |
| 390px 잘림 | ✅ 없음 (배지 행 `flex-wrap`, 배지 3개 렌더) |
| `tsc` / `vite build` | ✅ EXIT=0 |
| API·DB 변경 | 없음 |

---

*코너 관리 현재/연결 카드에 템플릿 배지(사용자용 라벨, templateLabel export 재사용). key 미노출. CornerContent.templateKey 재사용 → API·DB 무변경. PC·390px 실측 잘림 0.*
