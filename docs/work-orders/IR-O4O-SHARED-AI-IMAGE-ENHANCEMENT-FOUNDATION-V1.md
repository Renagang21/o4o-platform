# IR — WO-O4O-SHARED-AI-IMAGE-ENHANCEMENT-FOUNDATION-V1 (선행 조사)

> 상태: **공급자/범위 결정 대기 (§13 게이트)** — 코드 미작성, 비작동 버튼/mock 미배포.
> 작성일: 2026-06-29

---

## 1. 선행 조사 결과 (§3)

### 1-A. 현재 AI 공급자/키 현황
- 통합: **Gemini**(주, REST) · **OpenAI**(폴백) · **Claude**(타입만, 미통합) · **Google Vision API**(OCR/이미지 분석).
- **이미지 생성·편집 기능은 전무.** Gemini Vision = 이미지 입력 → 텍스트 분석만. 이미지 픽셀을 보정/생성하는 경로 없음.
- 키: `GEMINI_API_KEY` / `OPENAI_API_KEY`(+`CLAUDE_API_KEY` 예정). DB `ai_settings` → env 폴백(`ai-key.util`).
- **재사용 가능 인프라**: `AIProxyService`(검증/재시도/로깅), BullMQ AI job queue(`ai-generation`), `AIUsageLog`(공급자·모델·토큰·duration·비용추정·status), AI audit, `@google-cloud/storage`.

### 1-B. 결정적(비-AI) 이미지 처리 — Sharp 0.34.3
- 현재 사용처: media-library.service / mediaUploadController / neture admin. 현재는 resize·rotate·webp/jpeg·metadata 만 사용.
- **V1 보정 범위 중 Sharp 단독으로 결정적 처리 가능**: 밝기·대비(`modulate`), 선명도(`sharpen`), 자동 레벨/노출(`normalize`), 회전/자동방향(`rotate`), 여백 정리(`trim`), 단색 배경 평탄화(`flatten`).
- **Sharp 단독 불가(외부 CV/AI 필요)**: 진짜 **배경 제거**, **원근/기울기(deskew) 보정**, **제품 중심 자동 배치**(객체 인식).
- 클라이언트 Canvas 보정 UI 선례: admin-dashboard `ImageEditingTools`(밝기/대비/채도/크롭/회전/듀오톤).
- OpenCV·jimp·배경제거 라이브러리 **없음**.

### 1-C. 미디어 업로드/삭제/임시객체 내부 구조
- `MediaLibraryService.upload()` = GCS 객체 + `media_assets` row 를 **즉시·무조건** 생성. 버킷 `o4o-media-library`, prefix `media/{YYYY}/{MM}/{uuid}`. 기본 1200²·webp q85(또는 preserveOriginal 모드).
- `MediaAsset` 컬럼: url/gcsPath/fileName/originalName/mimeType/fileSize/assetType/width/height/folder/serviceKey/uploadedBy/isLibraryPublic/consentedAt/타임스탬프.
- **임시/만료 메커니즘 전무**: `isTemporary`/`status`/`expiresAt` 없음, signed-URL 없음, TTL·cleanup cron 없음, 참조 카운팅 없음.
- 삭제: media-library DELETE = **operator 전용**, GCS+row 동시 삭제, 참조 검사 없음.
- 스코프: 미디어는 **글로벌**(organizationId 없음), 인증 사용자면 업로드 가능.
- **MediaPickerModal 타이밍(핵심)**: 파일 선택은 로컬 미리보기만, **"업로드" 클릭 시 영구 자산 생성**(상품 저장 이전). 이후 상품 모달을 저장 없이 닫으면 **고아 자산(media_assets+GCS)이 영구히 남음** — 코드상 cleanup 없음. → **현행은 WO §7 위반 상태.**

---

## 2. 핵심 판단

1. **새 AI 공급자 없이도 유용한 V1 가능.** WO §6 의 V1 보정 범위 중 배경제거/원근/제품중심 배치를 제외한 전부(밝기·대비·선명도·자동레벨·회전·여백)는 **Sharp 결정적 처리**로 충분하며, §6 자체가 "AI 불필요 작업은 Sharp 우선"을 명시.
2. **생성형 이미지 AI 는 이 용도에 부적합/위험.** WO §6·§8 금지(제품 형태·색상 변경 금지, 글자·숫자·로고·바코드 변경 금지, 워터마크 금지)와 생성형 모델의 본질(픽셀 재생성·환각)이 직접 충돌. 제품 사진 충실도를 보장 불가.
3. **공급자 결정이 실제로 필요한 부분은 "배경 제거/원근 보정"뿐**이며, 이는 가장 위험·선택적 항목.
4. **고아 미디어(§7) 문제는 공급자와 무관하게 해결 필요** — 임시(브라우저 Blob / 무영속 처리) + 최종 저장 시점 영구화 흐름 설계가 핵심.

---

## 3. 공급자/범위 선택지 (§13 — 사용자 결정 필요)

| | 옵션 A (권장) | 옵션 B | 옵션 C (비권장) |
|---|---|---|---|
| 엔진 | **Sharp 결정적** | Sharp + 외부 **배경제거 CV API** | **생성형 이미지 모델** |
| 보정 | 밝기·대비·선명도·자동레벨·회전·여백 | A + 배경제거/제품분리 | "보완" 프롬프트(픽셀 재생성) |
| 새 공급자/키 | **불필요** | 필요(remove.bg/Photoroom/Cloudinary AI, 또는 RMBG 자체호스팅) | 필요(Gemini Image/gpt-image/Stability) |
| 비용 | **0** | 종량(예: remove.bg ~건당 과금) 또는 GPU 인프라 | 종량(이미지당) |
| §6/§8 금지 위반 위험 | **없음**(픽셀 환각 없음) | 낮음(배경만) | **높음**(제품/로고/바코드/문구 변형) |
| 배포 가능 시점 | 즉시(결정만) | 벤더 선정+키+예산 후 | 벤더+키+예산 후, 충실도 검증 필요 |

- **권장 = 옵션 A**: 공용 `SharedImageEnhancementService`(서버 Sharp, 안전 한도) + `ImageEnhancementModal`(원본↔보완본 비교 · 보완본/원본/다시보완/취소) + **임시 무영속 처리**(AI 처리 시에도 결과를 저장하지 않고 응답으로 반환, 최종 상품 저장 때만 1장 영구화) + **고아 방지**(취소/실패 시 미디어 0). 배경제거·원근·제품중심 = **Phase 2**(별도 공급자 결정).
- **옵션 B/C 는 신규 공급자·키·예산 도입** → §3/§13 에 따라 임의 도입 금지, 사용자 승인 필요.

---

## 4. 결정 후 작업 범위(참고, 옵션 A 기준)
- 공용 백엔드: `POST /api/v1/platform/image-enhancement/preview`(파일 in-memory Sharp 처리 → 보정 bytes 반환, **미저장**) — AIUsageLog 유형 확장 또는 ImageEnhancementLog. 권한/MIME/픽셀·용량 한도/요청 제한/중복클릭 가드/SSRF(외부 URL 미사용).
- 공용 프론트: `ImageEnhancementModal`(비교 UI) + KPA `/store/commerce/local-products` 연결(이미지 있을 때만 노출, 등록·수정 공통).
- 임시→영구 흐름: 선택 시 영구 업로드를 **상품 저장 시점으로 지연**, 취소/실패 보상으로 고아 0.
- 메타데이터(§9): 일반/보정 여부·서비스·화면·MIME·크기·가로세로·(AI 사용 시)공급자/모델/처리유형·생성자/조직/시각.

> **현 단계는 여기서 중지.** 옵션 결정(특히 B/C 시 벤더·예산·키) 후 구현·배포·실브라우저 smoke 로 진행.
