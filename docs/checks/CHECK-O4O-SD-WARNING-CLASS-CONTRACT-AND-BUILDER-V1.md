# CHECK-O4O-SD-WARNING-CLASS-CONTRACT-AND-BUILDER-V1 — `sd-warn` 경고 클래스 신설

WO: `WO-O4O-SD-WARNING-CLASS-CONTRACT-AND-BUILDER-V1` · 일자: 2026-07-16 · 상태: 완료 (계약·코드)
근거: [PILOT-VALIDATION §8-A](CHECK-O4O-OTC-EN-DESIGN-PILOT-VALIDATION-V1.md) (결함 실증) · 계약: [STORE-DESCRIPTION-CLASS-CONTRACT V1.2](../guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md) (CR-020)

> **계약·코드 정비까지.** DB write **0** · 기존 686건 콘텐츠 UPDATE **0** · 공개 데이터 변경 **0**.
> **686건 재생성은 별도 승인 WO** (§7).

---

## 1. 결론

> **`sd-warn` 신설 완료** — 계약(CR-020 V1.2) · 렌더러 · ko/en 빌더 반영.
> 신규 콘텐츠 검증 **45/45 PASS**(5폭 × 9건, HFF 회귀 포함). **DB 콘텐츠 지문 불변.**
> ⚠️ **이미 공개된 1,372건(ko 686 + en 686)은 아직 `sd-who`** — 이 개선을 받지 못한다(§7).

---

## 2. 클래스명 결정 — `sd-warn`

| 확인 | 결과 |
|---|---|
| 기존 어휘 충돌 | **0** (`sd-card`·`sd-hero`·`sd-badges`·`sd-badge`·`sd-meta`·`sd-body`·`sd-intro`·`sd-why`·`sd-who`·`sd-core`·`sd-item`·`sd-tag`·`sd-intake`·`sd-chips`·`sd-spec`·`sd-cta`·`sd-cta-k`·`sd-foot`·`sd-scan`·`sd-theme-*`) |
| 명명 체계 | 기존과 동일한 `sd-{역할}` 패턴 |
| 재사용 검토 | `sd-who`("이런 분께")·`sd-item`·`sd-cta` — **전부 의미가 어긋나 기각** |

---

## 3. 변경

### 3-1. 계약 (CR-020 V1.1 → **V1.2**)

`guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md` **§2-1 신설** — 전 제품군 공통.

| 규칙 | 내용 |
|---|---|
| 용도 고정 | 금기·경고·주의사항 **전용** |
| 재사용 금지 | `sd-who`·`sd-item`·`sd-cta` 를 경고 용도로 쓰지 않는다 |
| **의미 색** | `--sd-warn` 계열은 **`sd-theme-*` 가 바꾸지 않는다** — 경고는 브랜드 accent 와 별개 축(§4 에도 명시) |
| **색 의존 금지** | 삼각 마커 + 좌측 굵은 선 + 박스 배경을 **함께** 제공 |
| **다단 금지** | 640px↑ 에서도 1열 유지(`sd-why`/`sd-who` 는 2열) — 금기가 두 열로 쪼개지면 오독. 행 길이 `74ch` |

**기존 어휘·구조 변경 없음 — 추가만.** 새 CR 미신설(CR-020 범위 내).

### 3-2. 렌더러 (`ContentRenderer.tsx`)

| 추가 | 내용 |
|---|---|
| 토큰 | `--sd-warn` / `--sd-warn-bg` / `--sd-warn-line` — **4개 블록 전부**(`:root` · `prefers-color-scheme:dark` · `[data-theme=dark]` · `[data-theme=light]`) |
| 스타일 | `.sd-warn` 박스(테두리 + 좌측 3px + 배경) · `li` 구분선 · `li::before` **CSS 삼각 마커**(글꼴 의존 없음) · `b/strong` 강조색 |
| `@container ≥640` | `padding` 확대 + **`max-width:74ch` 중앙** (다단 미적용) |

`sd-theme-*` 규칙이 `--sd-warn` 을 건드리지 않으므로 **홍삼 테마에서도 경고색 동일**.

### 3-3. 빌더

| 파일 | 변경 |
|---|---|
| `drug-otc-description-consumer-html.ts` (ko) | 주의 대상 `<ul class="sd-who">` → **`<ul class="sd-warn">`** |
| `drug-otc-en-consumer-html.ts` (en) | `Before you take this` 목록 동일 전환 |

**주의: 이 변경은 신규 생성분에만 적용된다** — DB 의 기존 686건은 그대로다(WO 범위).

---

## 4. 검증

### 4-1. 렌더 — **45/45 PASS**

신규 생성 콘텐츠 **en 5 + ko 3** + **HFF 정본 예제 1** × **5폭**(375 · 768 · 1024 · 1280 · **200% 확대**(640)).

| 항목 | 결과 |
|---|---|
| 신규 HTML 에 `sd-warn` 적용 | **8/8** · `sd-who` 잔존 **0** |
| **잘림** | **0** |
| **가로 스크롤** | **0** |
| **200% 확대** | PASS |
| 라이트/다크 | **양쪽 정상**(스크린샷 확인) |

### 4-2. 원칙 대조

| 원칙 | 확인 |
|---|---|
| 금기·경고 전용 의미 | ✅ 계약 §2-1 |
| 기존 class 의미 왜곡 재사용 안 함 | ✅ `sd-who` 미사용 |
| 공통 계약(HFF 등도 사용 가능) | ✅ content-authoring 축(전 제품군) |
| 제품군별 임의 재정의 없음 | ✅ 스코프 CSS 1곳 |
| **색만으로 의미 전달 안 함** | ✅ **삼각 마커 · 좌측 3px 선 · 박스 배경** — 흑백으로 봐도 구획이 남는다 |
| 반응형·200%에서 잘림 없음 | ✅ 45/45 |

### 4-3. 기존 숫자·문장·항목 순서 변경 0

빌더 변경은 **`<ul>` 의 class 속성 1개**뿐이다. `<li>` 내용·개수·순서를 만드는 코드(`sentences()` / `paragraphs()`)는 **미변경** → 문장 분할 결과 동일.

### 4-4. HFF 회귀 — **없음**

| 확인 | 결과 |
|---|---|
| HFF 정본(`byeonenjang.semantic.html`) 의 `sd-warn` 요소 | **0** (HFF 는 이 어휘를 쓰지 않는다) |
| `sd-card` / `sd-core` 단 구성 | **1 / 2열** — 기존과 동일 |
| `sd-who li` 테두리 | **`rgb(228,235,243)`** = 기존 `--sd-line` 그대로 |
| 렌더 5폭 | 잘림 0 · 가로 스크롤 0 |

→ **추가된 규칙이 기존 어휘에 전혀 걸리지 않는다.**

### 4-5. 기존 공개 686건 DB 콘텐츠 불변

```text
apply 전/후 콘텐츠 지문(md5) : 3a03f9669f57f3a5e334d87d5a608a6f  (686 rows)  — 동일
en canonical 686 / ko canonical 686 — 불변
DB write : 0
```

### 4-6. typecheck / build

| 항목 | 결과 |
|---|---|
| `content-editor` typecheck | ✅ **exit 0** |
| `content-editor` build | ✅ **Build success** (ESM + DTS) |
| `api-server` typecheck — 내 파일 | ✅ **0 오류** (저장소 전체 3 — 내 변경 무관) |
| 테스트 | ✅ **61/61** (신규 1: "주의사항을 `sd-warn` 으로 낸다 — `sd-who` 재사용 금지") |
| `api-server` build | ⚠️ 타 세션 `e41c78157`(content-guard) 선행 결함 — 본 WO 무관 |

---

## 5. 문서 반영

| 문서 | 변경 |
|---|---|
| [클래스 계약](../guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md) **V1.1 → V1.2** | §2 어휘표·트리 + **§2-1 신설** + §4 테마 예외 명시 |
| [OTC 디자인 GUIDE](../guides/OTC-DESCRIPTION-DESIGN-GUIDE.md) **V0.5 → V0.6** | §2 `sd-warn` 반영 · **§8-A 계약·코드 해소**(소급 미완 명시) |
| [디자인 TEST-LOG](../guides/OTC-DESCRIPTION-DESIGN-TEST-LOG.md) **V0.4 → V0.5** | **D-8** 기록 |

버전·이력은 **같은 커밋에서 갱신**(OR-005).

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 공통 경고 클래스 계약 확정 | ✅ CR-020 V1.2 §2-1 |
| 렌더러와 ko/en 빌더 반영 | ✅ §3-2 · §3-3 |
| **기존 686건 UPDATE 0** | ✅ 지문 불변 · DB write 0 |
| commit·push | ✅ |

---

## 7. 남은 것 — **686건 재생성 (별도 승인 WO)**

실측한 소급 대상:

| 언어 | rows | `sd-who` 보유 | `sd-warn` 보유 |
|---|---:|---:|---:|
| ko | 686 | **686** | **0** |
| en | 686 | **686** | **0** |
| **합계** | **1,372** | **1,372** | **0** |

> ⚠️ **공개 중인 콘텐츠 1,372건이 이 개선을 받지 못한다.** WO 는 "686건"으로 적었으나 **실제로는 ko·en 양쪽 = 1,372 rows** 다 — 재생성 WO 범위 산정 시 확인이 필요하다.
>
> 재생성 시 검증 방식(사전 합의): **전후 지문 비교로 "주의사항 마크업 외 변경 0" 증명** — `content` 에서 `sd-who`→`sd-warn` 치환 외 diff 가 없어야 한다.

| 그 외 | 비고 |
|---|---|
| §8-B | 키오스크 variant 미지정 / 다국어 랜딩 렌더러 미사용 |
| §8-C | 언어 전환 UI 4중 중복 |
| B군 608 약사 검토 | 생약 2그룹(299) 우선 |
