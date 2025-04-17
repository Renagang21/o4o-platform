# Backend Common Modules

이 폴더는 백엔드 내에서 공유되는 공통 모듈을 포함합니다.

- `middleware/`: Express 미들웨어 (인증, 로깅, 에러 핸들링 등)
- `helpers/`: 백엔드 전용 헬퍼 함수
- `services/`: 공통 서비스 (이메일, 알림 등)
- `utils/`: 백엔드 전용 유틸리티 함수

**참고**: 이 모듈들은 o4o-platform 백엔드 내에서만 사용됩니다. 다른 프로젝트와 공유해야 하는 모듈은 `packages/` 폴더에 위치시키세요. 