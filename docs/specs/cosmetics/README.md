# Cosmetics Extension for Dropshipping Core

이 디렉토리는 Dropshipping Core 패키지를 기반으로 하는 Cosmetics Extension 개발 문서를 포함합니다.

## 문서 목록

- `cosmetics_development_plan.md` - 화장품 서비스 개발 계획
- `cosmetics_api_spec.md` - 화장품 서비스 API 명세
- `cosmetics_extension_manifest.md` - 익스텐션 Manifest 스펙
- `cosmetics_service_blueprint.md` - 화장품 서비스 전체 블루프린트
- `cosmetics_ui_wireframes.md` - 화장품 서비스 UI 와이어프레임

## 관련 문서

- [Dropshipping Core 조사 보고서](../../dev/audit/dropshipping/)
- [AppStore 아키텍처](../../dev/audit/appstore/)
- [Forum App 패턴](../../dev/audit/forum-app/)

## Extension 개발 가이드

Cosmetics Extension은 Dropshipping Core의 Extension App으로 개발됩니다.

### 기본 구조

```
packages/dropshipping-cosmetics/
├── package.json
├── src/
│   ├── manifest.ts          # Extension manifest
│   ├── backend/
│   │   ├── entities/        # 추가 엔티티
│   │   ├── services/        # 화장품 특화 서비스
│   │   └── routes/          # 추가 API 라우트
│   ├── admin-ui/            # 관리자 UI 확장
│   ├── main-site/           # 메인 사이트 UI 확장
│   └── lifecycle/           # 생명주기 훅
└── tsconfig.json
```

### Manifest 예시

```typescript
import type { AppManifest } from '@o4o/types';

export const cosmeticsExtensionManifest: AppManifest = {
  appId: 'dropshipping-cosmetics',
  name: 'Dropshipping Cosmetics',
  type: 'extension',
  extendsApp: 'dropshipping-core',
  version: '1.0.0',
  // ... 추가 설정
};
```

## 개발 순서

1. ✅ Step 1: Dropshipping Core 패키지 완성
2. ✅ Step 2: Core/Extension 패턴 정립
3. ⏳ Step 3: Cosmetics Extension 스펙 작성 (현재 단계)
4. ⏳ Step 4: Cosmetics Extension 개발
5. ⏳ Step 5: 통합 테스트 및 배포
