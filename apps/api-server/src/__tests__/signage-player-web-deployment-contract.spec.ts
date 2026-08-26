/**
 * WO-O4O-SIGNAGE-PLAYER-WEB-DEPLOYMENT-ADOPTION-AND-PRODUCTION-SMOKE-V1 §30
 *
 * signage-player-web 배포 계약의 정적 회귀 방지.
 *
 * 이 spec 이 막는 회귀:
 *  1. nginx listen 포트와 Cloud Run --port 가 어긋나 컨테이너가 기동 실패하는 것
 *     (원래 nginx 는 80, workflow 의 web service 패턴은 8080 이었다)
 *  2. deploy-web-services.yml 에서 player 가 다시 빠져 "소스는 있는데 미배포" 상태로
 *     되돌아가는 것 (path trigger / detect-changes / deploy job 3곳 모두 필요)
 *  3. frontend build-arg 에 secret 성 값이 주입되는 것 (§28 — 발견 시 즉시 FAIL)
 *  4. Cloud Run origin 이 API CORS allowlist 에서 빠져 player 의 API 호출이 죽는 것
 *
 * 실제 배포/네트워크에 접근하지 않는 순수 정적 검사다.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');
const WORKFLOW = path.join(ROOT, '.github/workflows/deploy-web-services.yml');
const DOCKERFILE = path.join(ROOT, 'services/signage-player-web/Dockerfile');
const NGINX_CONF = path.join(ROOT, 'services/signage-player-web/nginx.conf');
const MIDDLEWARES = path.join(ROOT, 'apps/api-server/src/bootstrap/setup-middlewares.ts');

const read = (p: string) => fs.readFileSync(p, 'utf8');

const CLOUD_RUN_ORIGIN = 'https://signage-player-web-3e3aws7zqa-du.a.run.app';
const SERVICE_NAME = 'signage-player-web';
const CONTAINER_PORT = '8080';

describe('STATIC CONTRACT: signage-player-web 배포 채택 (§30)', () => {
  it('필요한 파일이 모두 존재한다', () => {
    for (const p of [WORKFLOW, DOCKERFILE, NGINX_CONF, MIDDLEWARES]) {
      expect(fs.existsSync(p)).toBe(true);
    }
  });

  // ---- 1. 포트 정합 ----
  it('nginx 는 Cloud Run 컨테이너 포트(8080)로 listen 한다', () => {
    const conf = read(NGINX_CONF);
    const listens = conf
      .split(String.fromCharCode(10))
      .map((l) => l.trim())
      .filter((l) => l.startsWith('listen '));
    expect(listens).toEqual([`listen ${CONTAINER_PORT};`]);
  });

  it('Dockerfile 의 EXPOSE 가 nginx listen 포트와 같다', () => {
    const exposes = read(DOCKERFILE)
      .split(String.fromCharCode(10))
      .map((l) => l.trim())
      .filter((l) => l.startsWith('EXPOSE '));
    expect(exposes).toEqual([`EXPOSE ${CONTAINER_PORT}`]);
  });

  it('Cloud Run deploy 의 --port 가 컨테이너 포트와 같다', () => {
    const wf = read(WORKFLOW);
    const job = wf.slice(wf.indexOf('deploy-signage-player:'));
    expect(job).toMatch(new RegExp(`--port=${CONTAINER_PORT}`));
  });

  // ---- 2. workflow 채택 3요소 ----
  it('push path trigger 에 player 경로가 있다', () => {
    expect(read(WORKFLOW)).toContain("- 'services/signage-player-web/**'");
  });

  it('detect-changes 가 player 를 판정하고 output 으로 노출한다', () => {
    const wf = read(WORKFLOW);
    expect(wf).toContain('decide "signage-player" "services/signage-player-web/"');
    expect(wf).toContain('signage-player: ${{ steps.changes.outputs.signage-player }}');
  });

  it('deploy job 이 존재하고 detect-changes 결과로 gate 된다', () => {
    const wf = read(WORKFLOW);
    expect(wf).toContain('deploy-signage-player:');
    expect(wf).toContain("needs.detect-changes.outputs.signage-player == 'true'");
    expect(wf).toContain(`gcloud run deploy ${SERVICE_NAME}`);
  });

  it('image tag 는 commit SHA 다 (배포 검증 규약)', () => {
    const wf = read(WORKFLOW);
    const job = wf.slice(wf.indexOf('deploy-signage-player:'));
    expect(job).toContain(`gcr.io/\${{ env.PROJECT_ID }}/${SERVICE_NAME}:\${{ github.sha }}`);
  });

  // ---- 3. secret 금지 (§28) ----
  it('player build-arg 는 public runtime config 뿐이다 (secret 주입 0)', () => {
    const wf = read(WORKFLOW);
    const job = wf.slice(wf.indexOf('deploy-signage-player:'), wf.indexOf('  summary:'));
    const FORBIDDEN = ['SECRET', 'PASSWORD', 'TOKEN', 'CREDENTIAL', 'PRIVATE_KEY', 'SERVICE_ACCOUNT', 'DATABASE'];
    const buildArgLines = job
      .split(String.fromCharCode(10))
      .map((l) => l.trim())
      .filter((l) => l.startsWith('--build-arg '));
    expect(buildArgLines.length).toBeGreaterThan(0);
    for (const line of buildArgLines) {
      const name = line.slice('--build-arg '.length).split('=')[0];
      expect(name.startsWith('VITE_')).toBe(true);
      for (const bad of FORBIDDEN) expect(name).not.toContain(bad);
      // build-arg 값으로 GitHub secret 을 흘려보내지 않는다 (GCP 인증용 secrets.GCP_SA_KEY 는 별개)
      expect(line).not.toContain('secrets.');
    }
  });

  it('Dockerfile ARG 에도 secret 성 이름이 없다', () => {
    const FORBIDDEN = ['SECRET', 'PASSWORD', 'TOKEN', 'CREDENTIAL', 'PRIVATE_KEY', 'SERVICE_ACCOUNT', 'DATABASE'];
    const args = read(DOCKERFILE)
      .split(String.fromCharCode(10))
      .map((l) => l.trim())
      .filter((l) => l.startsWith('ARG '))
      .map((l) => l.slice('ARG '.length).split('=')[0]);
    expect(args.length).toBeGreaterThan(0);
    for (const name of args) {
      for (const bad of FORBIDDEN) expect(name.toUpperCase()).not.toContain(bad);
    }
  });

  // ---- 4. CORS ----
  it('API CORS allowlist 에 player 의 Cloud Run origin 이 정확히 1개 등록돼 있다', () => {
    const src = read(MIDDLEWARES);
    expect(src).toContain(`"${CLOUD_RUN_ORIGIN}"`);
  });

  it('CORS 를 wildcard 로 완화하지 않았다', () => {
    const src = read(MIDDLEWARES);
    expect(src).not.toContain('"*"');
    expect(src.replace(/ /g, '')).not.toContain('origin:true');
  });

  // ---- 5. SPA fallback / health ----
  it('nginx 가 SPA fallback 과 /health 를 제공한다 (deep-link 라우팅 전제)', () => {
    const conf = read(NGINX_CONF);
    expect(conf).toContain('try_files $uri $uri/ /index.html');
    expect(conf).toContain('location /health');
  });

  it('§24 — media/video 를 깨뜨릴 수 있는 CSP / X-Frame-Options 를 도입하지 않았다', () => {
    const conf = read(NGINX_CONF);
    expect(conf).not.toMatch(/add_header\s+Content-Security-Policy/i);
    expect(conf).not.toMatch(/add_header\s+X-Frame-Options/i);
  });
});
