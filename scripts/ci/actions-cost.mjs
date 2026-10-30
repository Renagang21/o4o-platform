#!/usr/bin/env node
/** Read-only Actions cost forecast. No billing/settings changes; no token or raw job logs output. */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// USD per minute, verified 2026-10-30. Public ubuntu-latest maps to standard private Linux.
// https://docs.github.com/en/billing/reference/actions-runner-pricing
export const RATES = { linux: 0.006, windows: 0.010, macos: 0.062 };

export function daysBetween(from, to) {
  for (const value of [from, to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value).toISOString().slice(0, 10) !== value) {
      throw new Error('Dates must be valid YYYY-MM-DD values');
    }
  }
  if (from > to) throw new Error('from must not be after to');
  const days = [];
  for (let t = Date.parse(from); t <= Date.parse(to); t += 86400000) days.push(new Date(t).toISOString().slice(0, 10));
  if (days.length > 31) throw new Error('Limit each audit to 31 days');
  return days;
}

export async function pages(get, endpoint, key) {
  const rows = [];
  for (let page = 1; ; page++) {
    const result = await get(`${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(result[key])) throw new Error(`Missing ${key} in GitHub response`);
    rows.push(...result[key]);
    if (result[key].length < 100) {
      if (Number.isFinite(result.total_count) && rows.length < result.total_count) throw new Error('Incomplete pagination; retry audit');
      return rows;
    }
  }
}

export function priceJob(job) {
  if (job.conclusion === 'skipped') return { minutes: 0, usd: 0 };
  if (job.status !== 'completed' || !job.started_at || !job.completed_at) throw new Error('Incomplete job; audit completed runs only');
  const elapsed = Date.parse(job.completed_at) - Date.parse(job.started_at);
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('Invalid job timestamps');
  const minutes = Math.ceil(elapsed / 60000);
  const labels = job.labels || [];
  if (labels.includes('self-hosted')) throw new Error('Self-hosted cost requires a separate model');
  // Reject custom/larger runner labels instead of silently charging them at a standard rate.
  const label = labels.find(l => /^(ubuntu|windows|macos)-(latest|\d+(\.\d+)?)(-arm64)?$/.test(l));
  if (!label || label.endsWith('-arm64')) throw new Error('Unsupported runner rate; explicit pricing required');
  const os = label.startsWith('ubuntu') ? 'linux' : label.startsWith('windows') ? 'windows' : 'macos';
  return { minutes, usd: minutes * RATES[os] };
}

/** Stratify by workflow, event and conclusion, then spread samples across time. */
export async function audit({ get, repo, from, to, sampleSize = 10 }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('repo must be owner/name');
  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 100) throw new Error('sample must be 1..100');
  const prefix = `repos/${repo}/actions`;
  const runs = new Map();
  for (const day of daysBetween(from, to)) {
    // GitHub caps a filtered runs query at 1000 results. Split dense days into hours.
    const first = await get(`${prefix}/runs?created=${day}&per_page=1`);
    const ranges = first.total_count >= 1000
      ? Array.from({ length: 24 }, (_, h) => `${day}T${String(h).padStart(2, '0')}:00:00Z..${day}T${String(h).padStart(2, '0')}:59:59Z`)
      : [day];
    for (const range of ranges) {
      const endpoint = `${prefix}/runs?created=${encodeURIComponent(range)}`;
      const count = await get(`${endpoint}&per_page=1`);
      if (count.total_count >= 1000) throw new Error('Hourly run limit exceeded; use a narrower audit window');
      for (const r of await pages(get, endpoint, 'workflow_runs')) runs.set(r.id, r);
    }
  }
  const strata = new Map();
  let pending = 0;
  for (const r of runs.values()) {
    if (r.status !== 'completed') { pending++; continue; }
    const key = `${r.path}|${r.event}|${r.conclusion}`;
    if (!strata.has(key)) strata.set(key, []);
    strata.get(key).push(r);
  }
  const rows = [];
  for (const rs of strata.values()) {
    rs.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
    const n = Math.min(sampleSize, rs.length);
    let minutes = 0, usd = 0, jobs = 0;
    for (let i = 0; i < n; i++) {
      const r = rs[Math.floor((i + 0.5) * rs.length / n)];
      // filter=all includes previous attempts; each job ID must be charged only once.
      const all = await pages(get, `${prefix}/runs/${r.id}/jobs?filter=all`, 'jobs');
      for (const j of new Map(all.map(j => [j.id, j])).values()) {
        const cost = priceJob(j); minutes += cost.minutes; usd += cost.usd; jobs++;
      }
    }
    rows.push({ workflow: rs[0].path, event: rs[0].event, conclusion: rs[0].conclusion,
      runs: rs.length, sampledRuns: n, sampledJobs: jobs,
      estimatedMinutes: minutes / n * rs.length, estimatedUsd: usd / n * rs.length });
  }
  return { repo, from, to, totalRuns: runs.size, incompleteRunsExcluded: pending,
    method: 'Stratified sample; standard private runner rates; compute only; no billing account access',
    grossEstimatedUsd: rows.reduce((sum, r) => sum + r.estimatedUsd, 0), rows };
}

export async function githubGet(endpoint) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return JSON.parse(execFileSync('gh', ['api', endpoint], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }));
  }
  const response = await fetch(`https://api.github.com/${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}; audit incomplete`);
  return response.json();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('node scripts/ci/actions-cost.mjs --repo owner/name --from YYYY-MM-DD --to YYYY-MM-DD [--sample 10]');
    console.log('Read-only. Use existing gh authentication or GITHUB_TOKEN. JSON goes to stdout; never runs in CI automatically.');
  } else {
    try {
      const getArg = name => args[args.indexOf(name) + 1];
      for (let i = 0; i < args.length; i += 2) if (!['--repo', '--from', '--to', '--sample'].includes(args[i]) || !args[i + 1]) throw new Error('Invalid arguments; use --help');
      for (const required of ['--repo', '--from', '--to']) if (!args.includes(required)) throw new Error(`Missing ${required}`);
      const result = await audit({ get: githubGet, repo: getArg('--repo'), from: getArg('--from'), to: getArg('--to'), sampleSize: args.includes('--sample') ? Number(getArg('--sample')) : 10 });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      // Avoid printing gh stderr or request objects: either may contain sensitive response data.
      console.error(error instanceof Error && !('stderr' in error) ? error.message : 'GitHub request failed; audit incomplete');
      process.exitCode = 1;
    }
  }
}
