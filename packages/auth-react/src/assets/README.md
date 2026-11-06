# 인증 화면 SVG 로고

- `neture-logo.svg`: 기존 `services/web-neture/public/favicon.png`의 초록 원과 검은 serif N 표식을 도형·문자 윤곽 경로로 재구성했다. Neture favicon도 같은 SVG를 사용한다.
- `o4o-logo.svg`: 기존 Store/Branch 등의 `favicon.svg`에 있는 파란 둥근 사각형·흰 O4O 표식을 유지하고 글자를 경로로 변환했다.
- 기존 서체와 호환되는 Liberation Sans Bold / Liberation Serif Bold의 윤곽을 사용했다. 실행 시 font 파일이 필요하지 않으며 SVG에는 `<image>`, base64 raster, 외부 font, script를 넣지 않았다.
- 기존 PNG/PWA 이미지 파일은 호환 소비처용으로 유지한다. 인증 화면은 이 SVG를 기본값으로 사용한다.
- 협업체 독자 SVG가 제공되면 `LoginCard`/`LoginLayout`의 `logoSrc`를 지정한다. 제공 전에는 O4O 공통 로고를 사용한다.
