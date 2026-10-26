/** Offline plan only. Never invokes a cloud CLI, network, credentials or database. */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const fail = () => { throw new Error('INVALID_PLAN: 프로젝트·digest·실행 계정·DB secret 참조·예산을 확인하세요.'); };
const matches = (value, pattern) => typeof value === 'string' && pattern.test(value);
export function executionPlan(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) fail();
  const keys = ['project', 'region', 'job', 'image', 'workerAccount', 'invokerAccount', 'cloudSqlInstance', 'database', 'username', 'passwordSecret', 'intervalMinutes', 'maxSeconds', 'maxTicks', 'timeoutSeconds'];
  if (Object.keys(config).some(key => !keys.includes(key)) || keys.some(key => !(key in config))) fail();
  const { project, region, job, image, workerAccount, invokerAccount, cloudSqlInstance, database, username, passwordSecret, intervalMinutes, maxSeconds, maxTicks, timeoutSeconds } = config;
  if (!matches(project, /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/) || !matches(region, /^[a-z]+-[a-z]+[0-9]$/) || !matches(job, /^[a-z][a-z0-9-]{0,61}[a-z0-9]$/)) fail();
  if (!matches(image, new RegExp(`^${region}-docker\\.pkg\\.dev/${project}/[a-z0-9_-]+/[a-z0-9_-]+@sha256:[a-f0-9]{64}$`))) fail();
  const account = new RegExp(`^[a-z][a-z0-9-]{4,28}[a-z0-9]@${project}\\.iam\\.gserviceaccount\\.com$`);
  if (!matches(workerAccount, account) || !matches(invokerAccount, account) || workerAccount === invokerAccount) fail();
  if (!matches(cloudSqlInstance, new RegExp(`^${project}:${region}:[a-z][a-z0-9-]{0,97}$`)) || !matches(database, /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/) || !matches(username, /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/)) fail();
  if (!passwordSecret || Object.keys(passwordSecret).sort().join(',') !== 'name,version' || !matches(passwordSecret.name, /^[a-zA-Z0-9_-]{1,255}$/) || !matches(passwordSecret.version, /^[1-9][0-9]*$/)) fail();
  if (![5, 10, 15, 20, 30, 60].includes(intervalMinutes) || !Number.isInteger(maxSeconds) || maxSeconds < 1 || maxSeconds > 600 || !Number.isInteger(maxTicks) || maxTicks < 1 || maxTicks > 1000 || !Number.isInteger(timeoutSeconds) || timeoutSeconds < maxSeconds + 60 || timeoutSeconds > 3600) fail();
  const name = `projects/${project}/locations/${region}/jobs/${job}`;
  return {
    mode: 'PLAN_ONLY', applied: false,
    job: { name, template: { taskCount: 1, parallelism: 1, template: {
      serviceAccount: workerAccount, maxRetries: 0, timeout: `${timeoutSeconds}s`,
      volumes: [{ name: 'cloudsql', cloudSqlInstance: { instances: [cloudSqlInstance] } }],
      containers: [{ image, command: ['node'], args: ['dist/product-correction-worker.js', '--run', '--max-ticks', String(maxTicks), '--max-seconds', String(maxSeconds)],
        volumeMounts: [{ name: 'cloudsql', mountPath: '/cloudsql' }],
        env: [{ name: 'DB_HOST', value: `/cloudsql/${cloudSqlInstance}` }, { name: 'DB_NAME', value: database }, { name: 'DB_USERNAME', value: username },
          { name: 'DB_PASSWORD', valueSource: { secretKeyRef: { secret: passwordSecret.name, version: passwordSecret.version } } }],
      }],
    } } },
    scheduler: { name: `projects/${project}/locations/${region}/jobs/${job}-schedule`,
      schedule: intervalMinutes === 60 ? '0 * * * *' : `*/${intervalMinutes} * * * *`, timeZone: 'Asia/Seoul',
      httpTarget: { uri: `https://run.googleapis.com/v2/${name}:run`, httpMethod: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: 'e30=',
        oauthToken: { serviceAccountEmail: invokerAccount, scope: 'https://www.googleapis.com/auth/cloud-platform' } },
    },
    requiredAccess: [
      { principal: invokerAccount, role: 'roles/run.invoker', resource: name },
      { principal: workerAccount, role: 'roles/cloudsql.client', resource: `projects/${project}` },
      { principal: workerAccount, role: 'roles/secretmanager.secretAccessor', resource: `projects/${project}/secrets/${passwordSecret.name}` },
    ],
    gates: ['Verify exact main CI and deployed image digest; do not reuse migration job.',
      'Confirm existing DB TLS/socket configuration, resource limits, account permissions and cost.',
      'Review scheduler service agent/token permissions; create paused and explicitly enable after approval.',
      'Job timeout must cover the configured DB page timeout plus shutdown margin; 60 seconds is only a minimum.',
      'Verify idle-server execution, duplicate runs, heartbeat and committed-cursor recovery in an isolated environment first.',
      'No product apply, migration, seed, AI call or production operation is performed by this planner.'],
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length === 3 && process.argv[2] === '--help') {
    process.stdout.write('Usage: node scripts/operations/product-correction-execution-plan.mjs --config <local.json>\nOffline PLAN_ONLY; no cloud or DB operation.\n');
  } else {
    try {
      if (process.argv.length !== 4 || process.argv[2] !== '--config') fail();
      process.stdout.write(JSON.stringify(executionPlan(JSON.parse(readFileSync(process.argv[3], 'utf8'))), null, 2) + '\n');
    } catch { console.error('INVALID_PLAN: 설정 파일과 필수 참조를 확인하세요. 비밀 값은 입력하지 마세요.'); process.exitCode = 1; }
  }
}
