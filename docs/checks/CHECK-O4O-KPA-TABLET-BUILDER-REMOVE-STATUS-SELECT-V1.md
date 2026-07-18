# CHECK-O4O-KPA-TABLET-BUILDER-REMOVE-STATUS-SELECT-V1

> WO(사용자 설계 지시): 태블릿 콘텐츠 제작기 단순화 — 상태 선택 제거 + 관리 이름 자동 파생 + 기본 정보 단계 제거
> 대상: KPA 태블릿 `새 콘텐츠 만들기` / `수정` 제작기([TabletScreenSetManager.tsx](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx) `TabletContentStepBuilder`)
> 상태: 코드 수정 + 정적 검증 완료 / 프로덕션 브라우저 검증 대기(배포 후)

---

## 1. 배경 / 문제

제작기 `2. 기본 정보` 단계가 **콘텐츠 이름 + 상태(초안/활성)** 두 가지를 사용자에게 요구했는데:

1. **상태(초안/활성)** — 매장 사용자에게 불필요한 판단. `활성`이 "지금 태블릿에 나온다"는 의미로 오해되지만 실제로는 코너 적용과 무관.
2. **콘텐츠 이름 vs 코너 제목** — 2단계에서 `감기약 코너`(콘텐츠 이름), 4단계에서 다시 `감기약 코너`(코너 제목)를 반복 입력. 대부분 동일해 불필요한 중복 UX.

---

## 2. 상태(status) 사용처 조사 (수정 방향 결정 근거)

| 소비처 | 코드 | draft/active 영향 |
|--------|------|------------------|
| 코너 적용 `POST /tablets/:id/current-screen-set` | [store-tablet.routes.ts:1560](../../apps/api-server/src/routes/platform/store-tablet.routes.ts) | **`status !== 'active'` → 409 거부** (draft 는 코너 적용 불가) |
| 목록 `GET /screen-sets` | store-tablet.routes.ts:1210 | `status <> 'archived'` (draft·active 모두 표시, archived만 숨김) |
| 공개 resolve `resolveScreenSetSections` | [store-public-screen-set-resolve.ts:122](../../apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts) | `status <> 'archived'` (draft·active 모두 공개 resolve) |

**결론**: draft vs active 의 유일한 실질 차이 = **코너 적용 가능 여부**(active만 가능). 신규 저장이 `draft` 기본값이던 기존 동작은 "저장 후 코너별 운영에서 적용하려 하면 막히는" 혼란의 원인이었다. → 신규는 `active`, 수정 시 기존 `draft`는 `active`로 승격해야 "저장=사용할 수 있는 세트" 모델과 일치. `archived`·`operator_template` 등 특수 상태는 보존.

---

## 3. 수정

### 변경 파일
- [services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx) (프론트 UI/저장 로직만)

> 서버·DB·마이그레이션 변경 없음. 상태 컬럼·계약 유지(사용자에게 선택만 노출 안 함).

### 3.1 상태 선택 제거 + 파생 규칙
- `2. 기본 정보` 단계의 `상태` select(초안/활성/보관) + `status` state 제거.
- 저장 시 status 파생:
  - **신규 → `active`** (코너 적용 게이트가 active 요구 → 저장 즉시 적용 가능).
  - **수정 → `draft`면 `active`로 승격, 그 외(active/archived/operator_template)는 유지**.
- 기존 데이터의 status 는 UI 로 임의 변경하지 않음(백필/마이그레이션 없음).

### 3.2 콘텐츠 이름 ↔ 코너 제목 병합
- `콘텐츠 이름`(관리용, `name`)을 **코너 제목에서 자동 파생**. `nameEdited` 플래그:
  - 신규 = `false` → 코너 제목 입력 시 `name` 자동 동기화.
  - 수정 = `true` → 기존 관리 이름 보존(코너 제목 변경이 name 을 덮지 않음).
  - 저장 단계에서 관리 이름을 직접 수정하면 `nameEdited=true` → 이후 독립.
- **코너 제목** = 고객 표시용 필수 입력(안내 문구 추가: "고객 태블릿·QR 화면에 표시되는 제목입니다.").
- **관리 이름** = 마지막 `미리보기·저장` 단계로 이동, 선택적 수정(안내: "콘텐츠 목록에서 구분하기 위한 이름입니다. 고객 화면에는 코너 제목이 표시됩니다.").

### 3.3 단계 축소 (6 → 5)
- 상태 제거 후 `기본 정보`엔 이름만 남고, 그 이름은 자동 파생 → **`기본 정보` 단계 제거**.
- 흐름: `1.템플릿 → 2.대기 화면 → 3.코너 설명 → 4.추가 정보 → 5.미리보기·저장`.
- 스텝 인디케이터·네비게이션·`totalSteps` 모두 `BUILDER_STEPS` 파생이라 자동 재번호.
- `저장한 콘텐츠는 코너에 자동 적용되지 않습니다. 실제 태블릿 화면은 '코너별 운영'에서 선택합니다.` 안내는 저장 단계로 이동.
- 저장 유효성: 이름 비었으면(코너 제목·관리 이름 모두 없음) 저장 비활성 + 저장 단계로 유도.

---

## 4. 검증

| 항목 | 결과 |
|------|------|
| typecheck (web-kpa-society) | ✅ `tsc --noEmit` EXIT 0 |
| web production build | ✅ `npm run build` EXIT 0 |
| 신규 흐름(템플릿→대기→코너→추가→저장) | ⏳ 브라우저(배포 후) |
| 코너 제목 입력 시 관리 이름 자동 채움 | ⏳ 브라우저 |
| 저장 단계 관리 이름 수정 → 독립 | ⏳ 브라우저 |
| 신규 저장 후 코너별 운영에서 즉시 적용 가능(active) | ⏳ 브라우저 |
| 수정: 기존 draft 저장 시 active 승격 / active·기타 유지 | ⏳ 브라우저 |
| 수정: 기존 관리 이름 보존(코너 제목 변경이 덮지 않음) | ⏳ 브라우저 |

---

## 5. 결정·주의

- **수정 시 draft→active 승격**: §2 조사(적용 게이트가 active 요구) 근거. 상태 선택 UI 제거 후 draft 를 적용 가능하게 만들 다른 경로가 없으므로, "저장=사용 가능 세트" 모델상 승격이 정합적. `archived`/`operator_template` 는 승격하지 않고 보존.
- **기존 draft 세트(미편집)**: UI 제거 후에도 status 는 그대로 draft(백필 없음). 편집·저장 시 active 로 승격. (프리-서비스 disposable 데이터 원칙과 정합, DB write 0.)
- **코너별 운영 후보 목록**: 기존에도 draft 를 후보로 노출하나 적용은 409 로 막히는 엣지가 존재. 신규는 모두 active 라 향후 draft 는 생성되지 않음. 기존 draft 만의 엣지는 disposable 범위로 판단(백엔드 게이트 미변경).
