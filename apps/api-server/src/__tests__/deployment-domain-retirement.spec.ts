/**
 * WO-O4O-DEPLOYMENT-DOMAIN-CENSUS-AND-RETIREMENT-V1
 *   — application-level Deployment 도메인 retire 계약 테스트
 *
 * 판정: RETIRE_CONFIRMED
 * ---------------------
 * `modules/deployment/*` 는 2025-12-03 Multi-Site Builder(`fe83e3896`)와 함께 들어온
 * "사이트별 서버 인스턴스 provisioning" 도메인이었다.
 *   - `/api/deployment`·`/api/v1/deployment` mount 는 2025-12-11 `6354e8755`
 *     (Phase 8-3)에서 해제됐고, route 파일은 2026-01-06 `8d58243bf`
 *     (`remove 30 unused route files`)에서 삭제됐다.
 *   - controller/module/service 는 2025-12-03 `4e6241224` 에서 이미 제거돼
 *     entity + DTO 만 남은 shell 이었다.
 *   - admin UI(`pages/deployment/*`)는 2026-01-07 `495140e91` 에서 삭제됐다.
 *   - repository consumer 0 · worker/queue/cron 0 · provisioning 참조 0.
 *   - production DB 에 `deployments`·`deployment_instances` 없음(`to_regclass` = null),
 *     실행된 migration 기록 없음.
 *   - 구현 자체가 `setTimeout` + 랜덤 IP mock 이라 실제 배포 기능이 없었다.
 *
 * ⚠ 실제 배포 인프라(.github/workflows/deploy-*.yml · Cloud Run · Dockerfile ·
 *   Artifact Registry)는 **별개 축**이며 이 retire 대상이 아니다.
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB·네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SRC, '..', '..', '..');
const ENTITIES = path.join(SRC, 'database', 'entities.ts');
const REGISTER_ROUTES = path.join(SRC, 'bootstrap', 'register-routes.ts');

const RETIRED_FILES: Array<[string, string]> = [
  ['modules/deployment/deployment.entity.ts', path.join(SRC, 'modules', 'deployment', 'deployment.entity.ts')],
  ['modules/deployment/index.ts', path.join(SRC, 'modules', 'deployment', 'index.ts')],
  ['modules/deployment/dto/index.ts', path.join(SRC, 'modules', 'deployment', 'dto', 'index.ts')],
  ['modules/deployment/dto/create-instance.dto.ts', path.join(SRC, 'modules', 'deployment', 'dto', 'create-instance.dto.ts')],
  ['modules/deployment/dto/install-apps.dto.ts', path.join(SRC, 'modules', 'deployment', 'dto', 'install-apps.dto.ts')],
];

describe('WO-O4O-DEPLOYMENT-DOMAIN-CENSUS-AND-RETIREMENT-V1', () => {
  describe('retire 된 파일이 되살아나지 않는다', () => {
    it.each(RETIRED_FILES)('%s 는 존재하지 않는다', (_label, file) => {
      expect(fs.existsSync(file)).toBe(false);
    });

    it('modules/deployment 디렉터리 자체가 없다', () => {
      expect(fs.existsSync(path.join(SRC, 'modules', 'deployment'))).toBe(false);
    });

    it('routes/deployment.routes.ts 가 없다', () => {
      expect(fs.existsSync(path.join(SRC, 'routes', 'deployment.routes.ts'))).toBe(false);
    });
  });

  describe('entity 등록 계약', () => {
    const source = fs.readFileSync(ENTITIES, 'utf-8');

    it("entities.ts 가 modules/deployment 를 import 하지 않는다", () => {
      expect(source).not.toMatch(/from\s+'\.\.\/modules\/deployment\//);
    });

    it('entities 배열에 DeploymentInstance 등록이 없다', () => {
      const active = source
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
      expect(active.some((line) => line.trim() === 'DeploymentInstance,')).toBe(false);
    });
  });

  describe('mount 계약', () => {
    const source = fs.readFileSync(REGISTER_ROUTES, 'utf-8');

    it("'/api/deployment' · '/api/v1/deployment' 를 app.use 로 등록하지 않는다", () => {
      const mountLines = source
        .split('\n')
        .filter((line) => /app\.use\(/.test(line) && !/^\s*\/\//.test(line));
      expect(mountLines.some((line) => /'\/api(\/v1)?\/deployment'/.test(line))).toBe(false);
    });

    it('retire 사유가 주석으로 남아 있다 (재등록 시 근거 확인용)', () => {
      expect(source).toContain('WO-O4O-DEPLOYMENT-DOMAIN-CENSUS-AND-RETIREMENT-V1');
    });
  });

  describe('실제 배포 인프라는 유지된다 (오삭제 방지)', () => {
    it.each([
      '.github/workflows/deploy-api.yml',
      '.github/workflows/deploy-admin.yml',
      '.github/workflows/deploy-web-services.yml',
    ])('%s 는 그대로 존재한다', (rel) => {
      expect(fs.existsSync(path.join(REPO_ROOT, rel))).toBe(true);
    });
  });
});
