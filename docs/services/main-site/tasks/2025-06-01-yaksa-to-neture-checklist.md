# 🛠 yaksa.site → neture.co.kr 변경 체크리스트

## 목적
- 코드 내부에 남아있는 `yaksa.site` 문자열을 모두 `neture.co.kr`로 일괄 교체한다.

## 작업 항목
- [ ] src/pages/, src/components/, context/ 폴더 내 코드에서 `yaksa.site` 문자열 검색
- [ ] `AuthContext.tsx` 또는 `useAuth` 훅에서 사이트 정보 사용하는 부분 수정
- [ ] Nginx 리디렉션/프록시 설정 파일에서 yaksa.site → neture.co.kr 변경 여부 확인
- [ ] 로그인 후 이동 URL 등 내부 리디렉션 경로 수정
- [ ] `.env` 또는 환경변수에 yaksa.site 남아있는지 점검

## 참고 명령어 (로컬에서 grep으로 확인)
```bash
grep -r "yaksa.site" ./src
```
