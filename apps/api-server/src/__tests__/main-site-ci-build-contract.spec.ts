/**
 * WO-O4O-MAIN-SITE-CI-BUILD-CONTRACT-CENSUS-AND-DISPOSITION-V1
 *   — main-site CI build 계약 테스트
 *
 * 판정: REDUCE_TO_LIGHTWEIGHT_CHECK
 * ---------------------------------------------------
 * `apps/main-site` 는 RETIRED_RUNTIME 이다(Cloud Run service 0 / deploy workflow 0).
 * 그럼에도 `ci-pipeline.yml` 의 `build` matrix 에 남아 push/PR 마다 full Vite build 를
 * 수행하고 있었다. 전수조사 결과:
 *
 *   - artifact 소비자 0   — 저장소 어떤 workflow 도 `download-artifact` 를 쓰지 않는다.
 *                          업로드는 `continue-on-error: true` · 보존 7일.
 *   - downstream job 0    — `build` 를 `needs:` 로 받는 job 이 없다(terminal job).
 *   - required check 0    — `main` 브랜치에 branch protection 도 ruleset 도 없다.
 *   - 회귀 검출 0         — 최근 CI run 60회에서 `Build Applications` 실패 0회.
 *                          실패 9회는 전부 `Code Quality Check`.
 *   - 검사 범위 역전      — tsconfig `include: ["src"]` 는 src 전체를 검사하지만
 *                          Vite module graph 는 진입점 도달분만 본다.
 *                          고아 소스를 지키는 것은 tsc 이지 build 가 아니다.
 *
 * 따라서 build matrix 에서만 제외하고, 경량 검사(type-check + lint)는 유지한다.
 * 루트 build 스크립트(`build:main-site` 등)는 consumer 가 확인되므로 그대로 둔다.
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SRC, '..', '..', '..');
const WORKFLOWS = path.join(REPO_ROOT, '.github', 'workflows');
const CI_PIPELINE = path.join(WORKFLOWS, 'ci-pipeline.yml');

const readWorkflow = (file: string): string => fs.readFileSync(file, 'utf-8');

const listWorkflows = (): string[] =>
  fs
    .readdirSync(WORKFLOWS)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => path.join(WORKFLOWS, f));

describe('WO-O4O-MAIN-SITE-CI-BUILD-CONTRACT-CENSUS-AND-DISPOSITION-V1', () => {
  describe('main-site 는 CI build matrix 에 다시 들어가지 않는다', () => {
    it('ci-pipeline.yml build matrix 는 admin-dashboard 만 빌드한다', () => {
      const yml = readWorkflow(CI_PIPELINE);
      expect(yml).toContain('app: [admin-dashboard]');
      expect(yml).not.toContain('app: [main-site, admin-dashboard]');
    });

    it('어떤 workflow 도 main-site 를 build 대상으로 지정하지 않는다', () => {
      const hits = listWorkflows().filter((f) =>
        /ci-build-app\.sh\s+main-site|run\s+build:main-site/.test(readWorkflow(f))
      );
      expect(hits.map((f) => path.basename(f))).toEqual([]);
    });

    it('retire 근거가 주석으로 남아 있다 (재등록 시 근거 확인용)', () => {
      expect(readWorkflow(CI_PIPELINE)).toContain(
        'WO-O4O-MAIN-SITE-CI-BUILD-CONTRACT-CENSUS-AND-DISPOSITION-V1'
      );
    });
  });

  describe('build artifact 는 여전히 아무도 소비하지 않는다 (제거 전제 유지)', () => {
    it('저장소 어떤 workflow 도 download-artifact action 을 쓰지 않는다', () => {
      // 주석에 등장하는 단어가 아니라 실제 step `uses:` 만 센다.
      const hits = listWorkflows().filter((f) =>
        /^\s*(-\s*)?uses:\s*actions\/download-artifact/m.test(readWorkflow(f))
      );
      expect(hits.map((f) => path.basename(f))).toEqual([]);
    });
  });

  describe('경량 검사(type-check + lint)는 유지된다', () => {
    it('quality-check 가 frontend type-check 를 blocking 으로 실행한다', () => {
      expect(readWorkflow(CI_PIPELINE)).toContain('run: pnpm run type-check:frontend');
    });

    it('quality-check 가 lint ratchet 을 실행한다', () => {
      expect(readWorkflow(CI_PIPELINE)).toContain('run: node scripts/lint-ratchet.mjs');
    });

    it('type-check:frontend 가 apps 를 자동 탐색하므로 main-site 가 포함된다', () => {
      const devMjs = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'dev.mjs'), 'utf-8');
      expect(devMjs).toContain("discoverWorkspaces('apps')");
    });

    it('main-site 에 typecheck 스크립트가 남아 있다', () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, 'apps', 'main-site', 'package.json'), 'utf-8')
      );
      expect(pkg.scripts.typecheck).toBe('tsc --noEmit');
    });
  });

  describe('루트 aggregate build 계약은 변경하지 않는다', () => {
    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8')
    );

    it.each([
      ['build:main-site', 'cd apps/main-site && pnpm run build'],
      ['build:apps', 'pnpm run build:main-site && pnpm run build:admin'],
      ['build:apps:all', 'pnpm run build:main-site && pnpm run build:api'],
    ])('%s 스크립트가 유지된다', (name, value) => {
      expect(rootPkg.scripts[name]).toBe(value);
    });
  });

  describe('main-site 는 여전히 배포 대상이 아니다', () => {
    it('main-site 를 배포하는 workflow 가 없다', () => {
      const hits = listWorkflows().filter((f) => {
        const yml = readWorkflow(f);
        return /main-site/.test(yml) && /gcloud run deploy|cloud-run/.test(yml);
      });
      expect(hits.map((f) => path.basename(f))).toEqual([]);
    });

    it('deploy-main-site 워크플로가 존재하지 않는다', () => {
      expect(fs.existsSync(path.join(WORKFLOWS, 'deploy-main-site.yml'))).toBe(false);
    });
  });
});
