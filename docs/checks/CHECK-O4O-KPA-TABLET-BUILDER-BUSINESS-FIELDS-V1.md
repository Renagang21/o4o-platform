# CHECK-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1

> WO: `WO-O4O-KPA-TABLET-BUILDER-BUSINESS-FIELDS-V1`
> 선행: `...-TEMPLATE-PREVIEW-LAYOUT-FIX-V1` / `...-TEMPLATE-PREVIEW-SAVE-SMOKE-V1`
> 성격: 프론트 — 제작 화면에서 **블록 개념 제거**, 업무 3항목만 노출.
> Date: 2026-07-15

---

## 0. 결론

**PASS.** 제작 화면의 내부 블록 편집 UI를 전부 걷어내고 **대기 화면 / 코너 설명 / 추가 정보** 3항목으로 바꿨다. 내부 블록은 템플릿 선택 시 자동 준비된다. 보호 샘플로 **실제 저장 + 재진입 hydrate**까지 확인했다. **API·DB·kiosk-core 무변경.**

## 1. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | 단계 고정(BUILDER_STEPS) · `ensureAutoBlocks` · 업무 단계 렌더러 3종 · 출처 3분류 피커 · 코너 설명 요청문/모달. 블록 편집 UI 일괄 삭제 |

## 2. 화면

```
왼쪽:  1 템플릿 → 2 기본 정보 → 3 대기 화면 → 4 코너 설명 → 5 추가 정보 → 6 미리보기·저장
오른쪽: 실제 화면 미리보기 (태블릿 화면 ↔ QR 모바일 화면, 전 단계 유지)
```

WO는 왼쪽 단계를 `대기 화면 / 코너 설명 / 추가 정보` 3항목으로 규정했다. **템플릿·기본 정보·미리보기·저장은 구조 단계로 유지**했다 — 템플릿 선택은 WO 본문("내부 블록은 템플릿 선택 시 자동 준비")이 전제하고, 이름 없이는 저장이 불가하기 때문. 즉 **템플릿별 블록 묶음 단계(화면 구성/콘텐츠·제품/중심 제품 …)를 3업무 항목이 대체**했다.

## 3. 제거한 것 (블록 개념)

```
블록 유형 select · 블록 추가 버튼 · BlockRow(순서/표시/삭제) · BlockConfigForm · JsonConfig
BLOCK_TYPES / BLOCK_LABEL · renderBlocksStep · 필수 블록 경고 · TemplateMeta.steps
저장 단계의 "블록 N개(표시 M개)" 요약 → 업무 항목 요약으로 대체
```

## 4. 내부 블록 자동 준비

`ensureAutoBlocks` = `idle_media` / `corner_description` / `content_list` / `product_list` / `qr_guide` 를 확보.
- **추가만** 한다. 기존 블록의 순서·설정·표시여부를 바꾸거나 삭제하지 않는다(보호 샘플 안전).
- 진입 시 + 템플릿 선택 시 실행(`selectTemplate`).
- `qr_guide` 는 사용자에게 노출되지 않으므로 신규 생성 시 기본 라벨(`모바일로 더 보기`)을 넣는다 — 빈 라벨이면 `shapeStaticBlock` 이 null 을 반환해 공개 화면에서 QR 섹션이 사라지기 때문.

## 5. 업무 3항목

| 항목 | 내부 블록 | 노출 UI |
|------|----------|---------|
| 대기 화면 | `idle_media` | 소스 선택(기존 기능 재사용) + 직접 미디어 입력. **'Idle' 용어 미노출**, "터치 안내는 자동 표시" 명시 |
| 코너 설명 | `corner_description` | 코너 제목 + 짧은 소개(평문) + **예제 요청문 복사** + **ChatGPT 사용 방법 모달** |
| 추가 정보 | `content_list` | 출처 3분류 피커 + 단일 목록(순서 · 표시/숨김 · 이 화면에서 제거 · 화면용 제목/요약) |

### 5-1. 추가 정보 — 출처 3분류 (API·DB 변경 없음)

| 화면 출처 | 구현 |
|-----------|------|
| 상품 매장용 상세설명서 | `searchTabletO4oDescriptions` → `sourceType: 'o4o_product_description'` |
| O4O 제공 콘텐츠 | `searchTabletStoreContents` 결과 중 `sourceType === 'snapshot_edit'` (운영자/HUB 원본을 매장이 가져온 것) |
| 매장 제작 콘텐츠 | 같은 결과 중 `sourceType === 'direct'` (매장이 직접 만든 것) |

`kpa_store_contents.source_type ∈ {'snapshot_edit','direct'}` (migration `20260917000000-ExtendKpaStoreContentsForDirect`) 를 **표시/필터 기준**으로만 사용한다.
저장 계약 `ContentListItem.sourceType` 은 **2종 그대로**(서버 `CONTENT_LIST_SOURCE_TYPES` 검증) — 계약 불변.

> 목록 라벨: 저장값만으로는 store_content 가 'O4O 제공'인지 '매장 제작'인지 구분되지 않으므로(그 구분은 `kpa_store_contents.source_type` 에 있고 목록은 보유하지 않음) **출처 중립 라벨('가져온 콘텐츠')** 을 쓴다. 상세설명서는 `상품 매장용 상세설명서` 로 피커와 일치시켰다.

## 6. WO 대비 조정 2건 (계약 충돌 — 사유)

1. **'짧은 소개'를 별도 필드로 만들지 않고 `body` 에 매핑**
   공개 렌더러 `shapeStaticBlock` 이 `corner_description` 을 **`{title, body}`** 로만 통과시킨다. `summary` 같은 새 키는 저장은 되어도 **고객 화면에 렌더되지 않는 죽은 필드**가 된다(렌더하려면 API 변경 = 금지). → `제목 = title`, `짧은 소개 = body`.

2. **'기존 표준 편집기(HTML)' 대신 평문 편집 유지**
   kiosk-core 가 본문을 `<p>{cornerInfo.body}</p>` 로 **평문 렌더**(React 이스케이프)한다. RichTextEditor/HTML 입력창을 붙이면 **태그가 고객 화면에 그대로 노출**된다. WO의 "별도 HTML 입력창은 만들지 않는다" 와도 일치. → 평문 textarea + "글자만 표시됩니다" 안내.
   같은 이유로 기존 `ContentCreationGuideModal`(store/operator 모드)은 **HTML 생성 프롬프트**라 부적합 → **태블릿 코너 설명 전용 평문 요청문 + 사용 방법 모달**을 이 화면에 두었다(공유 모달 미변경). 요청문에는 약사 검토·치료/예방 단정 금지 가이드를 포함.

## 7. 실패 기준 대비 (배포본 실측)

| 실패 기준 | 결과 | 근거 |
|-----------|:----:|------|
| 블록 유형 또는 블록 추가가 사용자 화면에 남음 | ✅ 없음 | 페이지 텍스트 스캔: `블록 추가`/`블록 유형` **0** |
| `content_list`, `qr_guide` 등 내부 용어 노출 | ✅ 없음 | 스캔: `content_list`/`qr_guide`/`idle_media`/`corner_description`/`product_list` **0** |
| 추가 정보가 출처가 아닌 성격 기준으로 나뉨 | ✅ 아님 | 탭 = 상품 매장용 상세설명서 / O4O 제공 콘텐츠 / 매장 제작 콘텐츠 (전부 **출처** 기준) |
| 오른쪽 상시 미리보기가 사라짐 | ✅ 유지 | `실제 화면 미리보기` 표시 확인, 전 단계 유지 |

## 8. 검증 (배포본 · 보호 샘플 실제 저장)

대상: `구강관리 기본 화면 세트` `7280872e…` (신규 샘플 생성 없음, 원복 없음).

| 항목 | 결과 |
|------|------|
| 단계 표시 | `1템플릿 \| 2기본 정보 \| 3대기 화면 \| 4코너 설명 \| 5추가 정보 \| 6미리보기·저장` ✅ |
| 열자마자 '변경됨' | **false** ✅ (자동 준비분이 dirty 로 잡히던 문제 수정) |
| 예제 요청문 복사 / ChatGPT 사용 방법 | 둘 다 표시 ✅ |
| 출처 3분류 탭 | 스크린샷으로 3종 렌더 확인 ✅ (스크립트 locator 는 미검출 — 캡처가 정본) |
| 저장 API | `PATCH 200` + `PUT 200` ✅ |
| 성공 toast | `✅ 태블릿 콘텐츠가 저장되었습니다.` **포착** ✅ (대기 2.2s < 자동소멸 3s) |
| 재진입 hydrate | 코너 설명 본문 **일치**, `templateKey = corner_overview_qr`, 블록 5 ✅ |
| console / pageerror / API 4xx·5xx | **0건** ✅ |
| `tsc --noEmit` / `vite build` | 둘 다 **EXIT=0** ✅ |

저장된 변경(코너 설명 본문)은 **존치**한다.

## 9. 후속 (WO 지정 순서)

```
코너 관리 반응형 UI → 표시·숨김 백엔드 → 보관 가드 일원화 → 복제 → 최종 통합 smoke
```

---

*제작 화면 = 업무 3항목(대기 화면/코너 설명/추가 정보). 블록 UI·내부 용어 전면 제거, 블록은 ensureAutoBlocks 로 자동 준비(추가만). 추가 정보 = 출처 3분류(상세설명서 / snapshot_edit / direct)로 계약(2종) 불변. 짧은 소개=body·평문 유지(shapeStaticBlock {title,body} + kiosk 평문 렌더). 보호 샘플 실제 저장 PASS(PATCH/PUT 200·toast·hydrate·오류 0). API·DB·kiosk-core 무변경.*
