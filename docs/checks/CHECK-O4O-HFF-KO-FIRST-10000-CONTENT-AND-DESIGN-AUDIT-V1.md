# CHECK-O4O-HFF-KO-FIRST-10000-CONTENT-AND-DESIGN-AUDIT-V1

> **WO**: WO-O4O-HFF-KO-FIRST-10000-CONTENT-AND-DESIGN-AUDIT-V1
> **성격**: 점검 전용(READ-ONLY). DB write 0 / 설명서 수정 0 / canonical 변경 0 / driver 수정 0 / 디자인 수정 0 / 배포 0.
> **판정**: **PAUSE_AND_FIX** (문제 보고만 — 본 WO 범위에서 수정 금지)
> **일자**: 2026-07-27
> **작성**: Agent 1 (개별생산 스킴 자기감사)

---

## 0. 감사 대상 확정

- 대상 = HFF STORE/ko canonical 설명서 중 **개별생산 driver(`hff-ko-agent-01-individual.mjs`) 스킴**이 순번 1~10,000 구간에서 생산한 LIVE 설명서.
- 스킴 격리 시그니처: `content LIKE '%식약처에 신고된 건강기능식품입니다%'` (driver `composeKo` intro 고정 문구).
- 격리 쿼리 조건: `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`.
- **대상 건수 = 5,669건** (누적 CREATED 75+266+2521+2807 = 5,669. SKIP/HOLD은 미생산이므로 제외).
  - 참고: 같은 `o4o_hff_generated` source_type 아래 타 스킴 포함 전체 21,167행이 있으나, 본 감사는 시그니처로 내 스킴 5,669만 대상.

---

## §1. 기준 문서 확정

| 문서 | 계층 | 상태 | 역할 |
|------|------|------|------|
| `docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md` | 최상위 콘텐츠 정책 | **CURRENT** | 매장 설명서 = 구매 지원 문서 |
| `docs/guides/products/health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1.md` | HFF 영역 SSOT (HFF-R01~R10) | **CURRENT** | HFF 매장 설명서 내용 기준 |
| `docs/guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md` (CR-020 V1.2) | 디자인 계약 | **CURRENT** | sd-* 클래스 어휘·구조 계약 |
| `packages/content-editor/src/components/ContentRenderer.tsx` `storeDescriptionCss` | CSS 구현 SSOT | **CURRENT** | 실제 스타일 적용 주체 |
| `docs/guides/products/health-functional-food/examples/byeonenjang.semantic.html` | 정본 예시 | **CURRENT(참고)** | 기대 콘텐츠 모델 |

**충돌/불일치:**
- driver `composeKo`는 위 CURRENT 기준보다 **선행 구현**이며, HFF-R01(구매지원 내러티브)·§3(랜딩 10단 구조)·CR-020(sd-warn 필수)·§4(ko+en)를 **구현하지 않는 고정 6섹션 데이터 나열형**이다. → driver와 기준 문서 사이에 구조적 divergence 존재(아래 §3·§4에서 정량화).

---

## §2. 표본 선정 (30건 ≥ 목표 30)

`apps/api-server/src/scripts/data/hff-ko-first-10000-audit-samples.json` (30행, content 포함) 저장.
필드: index, candidateId, statementNo, productMasterId, productName, sampleCategory, mainFnctn, srvUse, attention, descriptionId.

| 카테고리 | 건수 |
|----------|------|
| 단일기능성 | 5 |
| 다원료·다기능성 | 5 |
| MAIN_FNCTN 긴 | 5 |
| IFTKN_ATNT(주의사항) 긴 | 4 → 실측상 원본 주의사항 필드 공란이 다수라 '긴' 기준을 SRV_USE/기능성 길이 상위로 대체 선정 |
| SRV_USE 복잡 | 4 |
| 질환·증상·전문용어 | 4 |
| 제형 차이 | 3 |

---

## §3. 내용 점검

### §3-A. 반(反)날조 불변식 — **PASS**
전 범위(§6) 저장 content 재추출 grounding:
- 기능성 문장 35,985건 검사 → **⊆ 정규화 MAIN_FNCTN, fail 0**.
- 섭취 빈도 칩 5,289건 검사 → **⊆ SRV_USE, fail 0**.
- 원문 밖 치료·예방·진단 주장 생성 **0**. 외부 LLM 의료사실 보강 **0**.

### §3-B. 공식 주의사항 누락 — **★CRITICAL (HFF-R08 위반)**
- driver line 197이 주의사항 소스로 `raw_payload.source.IFTKN_ATNT_MATR_CN`를 읽으나, 이 키는 **HFF 후보 41,261건 전량 공란**.
- 실제 공식 주의사항은 `INTAKE_HINT1`에 존재: 비공란 **39,760/41,261(96.4%)**, 첫 1만 구간 **9,491/10,000(94.9%)**.
- 그 결과 내 스킴 **5,669건 전부**가 `<div class="sd-note">섭취 전 제품 표시사항의 주의사항을 확인하십시오.</div>` **generic fallback**으로 대체됨.
- **누락 규모: 공식 주의사항이 실제로 존재했던 설명서 = 5,463 / 5,669 (96.4%)**. (나머지 206은 원문도 공란.)
- 누락 예: 홍삼류 "의약품(당뇨치료제·혈액항응고제) 복용 시 섭취 주의", 알레르기 체질 확인, 임산부·수유부·어린이 관련 경고 등 안전정보.

### §3-C. 구매지원 내용 모델 — **미달 (HFF-R01/R03/§3 위반)**
- 저장 설명서는 **공식 데이터 나열형**(주요 기능성 / 기능성 상세 / 섭취방법 / 규격 / 문의).
- HFF-R01 "정확하지만 구매 판단을 돕지 못하는 설명서는 승인하지 않는다"에 저촉: 제품별 "왜 이 제품인가" 설득 내러티브·"이런 분께" 타깃 안내(실질 콘텐츠)·핵심구성 카드형 요약·상담 CTA 부재.
- 중복: "주요 기능성"과 "기능성 상세"가 **동일 문장을 반복**(단일기능성 표본에서 육안 확인).

---

## §4. 디자인 점검 (CR-020 대조)

CR-020 정의 어휘: sd-card, sd-hero, sd-badges/badge, sd-meta, sd-body, sd-intro, sd-why, sd-who, **sd-warn**, sd-core>sd-item, sd-tag, sd-intake, sd-chips, sd-spec, sd-cta/cta-k, sd-foot, sd-theme-*.

| 항목 | 실측(30표본) | 판정 |
|------|--------------|------|
| 대다수 어휘(hero/badges/meta/body/intro/why/who/item/intake/chips/tag/spec/foot) | 30/30 사용·**STYLED** | 정상 렌더 |
| **sd-note** (주의사항 컨테이너) | 30/30 사용 · **어휘 밖 · UNSTYLED** | 위반 |
| **sd-func** (다기능성 상위 목록) | 18/30 사용 · **어휘 밖 · UNSTYLED** | 위반 |
| **sd-warn** (CR-020 §2-1 금기·경고·주의사항 필수) | **0** 사용 | 위반(필수 미사용) |
| sd-core (CR-020 sd-core>sd-item) | 미사용(sd-item이 sd-spec 직속) | 경미 구조 이탈 |
| sd-cta/cta-k (구매지원 CTA) | 미사용(sd-foot로 대체) | 경미 |

전 범위(§6) 정량: **sd-note 5,669/5,669**, **sd-func 2,431**, **sd-warn 0**, **sd-cta 0**, **sd-core 0**.

**감지 취약점(스코프 한정):** driver는 `class="sd-card sd-theme-green"`을 emit한다. `ContentRenderer.hasStoreDescriptionMarkup()`는 정확 부분문자열 `class="sd-card"`(닫는 따옴표 포함)로 판별하므로 이 마크업은 **자동 판별 실패**(exact match 0/5,669). 단, 전용 store-description surface(QR 랜딩/매장 모달/운영자 검수)는 `variant="store-description"`를 명시 전달해 CSS를 주입하므로 영향 없음. **자동 판별에 의존하는 태블릿 혼합 슬롯(content_list)에서만** 무스타일 렌더 위험.

---

## §5. 실제 렌더 확인 (10건 × 3폭)

- **경로 재사용**: 렌더러 실 CSS(`ContentRenderer.tsx storeDescriptionCss`)를 그대로 추출, 저장 실물 content를 `.store-desc-content`로 감싸 렌더(신규 화면·라우트 0).
- **폭**: mobile 430 / tablet 820 / desktop 1000·1280 (@container 반응형 확인).
- **주의**: 고정 MCP 브라우저 프로파일(`.playwright-o4o-profile`)이 타 세션 GUI 점유로 락 → **헤드리스 Playwright(temp profile)로 대체 캡처**. WO §5 허용 절차(브라우저 확인 제약 시 사유 기록 + HTML 구조 결과 병행)를 따름.
- 산출물(세션 임시, 비커밋): `C:/tmp/hff-render-{mobile,tablet,desktop}-*.png`, `C:/tmp/hff-focus-*.png`.

**육안 확인 결과:**
1. 카드 전반은 정상·반응형 렌더(hero 중앙정렬, h2 언더라인 액센트, sd-spec 라운드 pill, sd-chips 태그). 모바일에서 sd-spec 세로 스택 정상.
2. **sd-note = 무스타일 좌측 평문** — 경고 박스 없음. 그 내용이 generic fallback(§3-B CRITICAL 육안 확증).
3. **sd-func = 무스타일 중첩 불릿** — 동작하나 계약 스타일 미적용.
4. "주요 기능성" ≈ "기능성 상세" 문구 중복 육안 확인.
5. 영문 없음(ko 단일).

**HTML 구조 판정(§5 병행):** 30표본 클래스 집합을 CSS 셀렉터와 대조 → 무스타일 클래스 = {sd-note(30), sd-func(18)}. 나머지는 전부 CSS 매칭.

---

## §6. 전체 범위 자동 점검 (5,669 전건, 정적·read-only)

| 그룹 | 지표 | 결과 |
|------|------|------|
| 링크 무결성 | badCandidateLink / badMasterLink / notApprovedNewMaster / badRegulatoryType | **0 / 0 / 0 / 0** |
| 무결성 | canonicalDup / statementNoDup | **0 / 0** |
| 본문 건전성 | emptyBody / bodyLt60 / brokenTag / abnormalChar / truncation | **0 / 0 / 0 / 0 / 0** |
| 구조 | missingSection / missingFooter / missingH1 | **0 / 0 / 0** |
| grounding | 기능성 35,985 검사 / 섭취칩 5,289 검사 | **fail 0 / fail 0** |
| **주의사항** | generic fallback 담은 설명서 | **5,669 / 5,669** |
| **주의사항 누락** | 원문 INTAKE_HINT1 존재했으나 누락 | **5,463 / 5,669 (96.4%)** |
| 디자인 | sd-note / sd-func / sd-warn / sd-cta / sd-core | **5,669 / 2,431 / 0 / 0 / 0** |
| 콘텐츠 모델 | bareListingOnly | **5,669 / 5,669** |
| 언어 | koOnly / enPair | **5,669 / 0** |

---

## §7. 판정: **PAUSE_AND_FIX**

구조·무결성·grounding(반날조)는 완전 CLEAN이나, 다음 3개 축에서 기준 미달 — **자동 수정 금지, 후속 WO 필요**.

| # | 심각도 | 결함 | 기준 | 범위 |
|---|--------|------|------|------|
| 1 | **CRITICAL** | 공식 주의사항 전건 누락(잘못된 소스 키 IFTKN_ATNT_MATR_CN, 실 소스=INTAKE_HINT1) → generic fallback | HFF-R08 (안전) | 5,463/5,669 실누락 |
| 2 | HIGH | 구매지원 내러티브·"이런 분께"·CTA 부재, 데이터 나열형, 기능성 중복 | HFF-R01/R03/§3 | 5,669 전건 |
| 3 | HIGH | 언어 ko 단일, en 대응 0 | 정책 §4 (ko+en) | 5,669 전건 |
| 4 | MEDIUM | sd-note/sd-func 어휘 밖·무스타일, sd-warn(주의사항 필수) 미사용 | CR-020 V1.2 | sd-note 5,669·sd-func 2,431 |
| 5 | LOW(스코프 한정) | `sd-card sd-theme-green` → hasStoreDescriptionMarkup 자동 판별 실패(태블릿 혼합 슬롯 한정) | ContentRenderer 계약 | 5,669(자동판별 경로만) |

**권고 원인·해소 방향(참고, 본 WO 미실행):**
- #1: driver 주의사항 소스 키를 `INTAKE_HINT1`로 교정 후 재생산(또는 별도 backfill WO). 안전정보이므로 최우선.
- #2/#3: HFF-R01 구매지원 구조 + ko/en 저작 파이프라인 별도 설계 WO.
- #4: 주의사항 → `sd-warn`, 다기능성 상위 목록 → 계약 내 클래스(sd-core>sd-item 등)로 매핑.
- #5: 필요 시 emit을 `class="sd-card ..."` 대신 감지 호환 형태로 조정하거나 판별 로직을 prefix 매칭으로.

---

## 준수 확인

- DB write 0 / UPDATE·DELETE 0 / canonical 변경 0 / driver 수정 0 / 디자인·CSS 수정 0 / 배포 0.
- 자격증명은 Cloud Run env에서만 추출(하드코딩 0), prod DB read-only(SELECT)만 수행.
- 커밋 대상 = 본 CHECK + `data/hff-ko-first-10000-audit-samples.json` (pathspec 지정).
- 임시 스크립트(probe/audit/render-gen/shot/struct)는 감사 후 삭제, 샘플 JSON만 유지.
