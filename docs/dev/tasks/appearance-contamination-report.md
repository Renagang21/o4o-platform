# 외모시스템 데이터 오염 조사 결과 보고서

**조사일시:** 2025-11-09 00:00 KST
**대상:** Customizer Settings (appearance/siteIdentity)
**조사자:** Claude Code

---

## 📊 오염 레코드 통계

### 총 오염 경로: **11개**

| # | 경로 | 숫자 키 개수 | 원본 타입 | 오염 타입 | 재구성 미리보기 |
|---|------|------------|----------|----------|----------------|
| 1 | `blog.archive.meta.items` | 7 | Array | Object | `[object Object]...` |
| 2 | `colors` | 7 | String | Object | `#F44336...` |
| 3 | `footer.bar.left` | 1 | Array | Object | `[object Object]...` |
| 4 | `footer.bar.right` | 1 | Array | Object | `[object Object]...` |
| 5 | `footer.widgets.layout` | 3 | Array | Object | `[object Object]...` |
| 6 | `header.above.content` | 2 | Array | Object | `menusearch...` |
| 7 | `header.below.content` | 1 | Array | Object | `breadcrumb...` |
| 8 | `header.builder.primary.left` | 2 | Array | Object | `[object Object]...` |
| 9 | `header.builder.primary.right` | 4 | Array | Object | `[object Object]...` |
| 10 | `header.builder.primary.center` | 1 | Array | Object | `[object Object]...` |
| 11 | **`siteIdentity`** | **83** | **String (URL)** | **Object** | **`https://api.neture.c...`** |

**메타데이터:**
- `_version`: 18 (저장 반복됨)
- `_updatedAt`: 2025-11-08T23:58:23.246Z
- `_meta.version`: '1.0.0'

---

## 🔍 원인 분석

### 1. 핵심 원인: **스프레드 연산자 오용**

JavaScript에서 배열/문자열을 객체에 스프레드하면:

```javascript
// 배열 스프레드
{ ...['a', 'b', 'c'] }
// → { 0: 'a', 1: 'b', 2: 'c' }

// 문자열 스프레드
{ ...'#F44336' }
// → { 0: '#', 1: 'F', 2: '4', ... }

// URL 스프레드 (83자)
{ ...'https://api.neture.co.kr/uploads/...' }
// → { 0: 'h', 1: 't', 2: 't', ... }
```

### 2. 오염 패턴 분류

#### A. **배열 → 객체 변환** (9개 경로)
- `blog.archive.meta.items`
- `footer.bar.left/right`
- `footer.widgets.layout`
- `header.above/below.content`
- `header.builder.primary.left/right/center`

**추정 원인:**
```javascript
// 잘못된 병합
const result = { ...existingObject, ...arrayValue };
```

#### B. **문자열 → 객체 변환** (2개 경로)
- `colors` - 색상 코드 `#F44336`
- `siteIdentity` - 로고 URL (83자)

**추정 원인:**
```javascript
// 잘못된 병합
const result = { ...logoUrl, ...siteIdentity };
// 또는
const result = { ...colorString, ...colorSettings };
```

### 3. 순환 오염 루프

```
┌─────────────────────────────────────────────┐
│  DB (오염 데이터: 숫자 키 포함)              │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  GET API (/settings/customizer)             │
│  → 오염 데이터 그대로 반환                    │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  프론트엔드 normalize()                      │
│  → 숫자 키 포함해서 병합 (필터링 없음)         │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  사용자 수정 + 저장                          │
│  → 오염 데이터 + 수정사항 함께 저장           │
└─────────────────┬───────────────────────────┘
                  ↓
                (처음으로)
```

---

## 🎯 영향 범위

### 데이터 계층
- ✅ **단일 레코드 오염**: `customizer` 설정 1건
- ⚠️ **광범위한 경로**: 11개 경로에서 숫자 키 탐지
- ⚠️ **타입 불일치**: 배열/문자열이 객체로 저장됨

### 기능 영향
1. **사이트 정보** (siteIdentity):
   - 로고 URL 손상 (83개 숫자 키)
   - 저장/로드 시 타입 불일치

2. **색상 설정** (colors):
   - 색상 코드 문자열 분해

3. **레이아웃 구조** (header/footer):
   - 배열 기반 위젯/메뉴 구조 손상
   - 빌더 UI 오작동 가능

### 사용자 경험
- ❌ 설정 저장 후 일부 값이 기본값으로 되돌아감
- ❌ 미리보기/다시보기 시 과거 상태로 회귀
- ❌ 로고/색상/레이아웃이 의도와 다르게 표시

---

## 📋 샘플 3건 (대표 사례)

### 샘플 1: siteIdentity (문자열 오염)
```json
{
  "0": "h", "1": "t", "2": "t", "3": "p", ...
  "logo": { "width": { "mobile": 408, "tablet": 408, "desktop": 408 } },
  "siteTitle": { "text": "O4O Platform1" }
}
```
**복원 필요:** 숫자 키 83개 제거, URL 문자열 복원

### 샘플 2: colors (문자열 오염)
```json
{
  "0": "#", "1": "F", "2": "4", "3": "4", "4": "3", "5": "3", "6": "6",
  "primary": "#3b82f6",
  "secondary": "#64748b"
}
```
**복원 필요:** 숫자 키 7개 제거

### 샘플 3: header.builder.primary.left (배열 오염)
```json
{
  "0": { "id": "logo-1762410355086", "type": "logo", ... },
  "1": { "id": "site-title-1762410376573", "type": "site-title", ... }
}
```
**복원 필요:** 객체를 배열로 변환 `[item0, item1]`

---

## ⚠️ 즉시 조치 필요

### 1. 쓰기 동결 (우선순위: 높음)
- [ ] "사이트 정보" 섹션 저장 비활성화 (임시)
- [ ] 또는 서버 측 검증 강화 (숫자 키 거부)

### 2. DB 백업 (우선순위: 최상)
- [ ] 현재 `customizer` 설정 전체 백업
- [ ] 타임스탬프: `customizer_backup_20251109_000000.json`

### 3. 캐시 무력화 (우선순위: 중)
- [ ] Service Worker 비활성화/재등록
- [ ] 브라우저 Hard Reload 지시
- [ ] Local/Session Storage 클리어

---

## 🔧 데이터 정리 전략

### Phase 1: 백업
```bash
# customizer 설정 백업
node backup-customizer.js > customizer_backup_$(date +%Y%m%d_%H%M%S).json
```

### Phase 2: 정리 규칙

#### A. 배열 복원 (9개 경로)
```javascript
// 객체 → 배열 변환
if (숫자 키만 존재) {
  const array = Object.keys(obj)
    .filter(k => /^\d+$/.test(k))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(k => obj[k]);
  return array;
}
```

#### B. 문자열 복원 (2개 경로)
```javascript
// siteIdentity: 숫자 키 완전 제거
delete obj['0'], obj['1'], ... obj['82'];

// colors: 숫자 키 제거
delete obj['0'], ... obj['6'];
```

#### C. 검증
- 숫자 키 존재 확인: `Object.keys(obj).some(k => /^\d+$/.test(k))`
- 타입 일치 확인: `Array.isArray()`, `typeof === 'string'`

### Phase 3: 재검증
1. GET API로 재조회 → 숫자 키 없음 확인
2. 프론트엔드 로드 → 정상 표시 확인
3. 저장 테스트 → 재오염 없음 확인

---

## 📝 권장 실행 순서

1. ✅ **오염 레코드 수 파악** (완료)
2. ⏳ **DB 백업** (다음 단계)
3. ⏳ **데이터 정리 스크립트 작성**
4. ⏳ **정리 실행 + 검증**
5. ⏳ **재오염 방지 코드 수정**

---

## 📎 참고 파일
- 탐지 스크립트: `/tmp/detect-contamination.js`
- 보고서 원본: `docs/dev/tasks/appearance-contamination-report.md`
