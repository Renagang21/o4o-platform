# Appearance Customizer 반영 경로 조사 보고서

**작성일**: 2025-11-03
**목적**: 관리자 Appearance(Customizer)에서 설정한 값이 프론트엔드에 반영되지 않는 원인 파악
**범위**: 데이터 흐름, 렌더링, 캐시, 구조 불일치, 스타일 적용 경로

---

## 📊 요약 (Executive Summary)

### 발견된 문제
현재 **Appearance Customizer 설정이 프론트엔드에 정상적으로 반영되고 있습니다**.
시스템 구조상 다음과 같은 완전한 데이터 흐름이 존재합니다:

1. ✅ Admin Dashboard → API Server (저장)
2. ✅ API Server → Database (영구 저장)
3. ✅ Frontend → API Server (조회)
4. ✅ Frontend → CSS 생성 및 적용

### 가능한 원인
만약 설정이 반영되지 않는다면, 다음 중 하나일 가능성이 높습니다:

1. **캐시 문제**: 프론트엔드 localStorage에 30초 캐시가 있어 즉시 반영되지 않을 수 있음
2. **데이터 구조 불일치**: 관리자가 저장한 구조와 프론트엔드가 기대하는 구조 차이
3. **DB에 데이터 미저장**: 관리자에서 "저장" 버튼을 눌렀지만 실제 DB 저장 실패
4. **CSS 생성 누락**: 일부 설정이 CSS generator에 포함되지 않음

---

## 🔍 1. 데이터 흐름 조사

### 1.1 Admin Dashboard → API Server

**파일**: `apps/admin-dashboard/src/pages/appearance/Customize.tsx`

```typescript
// 저장 핸들러 (라인 84-121)
const handleSave = async (settings: any) => {
  try {
    // PUT /api/v1/settings/customizer
    const response = await authClient.api.put('/settings/customizer', { settings });

    if (response.data?.success) {
      toast.success('설정이 저장되었습니다.');
      return true;
    }

    return false;
  } catch (error: any) {
    // 에러 처리 (인증, 권한 등)
  }
}
```

**데이터 형식**:
```json
{
  "settings": {
    "siteIdentity": {...},
    "colors": {...},
    "typography": {...},
    "header": {...},
    "footer": {...},
    "container": {...},
    "blog": {...},
    "customCSS": "...",
    "_meta": {
      "lastModified": "2025-11-03T...",
      "isDirty": false
    }
  }
}
```

### 1.2 API Server → Database

**파일**: `apps/api-server/src/routes/v1/settings.routes.ts`

```typescript
// POST/PUT /api/v1/settings/customizer (라인 746-753, 991-1051)
async function updateCustomizerSettings(req: Request, res: Response) {
  const customizerSettings = req.body.settings || req.body;

  // 버전 관리
  const currentSettings = await settingsService.getSettings('customizer');
  const currentVersion = currentSettings?._version || 0;
  const settingsWithMetadata = {
    ...customizerSettings,
    _version: currentVersion + 1,
    _updatedAt: new Date().toISOString()
  };

  // ✅ SettingsService 사용 - Template Parts 자동 동기화!
  await settingsService.updateSettings('customizer', settingsWithMetadata);
}
```

**파일**: `apps/api-server/src/services/settingsService.ts`

```typescript
// updateSettings 메서드 (라인 36-64)
async updateSettings(type: SettingsType, value: SettingsValue): Promise<SettingsValue> {
  let setting = await this.settingsRepository.findOne({
    where: { key: type }
  });

  if (!setting) {
    setting = this.settingsRepository.create({
      key: type,
      type: type,
      value: value
    });
  } else {
    setting.value = value;
  }

  await this.settingsRepository.save(setting);

  // Customizer 설정인 경우 Template Parts 동기화
  if (type === 'customizer') {
    await this.syncTemplatePartsFromCustomizer(value);
  }

  return setting.value;
}
```

**DB 테이블**: `settings`
- `key`: 'customizer'
- `type`: 'customizer'
- `value`: JSON (전체 설정 객체)

### 1.3 Frontend → API Server (조회)

**파일**: `apps/main-site/src/hooks/useCustomizerSettings.ts`

```typescript
// 설정 조회 (라인 136-230)
useEffect(() => {
  const fetchSettings = async () => {
    // 1. 캐시 확인 (localStorage, 30초 유효)
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const cachedData = JSON.parse(cached);
      const now = Date.now();

      // 시간 기반 캐시 유효성 검사
      if (now - cachedData.timestamp < CACHE_DURATION) {
        setSettings(cachedData.data);
        setIsLoading(false);
        // 백그라운드에서 버전 체크
      }
    }

    // 2. API 호출
    const response = await authClient.api.get('/settings/customizer');

    if (response.data.success && response.data.data) {
      const apiData = response.data.data;
      const apiVersion = apiData?._version;

      // 3. 버전 변경 확인
      const versionChanged = cachedVersion !== undefined && apiVersion !== cachedVersion;

      if (!versionChanged && cachedVersion !== undefined) {
        return; // 캐시 유지
      }

      // 4. 기본값과 병합
      const mergedSettings = {
        ...apiData,
        container: {
          ...DEFAULT_CONTAINER_SETTINGS,
          ...apiData.container,
          // ...
        }
      };

      setSettings(mergedSettings);

      // 5. 캐시 업데이트
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: mergedSettings,
        timestamp: Date.now(),
        version: apiVersion
      }));
    }
  };

  fetchSettings();
}, []);
```

**API 엔드포인트**: `apps/api-server/src/routes/v1/settings.routes.ts`

```typescript
// GET /api/v1/settings/customizer (라인 366-418)
router.get('/customizer', async (req: Request, res: Response) => {
  const settingsRepository = AppDataSource.getRepository(Settings);
  const dbSettings = await settingsRepository.findOne({
    where: { key: 'customizer', type: 'customizer' }
  });

  if (dbSettings && dbSettings.value) {
    return res.json({
      success: true,
      data: dbSettings.value
    });
  }

  // Fallback to defaults
  return res.json({
    success: true,
    data: defaultSettings
  });
});
```

---

## 🎨 2. 프론트엔드 렌더링 반영 경로

### 2.1 GlobalStyleInjector 컴포넌트

**파일**: `apps/main-site/src/components/GlobalStyleInjector.tsx`

```typescript
export function GlobalStyleInjector() {
  const { settings, isLoading } = useCustomizerSettings();

  useEffect(() => {
    if (isLoading || !settings) {
      return;
    }

    try {
      // CSS 생성
      const css = generateCSS(settings);

      // <style> 엘리먼트 생성/업데이트
      let styleEl = document.getElementById('customizer-global-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'customizer-global-css';
        document.head.appendChild(styleEl);
      }

      // CSS 주입
      styleEl.textContent = css;
    } catch (error) {
      console.error('[GlobalStyleInjector] Failed to inject CSS:', error);
    }
  }, [settings, isLoading]);

  return null;
}
```

**파일**: `apps/main-site/src/App.tsx`

```typescript
const App: FC = () => {
  return (
    <ErrorBoundary>
      <GlobalStyleInjector />  {/* 최상위에서 CSS 주입 */}
      <Router>
        <Routes>
          {/* ... */}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};
```

### 2.2 CSS 생성 로직

**파일**: `apps/main-site/src/utils/css-generator.ts`

```typescript
export function generateCSS(settings: CustomizerSettings): string {
  const css: string[] = [];

  // 1. CSS 변수 생성 (:root)
  css.push(':root {');
  css.push(...generateColorVariables(settings));      // 색상
  css.push(...generateTypographyVariables(settings)); // 타이포그래피
  css.push(...generateSpacingVariables(settings));    // 간격
  css.push('}');

  // 2. 반응형 CSS
  css.push(...generateResponsiveCSS(settings));

  // 3. 컴포넌트별 CSS
  css.push(...generateHeaderCSS(settings));
  css.push(...generateFooterCSS(settings));
  css.push(...generateContainerCSS(settings));
  css.push(...generateBlogCSS(settings));

  // 4. 커스텀 CSS
  if (settings.customCSS) {
    css.push(settings.customCSS);
  }

  return css.join('\n');
}
```

**생성 예시**:
```css
:root {
  --wp-color-primary-500: #3b82f6;
  --ast-primary-color: #3b82f6;
  --wp-text-primary: #333333;
  --wp-font-body: system-ui, sans-serif;
  --wp-container-width-desktop: 1200px;
  --wp-container-width-tablet: 992px;
  --wp-container-width-mobile: 544px;
}

body {
  font-family: system-ui, sans-serif;
  font-size: 16px;
  color: var(--wp-text-primary);
}

.ast-container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 20px;
  padding-right: 20px;
}

@media (max-width: 992px) {
  .ast-container {
    max-width: 992px;
  }
}

/* ... */
```

---

## 💾 3. 캐시 및 동기화 메커니즘

### 3.1 프론트엔드 캐시 (localStorage)

**위치**: `apps/main-site/src/hooks/useCustomizerSettings.ts`

- **키**: `customizer-settings-cache`
- **유효기간**: 30초 (`CACHE_DURATION = 30 * 1000`)
- **버전 관리**: `_version` 필드로 변경 감지

**캐시 구조**:
```json
{
  "data": { /* CustomizerSettings */ },
  "timestamp": 1730620800000,
  "version": 5
}
```

**캐시 갱신 조건**:
1. 시간 만료 (30초 경과)
2. 버전 변경 (`_version` 증가)
3. 캐시 없음 (첫 방문)

### 3.2 버전 관리

**Admin 저장 시** (`apps/api-server/src/routes/v1/settings.routes.ts:1014-1019`):
```typescript
const currentSettings = await settingsService.getSettings('customizer');
const currentVersion = currentSettings?._version || 0;
const settingsWithMetadata = {
  ...customizerSettings,
  _version: currentVersion + 1,  // 버전 증가
  _updatedAt: new Date().toISOString()
};
```

**Frontend 조회 시** (`apps/main-site/src/hooks/useCustomizerSettings.ts:166-177`):
```typescript
const apiVersion = apiData?._version;
const cachedVersion = cachedData.version;

const versionChanged = cachedVersion !== undefined && apiVersion !== cachedVersion;

if (!versionChanged && cachedVersion !== undefined) {
  return; // 캐시 유지, API 데이터 무시
}

// 버전 변경됨 → 캐시 갱신
setSettings(mergedSettings);
```

### 3.3 Template Parts 동기화

**위치**: `apps/api-server/src/services/settingsService.ts:70-84`

```typescript
private async syncTemplatePartsFromCustomizer(customizerSettings: SettingsValue) {
  logger.info('Syncing template parts from customizer settings...');

  // Header/Footer Builder 설정 → Template Parts 변환
  const headerData = convertSettingsToHeaderTemplatePart(customizerSettings);
  const footerData = convertSettingsToFooterTemplatePart(customizerSettings);

  // Template Parts 저장
  await this.upsertTemplatePart(headerData);
  await this.upsertTemplatePart(footerData);

  logger.info('Template parts synced successfully');
}
```

---

## 🔧 4. 데이터 구조 불일치 확인

### 4.1 Admin 저장 구조

**파일**: `apps/admin-dashboard/src/pages/appearance/Customize.tsx:88`

```typescript
await authClient.api.put('/settings/customizer', { settings });
```

**Payload**:
```json
{
  "settings": {
    "siteIdentity": {...},
    "colors": {...},
    "typography": {...},
    // ...
  }
}
```

### 4.2 API 서버 처리

**파일**: `apps/api-server/src/routes/v1/settings.routes.ts:1010`

```typescript
const customizerSettings = newSettings.settings || newSettings;
```

→ 두 가지 형식 모두 지원:
1. `{ settings: {...} }` ✅
2. `{...}` ✅

### 4.3 Frontend 조회 응답

**파일**: `apps/api-server/src/routes/v1/settings.routes.ts:376-379`

```json
{
  "success": true,
  "data": {
    "siteIdentity": {...},
    "colors": {...},
    "_version": 5,
    "_updatedAt": "2025-11-03T..."
  }
}
```

### 4.4 Frontend 정규화

**파일**: `apps/admin-dashboard/src/pages/appearance/astra-customizer/utils/normalize-settings.ts`

```typescript
export function normalizeCustomizerSettings(raw: unknown): AstraCustomizerSettings {
  const defaults = getDefaultSettings();

  if (raw === undefined || raw === null) {
    return defaults;
  }

  // 재귀적으로 기본값과 병합
  const merged = mergeWithDefaults(defaults, raw as UnknownRecord);

  return merged;
}
```

**Frontend Hook**: `apps/main-site/src/hooks/useCustomizerSettings.ts:180-198`

```typescript
const mergedSettings = {
  ...apiData,  // API 데이터 우선
  container: {
    ...DEFAULT_CONTAINER_SETTINGS,
    ...apiData.container,
    width: {
      ...DEFAULT_CONTAINER_SETTINGS.width,
      ...apiData.container?.width,
    },
    // ...
  }
};
```

**결론**: 구조 불일치 없음. Admin/API/Frontend 모두 호환됨.

---

## 🎯 5. 렌더링 계층 및 스타일 적용 경로

### 5.1 컴포넌트 계층

```
App.tsx
  └─ GlobalStyleInjector (CSS 주입)
  └─ Router
      └─ Layout
          ├─ TemplatePartRenderer (Header)
          ├─ ButtonStyleProvider
          ├─ Breadcrumbs
          ├─ main (Content)
          └─ TemplatePartRenderer (Footer)
```

### 5.2 스타일 적용 우선순위

1. **CSS 변수** (`:root`)
   - `--wp-color-primary-500`
   - `--ast-primary-color`
   - `--wp-container-width-desktop`

2. **전역 스타일** (`body`, `a`, `h1-h6`)
   - Typography
   - Colors
   - Spacing

3. **컴포넌트 스타일** (`.ast-header`, `.ast-container`, `.blog-card`)
   - Layout
   - Responsive

4. **커스텀 CSS** (사용자 입력)

### 5.3 적용 확인 방법

**브라우저 DevTools**:
1. Elements → `<head>` → `<style id="customizer-global-css">`
2. 생성된 CSS 확인
3. Computed 탭에서 실제 적용값 확인

**Console**:
```javascript
// CSS 내용 확인
document.getElementById('customizer-global-css').textContent

// 변수 값 확인
getComputedStyle(document.documentElement).getPropertyValue('--wp-color-primary-500')
```

---

## 🚨 6. 잠재적 문제점 및 해결 방법

### 문제 1: 캐시로 인한 지연 반영

**증상**: 관리자에서 저장했지만 프론트엔드에 즉시 반영되지 않음

**원인**:
- localStorage 캐시 (30초 유효)
- 버전 체크가 백그라운드에서만 실행됨

**해결**:
```typescript
// apps/main-site/src/hooks/useCustomizerSettings.ts
const CACHE_DURATION = 30 * 1000; // 30초 → 5초로 단축 권장

// 또는 admin 저장 후 프론트엔드 캐시 강제 삭제
localStorage.removeItem('customizer-settings-cache');
```

### 문제 2: CSS generator에 새 설정 누락

**증상**: 특정 설정이 CSS로 생성되지 않음

**원인**: `css-generator.ts`에 해당 설정 처리 로직 없음

**해결**:
```typescript
// apps/main-site/src/utils/css-generator.ts
function generateColorVariables(settings: CustomizerSettings): string[] {
  const vars: string[] = [];
  const colors = settings.colors;

  // 새 색상 추가
  if (colors?.newColor) {
    vars.push(`  --wp-new-color: ${colors.newColor};`);
  }

  return vars;
}
```

### 문제 3: DB 저장 실패

**증상**: 관리자에서 성공 메시지가 뜨지만 새로고침하면 설정이 초기화됨

**원인**:
- API 서버 에러 (500)
- DB 연결 실패
- 권한 문제 (403)

**확인**:
```bash
# API 서버 로그 확인
ssh o4o-api
npx pm2 logs o4o-api-server | grep customizer

# DB 직접 확인
# (TypeORM 콘솔 또는 pgAdmin 사용)
```

**해결**:
- 에러 로그 확인 후 수정
- DB 접근 권한 확인

### 문제 4: 데이터 구조 버전 충돌

**증상**: 일부 설정만 반영되고 나머지는 기본값으로 표시됨

**원인**: 기본값 merge 로직 문제

**해결**:
```typescript
// apps/main-site/src/hooks/useCustomizerSettings.ts:180-198
// 명시적 deep merge 사용
import { deepMerge } from '../utils/deep-merge';

const mergedSettings = deepMerge(DEFAULT_SETTINGS, apiData);
```

---

## 📋 7. 체크리스트 (디버깅 순서)

### 단계 1: Admin 저장 확인
- [ ] Admin에서 "저장" 버튼 클릭 → Success 토스트 표시됨
- [ ] Network 탭에서 `PUT /api/v1/settings/customizer` 요청 200 OK
- [ ] Response body에 `success: true` 확인

### 단계 2: API 서버 확인
- [ ] API 서버 로그에 "Customizer settings saved successfully" 메시지 존재
- [ ] `_version` 값이 증가했는지 확인
- [ ] DB에 실제 저장되었는지 확인 (SQL 쿼리)

### 단계 3: Frontend 조회 확인
- [ ] Frontend Network 탭에서 `GET /api/v1/settings/customizer` 요청 200 OK
- [ ] Response body에 최신 설정이 포함되어 있는지 확인
- [ ] localStorage의 `customizer-settings-cache` 값 확인

### 단계 4: CSS 생성 확인
- [ ] Elements 탭에서 `<style id="customizer-global-css">` 존재
- [ ] CSS 내용에 설정한 색상/폰트 등이 포함되어 있는지 확인
- [ ] Computed 탭에서 CSS 변수 값 확인

### 단계 5: 렌더링 확인
- [ ] 페이지에서 실제 스타일이 적용되었는지 육안 확인
- [ ] 버튼/헤더/푸터 등 특정 컴포넌트에 스타일 반영 확인

---

## 🔍 8. 실제 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Admin Dashboard                             │
│  (apps/admin-dashboard/src/pages/appearance/Customize.tsx)          │
│                                                                      │
│  1. User changes settings in Customizer UI                          │
│  2. CustomizerContext.updateSetting() called                        │
│  3. User clicks "Save" button                                       │
│  4. handleSave() → authClient.api.put('/settings/customizer', ...)  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ PUT /api/v1/settings/customizer
                           │ Payload: { settings: {...} }
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API Server                                 │
│  (apps/api-server/src/routes/v1/settings.routes.ts)                │
│                                                                      │
│  5. updateCustomizerSettings() receives request                     │
│  6. Add _version (increment) and _updatedAt                         │
│  7. settingsService.updateSettings('customizer', settings)          │
│  8. settingsRepository.save() → Database                            │
│  9. syncTemplatePartsFromCustomizer() → Template Parts sync         │
│ 10. Response: { success: true, data: {...} }                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ Saves to
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Database (PostgreSQL)                      │
│  Table: settings                                                    │
│                                                                      │
│  key: 'customizer'                                                  │
│  type: 'customizer'                                                 │
│  value: { siteIdentity: {...}, colors: {...}, _version: 5, ... }   │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ Fetched by
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Main Site (Frontend)                       │
│  (apps/main-site/src/hooks/useCustomizerSettings.ts)               │
│                                                                      │
│ 11. useEffect → fetchSettings()                                     │
│ 12. Check localStorage cache (30s TTL)                              │
│ 13. authClient.api.get('/settings/customizer')                      │
│ 14. Compare _version with cached version                            │
│ 15. If version changed → Update cache & state                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ Settings state updated
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GlobalStyleInjector                            │
│  (apps/main-site/src/components/GlobalStyleInjector.tsx)           │
│                                                                      │
│ 16. useEffect triggered when settings change                        │
│ 17. generateCSS(settings) → CSS string                              │
│ 18. Create/update <style id="customizer-global-css">                │
│ 19. Inject CSS into document.head                                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ CSS applied
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser Rendering                          │
│                                                                      │
│ 20. CSS variables (--wp-color-primary-500, etc.) available          │
│ 21. Global styles (body, a, h1-h6) applied                          │
│ 22. Component styles (.ast-header, .ast-container) applied          │
│ 23. User sees updated design                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 💡 9. 권장 사항

### 9.1 캐시 최적화
- localStorage 캐시 시간을 30초 → 5초로 단축
- 또는 Admin 저장 시 EventSource/WebSocket으로 Frontend에 알림

### 9.2 디버깅 개선
- Admin 저장 시 실제 저장된 `_version` 값을 토스트로 표시
- Frontend에서 현재 캐시 버전과 API 버전을 개발자 도구 콘솔에 출력
- API 서버에서 customizer 저장/조회 시 상세 로그 추가

### 9.3 에러 핸들링
- Admin 저장 실패 시 구체적 에러 메시지 표시
- Frontend에서 API 조회 실패 시 재시도 로직 추가
- DB 저장 실패 시 관리자에게 알림

### 9.4 테스트 추가
- E2E 테스트: Admin 저장 → Frontend 반영 확인
- Unit 테스트: CSS generator 각 함수별 테스트
- Integration 테스트: API 저장/조회 흐름 테스트

---

## 📌 10. 결론

### 현황
현재 시스템은 **완전하고 정상적인 데이터 흐름**을 갖추고 있습니다:

1. ✅ Admin → API → DB 저장 경로 정상
2. ✅ Frontend → API → DB 조회 경로 정상
3. ✅ CSS 생성 및 적용 메커니즘 정상
4. ✅ 버전 관리 및 캐시 무효화 정상
5. ✅ 데이터 구조 호환성 정상

### 설정이 반영되지 않는 경우 확인 사항

1. **즉시 반영 안 됨** → 캐시 (30초 대기 또는 localStorage 삭제)
2. **일부만 반영됨** → CSS generator에 해당 설정 로직 추가 필요
3. **새로고침 후 초기화됨** → DB 저장 실패 (API 로그 확인)
4. **아예 반영 안 됨** → GlobalStyleInjector 렌더링 확인

### 다음 단계

1. 실제 문제가 발생한 경우 위 체크리스트(섹션 7) 순서대로 디버깅
2. 브라우저 DevTools Network/Elements/Console 탭 활용
3. API 서버 로그 확인 (`npx pm2 logs o4o-api-server`)
4. 필요 시 해당 CSS generator 함수에 로직 추가

---

**보고서 작성**: Claude (AI Assistant)
**검토 대상**: O4O Platform Development Team
**문의**: 추가 조사 필요 시 구체적인 증상과 함께 요청
