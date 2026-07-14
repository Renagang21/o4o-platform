# CHECK-O4O-KPA-TABLET-TEMPLATE-DRIVEN-BUILDER-STEPS-V1

> 목적: 공통 5단계 제작 셸을 **템플릿별 제작 흐름**으로 정비. 각 템플릿에 필요한 입력 순서·블록만 단계별 노출.
> 선행: [`CHECK-...-STEP-BUILDER-SHELL-V1`](CHECK-O4O-KPA-TABLET-CONTENT-STEP-BUILDER-SHELL-V1.md)(WO-2) · [`CHECK-...-DRAFT-PREVIEW-V1`](CHECK-O4O-KPA-TABLET-CONTENT-DRAFT-PREVIEW-V1.md)(WO-3)
> Work Order: `WO-O4O-KPA-TABLET-TEMPLATE-DRIVEN-BUILDER-STEPS-V1`
> 원칙: **프론트 전용.** DB migration / API / QR landing / screen_set slug / public runtime / kiosk-core / 운영 샘플 / 템플릿 사용자 등록 — **무변경**.

---

## 1. 실제 원인 / 구조

- WO-2의 5단계 셸은 모든 템플릿에 동일(템플릿→기본정보→화면구성→콘텐츠·제품→미리보기·저장). 템플릿은 "UI 배치 유형"인데 제작 단계가 배치와 무관하게 획일적이었다.
- 하위 편집기(`TemplateSelectField`/`BlockConfigForm`/`ContentListEditor`/`ContentPickerModal`)는 이미 재사용 가능 → **메타 확장 + 단계 렌더 분기**만으로 템플릿별 흐름 구현 가능(런타임 무변경).

---

## 2. 변경 파일 (1개, 프론트)

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/.../TabletScreenSetManager.tsx` | ① `TEMPLATE_OPTIONS`에 제작 메타(`requiredBlocks`/`steps`) 추가(`TemplateMeta`). ② 빌더 단계를 **선택 템플릿의 `steps` 메타로 구동**(고정 5단계 제거). ③ blocks 단계는 `blockTypes`로 필터해 해당 블록만 노출(기존 편집기 재사용). ④ 필수 블록 없으면 경고 + 빠른 추가(자동 삭제/덮어쓰기 없음). ⑤ 신규 draft는 QR 안내 블록 기본 포함. |

> API/DB/kiosk-core 무변경 → web 배포만 필요.

---

## 3. 변경 내용

### 3.1 템플릿 메타

```ts
interface TemplateMeta { key; label; description; requiredBlocks; steps }
interface BuilderStepMeta { title; kind: 'basic'|'blocks'|'save'; blockTypes?; note? }
```

### 3.2 템플릿별 제작 단계 (템플릿 선택 이후)

| 템플릿 | 단계(기본정보 → … → 미리보기·저장) | requiredBlocks |
|---|---|---|
| **기본 코너 안내형**(basic_v1) | 기본 정보 / 화면 구성(idle·코너설명·건강정보·직원문의·QR) / 콘텐츠·제품(content_list·product_list) / 미리보기·저장 | qr_guide |
| **상품 집중형**(product_focus) | 기본 정보 / 중심 제품 / 핵심 설명 / 관련 콘텐츠·제품·QR / 미리보기·저장 | product_list, qr_guide |
| **대기 영상형**(idle_touch_video) | 기본 정보 / 대기 영상·터치 안내 / 코너 설명 / 콘텐츠·제품 / 미리보기·저장 | idle_media, qr_guide |
| **코너 소개형**(corner_overview_qr) | 기본 정보 / 코너 제목·설명 / 안내 콘텐츠 / 제품·QR 구성 / 미리보기·저장 | corner_description, qr_guide |
| **제품 진열형**(product_grid_qr) | 기본 정보 / 코너 제목·짧은 설명 / 제품 선택·순서 / 보조 콘텐츠·QR / 미리보기·저장 | product_list, qr_guide |

- 스텝 인디케이터·이전/다음이 `['템플릿', ...template.steps]`로 **동적** 구성. 템플릿 변경 시 단계 수가 줄면 현재 step 클램프(블록 자동 변경 없음).
- blocks 단계: `blockTypes`에 속한 블록만 표시·추가(`BlockConfigForm` 재사용). 모든 설정을 한 화면에 펼치지 않음.
- **대기 영상형**: 대기 영상형은 kiosk가 영상 위에 "화면을 터치하세요 / Touch to start"를 자동 표시(kiosk-core 무변경) — 해당 단계에 안내 note로 명시.

### 3.3 QR 원칙

- 모든 템플릿 `requiredBlocks`에 `qr_guide` 포함. **신규 draft는 qr_guide 블록을 기본 포함**(seed)해 메인 화면에 QR 영역이 항상 존재.
- 실제 QR landing·공통 원본 스키마는 **미구현**(후속 WO). 제작 단계에서 QR 안내 블록 구성 + 미리보기(WO-3)로 확인.

### 3.4 예외 처리 (자동 변경 금지)

- 기존 콘텐츠에 템플릿 필수 블록이 없어도 **자동 삭제/강제 덮어쓰기 하지 않는다.** 해당 blocks 단계와 저장 단계에 경고 "필수 구성이 없습니다. 해당 단계를 확인해 주세요." + 빠른 추가 버튼만 제공.
- 기존 draft/운영 샘플 데이터 그대로 유지. 저장은 여전히 전체 교체(사용자가 구성한 blocks 기준).

---

## 4. 보존 사항 / 금지선 준수

| 항목 | 상태 |
|---|---|
| 기존 하위 편집기 재사용 | ✅ TemplateSelectField/BlockConfigForm/ContentListEditor/ContentPickerModal |
| 신규·수정 hydrate | ✅ 동일 셸(수정=initialDetail hydrate, 블록 강제 변경 없음) |
| dirty guard | ✅ baseline(seed 포함) + beforeunload + 이탈 confirm |
| 태블릿·QR 모바일 미리보기(WO-3) | ✅ 저장 단계에 유지 |
| 저장 후 리스트 복귀 | ✅ onSaved → reload |
| 코너 적용 분리 | ✅ 셸에 적용 기능 미노출 |
| DB migration / API / QR landing / slug / public runtime / kiosk-core / 운영 샘플 / 템플릿 사용자 등록 | ✅ **무변경** |

---

## 5. 정적 검증

| 항목 | 결과 |
|---|---|
| `@o4o/web-kpa-society` build (`tsc && vite`) | ✅ **✓ built in 23.34s** (고정 5단계 상수·미사용 심볼 정리 포함) |

---

## 6. 배포 / Browser Smoke

| 항목 | 값 |
|---|---|
| commit | (본 커밋) |
| 배포 | Deploy Web Services (Cloud Run) — kpa-society-web (프론트 전용) |
| Browser smoke | **Deferred** — 인증 세션 미보유 시 자동 로그인 금지(WO). |

> 후속 smoke 항목: 템플릿별 단계 제목·순서 차이 / 해당 단계에 필요한 블록만 표시 / 신규·수정 hydrate / dirty guard / 태블릿·QR 모바일 미리보기 / 저장 후 리스트 복귀 / 필수 블록 경고·빠른 추가 / 템플릿 변경 시 블록 자동 삭제 없음.

---

## 7. 완료 기준 대조

| 완료 기준 | 결과 |
|---|---|
| 템플릿마다 제작 과정이 다르게 표시 | ✅ steps 메타 구동 |
| 공통 편집기 전체 펼침 제거 | ✅ 단계별 blockTypes 필터 |
| 기존 하위 편집기 재사용 | ✅ |
| 모든 템플릿에 메인 QR 구성 반영 | ✅ requiredBlocks qr_guide + 신규 seed |
| 미리보기·저장 흐름 유지 | ✅ |
| API·DB·runtime 변경 없음 | ✅ |
| commit/push | 본 커밋 |
| build | ✅ |
| Browser smoke | Deferred(인증 세션 없음) |

---

## 8. 다음 단계 (본 WO 밖)

제작 UI 기본 흐름은 이 WO로 닫힌다. 다음은 별도 설계가 필요한 **태블릿 콘텐츠 원본 ↔ QR 모바일 landing 연결**(공통 원본 slug + landing_type='screen_set' + 모바일 렌더러 + 저장 오케스트레이션 — IR의 WO-5). 신규 스키마가 필요하므로 설계 CHECK 선행 권고.

---

*작성: 2026-07-14 · Status: 구현 완료(빌드 통과) · Browser smoke Deferred*
