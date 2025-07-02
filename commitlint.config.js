module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // 새로운 기능
      'fix',      // 버그 수정
      'docs',     // 문서 변경
      'style',    // 코드 포맷팅, 세미콜론 누락, 코드 변경이 없는 경우
      'refactor', // 코드 리팩토링
      'test',     // 테스트 추가, 테스트 리팩토링
      'chore',    // 빌드 작업 업데이트, 패키지 매니저 설정
      'perf',     // 성능 개선
      'ci',       // CI 관련 설정
      'build',    // 빌드 시스템 또는 외부 의존성에 영향을 주는 변경사항
      'revert'    // 이전 커밋을 되돌리는 경우
    ]],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100]
  }
};