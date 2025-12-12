@echo off
echo [Git] Committing changes...

git add .

git commit -m "refactor(cms-core): CMS Core 리팩토링 및 멀티 에이전트 초기 구현" -m "- CmsEntities 배열에 16개 Entity 추가 (TypeORM 자동 등록)" -m "- ViewContextMatcher 분리로 View Registry 복잡도 감소" -m "- ReportingYaksaController 구현 (Yaksa Annual Report API)" -m "- CosmeticsProductService 추천 로직 구현"

echo [Git] Getting current branch...
git branch --show-current

echo [Git] Switching to develop...
git checkout develop

echo [Git] Merging changes from previous branch...
git merge --no-ff -

echo [Git] Done!
git log --oneline -3
