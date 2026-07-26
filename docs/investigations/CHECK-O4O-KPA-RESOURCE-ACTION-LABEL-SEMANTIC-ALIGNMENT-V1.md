# CHECK-O4O-KPA-RESOURCE-ACTION-LABEL-SEMANTIC-ALIGNMENT-V1

> **WO:** WO-O4O-KPA-RESOURCE-ACTION-LABEL-SEMANTIC-ALIGNMENT-V1
> **선행:** [CHECK-O4O-KPA-FORUM-RESOURCE-STORE-COPY-REMOVAL-V1](CHECK-O4O-KPA-FORUM-RESOURCE-STORE-COPY-REMOVAL-V1.md) (`ab4c31b53` · `55b24623b`)
> **작성일:** 2026-07-26
> **유형:** 라벨/아이콘만 정비. 기능·API·DB·migration 0.
> **상태:** ✅ 코드 완료 / 4개 서비스 tsc 0 · build 성공 — 브라우저 smoke 는 배포 후(§9)

---

## 1. 기존 버튼 라벨과 실제 동작

행/카드 버튼 라벨이 **자료 유형과 무관하게 `'가져가기'` 고정**이었다
([ResourcesHubTemplate.tsx](../../packages/shared-space-ui/src/ResourcesHubTemplate.tsx) `takeLabel = isCopied ? '복사됨!' : '가져가기'`).

실제 실행은 `handleTakeAction` 이 `actionType` 으로 분기한다:

| actionType | 실제 실행 | 기존 라벨 | 정합? |
|-----------|-----------|-----------|:----:|
| `external` | `window.open(url, '_blank')` — 외부 링크 열기 | 가져가기 | ❌ |
| `download` | `writeClipboard(source_url)` — **파일 링크를 클립보드에 복사** | 가져가기 | ❌ |
| `copy` / `view` | `writeClipboard(본문 텍스트)` — 내용 복사 | 가져가기 | ❌ |

### ⚠️ WO 가정과 다른 사실 (보고 필요)

WO §6.1 은 첨부파일 자료의 라벨을 **"다운로드"** 로 제안했으나, **행 버튼의 `download` 분기는 파일을 내려받지 않는다.**
`writeClipboard(url, '파일 링크가 복사되었습니다')` — 파일 URL 을 클립보드에 복사할 뿐이다(코드 주석상 "AI 전달용").

WO §6.2 가 "라벨과 실제 실행 결과가 달라서는 안 된다" 를 명시하므로, **§6.2 를 우선**해 `'파일 링크 복사'` 로 표기했다.
"다운로드" 라벨을 붙였다면 오인 라벨을 다른 오인 라벨로 바꾸는 결과가 됐을 것이다.

> 실제 파일 다운로드는 **Drawer 하단 버튼**이 수행한다(`<a download={source_file_name}>`, [:958-968](../../packages/shared-space-ui/src/ResourcesHubTemplate.tsx#L958)). Drawer 라벨(`바로가기` / `다운로드` / `내용 복사`)은 **이미 정확**하여 변경하지 않았다.

---

## 2. 자료 유형 판정 기준 (무변경)

`getActionType(item)` — 기존 로직 그대로 사용했다.

```
명시 actionType 우선 → 없으면 source_type / source_url 로 추론
```

KPA 는 `usage_type` 을 매핑해 전달한다(`LINK→external`, `DOWNLOAD→download`, `COPY→copy`, 그 외 `view`) — [ResourcesHubPage.tsx:82-88](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L82).
**판정 기준·데이터 모델 무변경.**

---

## 3. 유형별 최종 라벨

| actionType | 라벨 | 아이콘 | 실제 동작 |
|-----------|------|--------|-----------|
| `external` | **링크 열기** | `ExternalLink` (유지) | 새 탭으로 외부 링크 열기 |
| `download` | **파일 링크 복사** | `Download` → **`Copy`** | 파일 URL 클립보드 복사 |
| `copy` / `view` | **내용 복사** | `Copy` (유지) | 본문 텍스트 클립보드 복사 |
| (복사 직후 공통) | `복사됨!` | — | 기존 피드백 유지 |

- 라벨은 **실행 분기와 동일한 `actionType` 으로 계산**하므로 §6.2 의 우선순위 일치 요구를 구조적으로 만족한다(라벨과 실행이 같은 값에서 파생).
- 아이콘은 §6.1 단서("실제 동작과 명백히 어긋나는 경우에만 기존 아이콘 세트 안에서 정렬")에 따라 `download` 만 `Download → Copy` 로 교체했다. 새 아이콘 도입 없음.
- **중립 라벨(`자료 이용하기`)은 사용하지 않았다** — 세 유형이 `actionType` 으로 결정적으로 구분되므로 §6.4 의 조건에 해당하지 않는다.

---

## 4. 공용 템플릿 변경 여부

**변경함** — `ResourcesHubTemplate` 내부에 `getTakeLabel(actionType)` 헬퍼를 추가하고 데스크톱 행·모바일 카드 두 곳에서 사용.

WO §6.3 의 해결 순서 중 **1번(기존 템플릿의 동작 판정으로 라벨만 자동 계산)** 을 채택했다.

- 서비스별 prop·resolver 를 추가하지 않았다 → 소비처 코드 변경 0, 중복 0.
- **KPA 전용 조건문을 템플릿에 넣지 않았다**(§6.3 금지 조항 준수). 라벨은 오직 `actionType` 에서 파생된다.
- `isStoreTarget`(=`onCopyToStore` 전달 시) 경로는 **기존 `'가져가기'` 라벨을 그대로 유지**하도록 방어했다 — 향후 매장 복사를 쓰는 소비처가 생겨도 라벨이 잘못 바뀌지 않는다.

---

## 5. 타 서비스 영향

`ResourcesHubTemplate` 소비처 **4곳**: KPA · GlycoPharm · K-Cosmetics · Neture.

| 확인 | 결과 |
|------|------|
| `onCopyToStore` 를 전달하는 소비처 | **0곳** (KPA 는 선행 WO 에서 제거, GP/KCos/Neture 는 원래 미사용) |
| → 매장 복사 라벨이 "다운로드" 등으로 잘못 표시될 위험 | **없음** (§8 리스크 미해당) |
| 4개 서비스의 버튼 동작 | **무변경** — `handleTakeAction` 로직 자체를 건드리지 않음 |
| 4개 서비스의 라벨 | 모두 실제 동작 기준으로 **정확해짐**(동일 동작이므로 일관 적용이 옳다) |
| 다운로드·링크·복사 분기 | **회귀 없음**(분기 코드 무변경) |

---

## 6. 매장 복사 호출 부재 확인

| 확인 | 결과 |
|------|:----:|
| `ResourcesHubPage` 의 `assetSnapshotApi` import | **없음**(선행 WO 에서 제거) |
| `onCopyToStore` 전달 | **없음** |
| 버튼 클릭 경로 | `handleTakeAction` 만 — `window.open` / `navigator.clipboard` 만 호출 |
| `POST /assets/copy` 발생 | **0** (코드상 호출 지점 없음) |
| 복사 완료 CTA·토스트 | 매장 복사 관련 **0** (클립보드 성공 토스트만) |
| 서버 차단(선행 WO) | resolver `resource` 분기 제거 + `resolveContent` sub_type 필터 — **유지** |

**본 WO 에서 복사 정책·차단 로직을 다시 손대지 않았다.**

---

## 7. 변경 파일 (2)

| 파일 | 변경 |
|------|------|
| [packages/shared-space-ui/src/ResourcesHubTemplate.tsx](../../packages/shared-space-ui/src/ResourcesHubTemplate.tsx) | `getTakeLabel()` 헬퍼 추가 · 데스크톱 행/모바일 카드 라벨·아이콘 정렬 (동작 코드 무변경) |
| [services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx) | **주석만 정정** — 선행 WO 에서 "템플릿이 가져가기 액션을 렌더하지 않는다" 고 적었으나 실제로는 버튼이 렌더되고 자료 이용 액션으로 동작한다 |

**다른 세션 WIP 미스테이징:** `pnpm-lock.yaml`, `services/web-neture/src/lib/api/supplier.ts`, `services/web-neture/src/pages/supplier/SupplierB2BContentPage.tsx`, `services/web-neture/src/pages/supplier/SupplierRecruitmentsPage.tsx`

---

## 8. typecheck / build

| 대상 | 결과 |
|------|:----:|
| web-kpa-society `tsc --noEmit` | ✅ 0 |
| web-glycopharm `tsc --noEmit` | ✅ 0 |
| web-k-cosmetics `tsc --noEmit` | ✅ 0 |
| web-neture `tsc --noEmit` | ✅ 0 |
| web-kpa-society `vite build` | ✅ 성공 (15.91s) |

> 공용 템플릿 변경이라 **소비처 4개 서비스 전부** typecheck 했다.

---

## 9. 브라우저 smoke

**배포:** Deploy Web Services ✅ success (`03f00916a`)
**대상:** `https://kpa-society.co.kr/resources` (Playwright 실브라우저, 비로그인)

**prod 데이터 전제:** 자료 3건 **전부 `usage_type=DOWNLOAD`**(`source_type=upload`) → 세 건 모두 `actionType='download'`.

| # | 항목 | 결과 | 근거 |
|---|------|:----:|------|
| 1 | **'가져가기' 오인 라벨 제거** | ✅ **PASS** | `/resources` 행·카드에서 `'가져가기'` **0건** |
| 2 | **`download` 유형 라벨** | ✅ **PASS** | `'파일 링크 복사'` **6건** = 데스크톱 행 3 + 모바일 카드 3 (양쪽 뷰 모두 정합) |
| 3 | 페이지 정상 | ✅ **PASS** | 자료 3건 렌더, 검색 입력 존재, 오류 문구 없음 |
| 4 | 버튼 클릭 | ✅ **PASS** | Playwright 실클릭 성공, 페이지 이탈·오류 없음(`/resources` 유지) |
| 5 | **매장 복사 미발생** | ✅ **PASS** | 클릭 후 네트워크 요청 중 `assets` / `copy` / `snapshot` 매칭 **0건** (`browser_network_requests` 필터) |
| 6 | 반응형 | ✅ **부분 PASS** | 데스크톱·모바일 뷰 버튼이 각각 3개씩 정상 렌더(#2). 긴 라벨로 인한 시각적 깨짐은 스크린샷 미확인 |

### 9-1. 미검증 항목

| 미검증 | 사유 |
|--------|------|
| `external`(링크 열기) · `copy/view`(내용 복사) 라벨 | **prod 자료 3건이 전부 `DOWNLOAD` 유형**이라 해당 데이터가 없다. 라벨은 `download` 와 같은 `getTakeLabel(actionType)` 한 함수에서 파생되므로 동일 경로지만, 실데이터 확인은 못 했다 |
| 클릭 후 클립보드 내용·토스트 문구 | 클릭 직후 브라우저 세션이 종료되어 캡처 실패(§9-2) |
| Drawer 라벨·실제 다운로드 회귀 | 동일 사유. **Drawer 코드는 본 WO 에서 변경하지 않았다** |
| `/content/resources` · 콘텐츠 복사 · 포럼 회귀 | 동일 사유. 해당 파일들은 본 WO 에서 미변경 |
| GP / K-Cosmetics / Neture 자료실 화면 회귀 | 동일 사유. 4개 서비스 **tsc 는 전부 통과**(§8), 실행 로직 무변경 |

### 9-2. 검증 환경 제약 (기록)

Playwright MCP 브라우저 프로필이 반복적으로 잠기고(`Browser is already in use`) `evaluate` 도중 세션이 종료되는(`Target page ... has been closed`) 상태가 이어져, 긴 스크립트 기반 검증을 완주하지 못했다. 프로필 강제 종료 → 재기동을 반복한 여파로 보인다. **추정으로 PASS 처리하지 않고 위와 같이 구분해 기록한다.**

---

## 10. 변경하지 않은 범위

```
자료실 매장 복사 정책 · 포럼 복사 정책 · 콘텐츠 복사 · 디지털사이니지 복사
handleTakeAction 실행 로직 · getActionType 판정 · Drawer 라벨/다운로드 동작
자료실 route 이원화 · 자료 데이터 모델 · 다운로드 API · 외부 링크 저장 방식
로그인 유도 · 태그 정책 · Home 구조 · 신규 테이블 · migration · 신규 API
소비처 4개 서비스의 호출부 코드
```

---

*End of CHECK-O4O-KPA-RESOURCE-ACTION-LABEL-SEMANTIC-ALIGNMENT-V1*
