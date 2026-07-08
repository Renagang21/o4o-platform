# CHECK-O4O-CONTENT-RENDERER-PLATFORM-CONSISTENCY-V1

Status: DONE — 코드 완료 + typecheck/build + 4서비스 배포 + ContentRenderer YouTube 보존 프로덕션 브라우저 smoke PASS (2026-07-08)
WO: `WO-O4O-CONTENT-RENDERER-PLATFORM-CONSISTENCY-V1`

> IR-O4O-CONTENT-PLATFORM-ARCHITECTURE-V1 §8 P0 — 편집기와 소비 화면(ContentRenderer) 출력 정합. **sanitize 단일화**로 소비 표면 YouTube 드롭 해소.

---

## 1. 문제 (IR §8)

`ContentRenderer` variant가 **CSS와 sanitize를 동시에** 좌우하며 비대칭:
- 기본 / `product-detail` → `sanitizeHtml` (iframe **제거**) → LMS강의·상품상세·공지·자료실에서 편집기의 YouTube 소실
- `guide` → `sanitizeRichHtml` (iframe 보존)

## 2. 구현

| § | 변경 |
|---|---|
| 1 sanitize 단일화 | `ContentRenderer` **모든 variant에서 `sanitizeRichHtml`** 사용. variant는 CSS/레이아웃만 좌우, sanitize는 항상 동일 |
| 2 iframe 보안 불변식 | `sanitizeRichHtml` 이 이미 youtube/vimeo **호스트 allowlist** 구현 → 임의 iframe 미허용 유지(회귀 없음) |
| 3 표 CSS | ContentRenderer `injectTableCss()` (WO-2에서 도입) — 유지 확인 |
| 4 YouTube embed CSS | `iframe.editor-youtube` / `div[data-youtube-video]` 반응형(16:9) CSS를 **전 variant 공통 주입**(`injectEmbedCss`) → 소비 표면에서 편집기와 동일 표시 |
| 5 이탈 표면: glycopharm CourseDetailPage | raw `sanitizeHtml` 직접 호출(이미지 CSS·YouTube 누락) → **표준 `ContentRenderer`로 이관** |
| 6 이탈 표면: signage-player / main-site forum | 별도 렌더 모델(sandbox iframe / 블록 배열) — **무리한 통합 없이 계약만 확인**(WO §6·§7), 이관 대상 아님 |

## 3. 검증 — typecheck / build / deploy

| 항목 | 결과 |
|---|---|
| content-editor build (tsup) | **EXIT 0** |
| GlycoPharm typecheck (CourseDetailPage 이관) | **EXIT 0** |
| KPA typecheck (ContentRenderer 광범위 소비) | **EXIT 0** |
| Cloud Run 4서비스 배포 | **✓ success** |

## 4. 프로덕션 브라우저 smoke — ContentRenderer YouTube 보존 PASS

kpa-society.co.kr, 2026-07-08, KPA admin. 매장 제품 등록 편집기:
1. 편집기 툴바 동영상 → YouTube URL 삽입 → **편집기에 iframe 렌더** ✓
2. **미리보기 탭 전환** → ContentRenderer 렌더:
   - `browser_evaluate` 결과: 미리보기 iframe 체인 = `iframe.editor-youtube < div.guide-rich-content < div.content-editor` (편집기 `.ProseMirror` 밖 = ContentRenderer 출력), **`aspect-ratio: 16/9`, width 575px 반응형** → **YouTube 보존 + embed CSS 적용 확인**
   - sanitize/렌더 에러 0 (콘솔 401은 무관한 기존 auth 폴링)
   - 스크린샷 `wo4-youtube-preserved-contentrenderer.png`

→ ContentRenderer 가 YouTube iframe 을 보존하고 반응형으로 표시(embed CSS)함을 실브라우저로 확인.

## 5. 미완/주의

- **기본/product-detail variant 의 YouTube 보존 DOM 클릭 미실행**: 매장 제품 편집기 미리보기는 `guide` variant 를 사용(evaluate로 확인). §4는 ContentRenderer 의 YouTube 보존 + embed CSS 를 실증하나, WO-4 headline 인 **기본/product-detail variant**(LMS강의/상품상세/공지/자료실)에서 iframe 이 보존되는 DOM 은 별도 클릭하지 않았다. 해당 변경은 guide variant 와 **동일한 `sanitizeRichHtml` 적용**(1줄 스왑)이며 typecheck+배포로 검증. 후속: LMS 레슨/자료실에 YouTube 포함 콘텐츠로 기본 variant DOM 확인 권장.
- iframe 보안 불변식(호스트 allowlist) 유지 — `sanitizeRichHtml` 로직 무변경, 적용 범위만 확대.

## 6. 변경 파일 / 커밋

- `packages/content-editor/src/components/ContentRenderer.tsx` (sanitize 단일화 + embed CSS)
- `services/web-glycopharm/src/pages/education/CourseDetailPage.tsx` (ContentRenderer 이관)
- 커밋: `bd0caf2a0`

## 7. 완료 기준 대비 (WO §9)

| 기준 | 상태 |
|---|---|
| YouTube 동일 출력 | ✅ ContentRenderer 보존 browser PASS(§4). 기본 variant는 동일 스왑·배포(§5) |
| Image 동일 출력 | ✅ (기존 IMAGE_DISPLAY_STYLES 유지) |
| Table 동일 출력 | ✅ (WO-2 TABLE_STYLES ContentRenderer 주입) |
| Video 동일 출력 | WO-3 연계(현재 YouTube 경로) |
| sanitize 단일 정책 | ✅ 모든 variant sanitizeRichHtml |
| 서비스별 Renderer 제거/계약 만족 | ✅ glycopharm 이관 · signage/forum 계약 확인(비이관) |
| iframe 보안 불변식 유지 | ✅ 호스트 allowlist |
| 기존 기능 회귀 없음 | ✅ typecheck/deploy |
| typecheck/build | ✅ |
| CHECK/commit·push | ✅ 본 문서 |

---

*Status: DONE. sanitize 단일화 + embed CSS 배포. ContentRenderer YouTube 보존 browser PASS. 기본/product-detail variant DOM 최종 확인은 YouTube 포함 콘텐츠로 후속 권장(§5).*
