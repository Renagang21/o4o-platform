# @o4o/shortcodes

WordPress 스타일의 shortcode 시스템 for O4O Platform

## 특징

- 🔧 **통합 Parser**: 단일 소스로 모든 shortcode 파싱
- 🎨 **React 컴포넌트**: shortcode를 React 컴포넌트로 렌더링
- 🔄 **동적 데이터**: CPT, ACF, Meta 필드 지원
- 📦 **TypeScript**: 완전한 타입 안정성
- 🚀 **캐싱**: API 요청 최적화

## 사용법

```typescript
import { defaultParser, ShortcodeRenderer } from '@o4o/shortcodes';

// Parse shortcodes
const parsed = defaultParser.parse('[cpt_list type="ds_product" count="6"]');

// Render shortcodes
<ShortcodeRenderer content="[cpt_list type='ds_product' count='6']" />
```

## 등록 계약 (SSOT)

registry 는 `src/registry.ts` 의 **`globalRegistry` 단일 인스턴스**다.
renderer 도 editor 도 이 인스턴스만 조회하므로, **여기에 등록되지 않은 shortcode 는
화면에서 원문 그대로 남거나 unknown 으로 표시된다.**

등록은 **side-effect 가 아니다.** 이 패키지를 import 하는 것만으로는 아무것도
등록되지 않고, 소비 앱이 initializer 를 호출해야 한다. 현재 유일한 bootstrap 은
`apps/admin-dashboard/src/utils/register-dynamic-shortcodes.ts` 다.

```typescript
import { globalRegistry, registerPresetShortcode, registerDynamicShortcodes } from '@o4o/shortcodes';

registerDynamicShortcodes(globalRegistry);
registerPresetShortcode();
```

## 실제 등록되는 Shortcodes

### 동적 데이터 (`registerDynamicShortcodes`)
- `[cpt_list]` - CPT 게시물 목록
- `[cpt_field]` - CPT 필드 값
- `[acf_field]` - ACF 커스텀 필드
- `[meta_field]` - 메타 필드 값

### Preset (`registerPresetShortcode`)
- `[preset]` - 저장된 preset 블록 렌더링

### 등록되지 않는 정의
- `[social_login]` · `[login_form]` · `[oauth_login]` — `registerAuthShortcodes()`
  안에 정의돼 있으나 **호출자가 저장소 전체에서 0** 이다. 정의가 있다는 사실은
  등록 근거가 아니다.

정의·등록 상태는 `npx tsx scripts/audit/check-shortcode-registry.ts` 로 확인한다.

## 개발

```bash
# 빌드
pnpm run build

# 타입 체크
pnpm run type-check

# 개발 모드 (watch)
pnpm run dev
```
