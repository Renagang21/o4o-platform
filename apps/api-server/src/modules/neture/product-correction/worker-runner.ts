export interface WorkerTick {
  status: 'busy' | 'completed';
  pagesProcessed: number;
  schedulesStarted: number;
}
export function parseCorrectionWorkerArgs(args: string[]) {
  if (args.length === 1 && args[0] === '--help') return null;
  let run = false, maxTicks = 100, maxSeconds = 240;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run' && !run) { run = true; continue; }
    if (args[i] !== '--max-ticks' && args[i] !== '--max-seconds') throw new Error('INVALID_WORKER_ARGUMENTS');
    const key = args[i], raw = args[++i];
    if (!raw || !/^\d+$/.test(raw)) throw new Error('INVALID_WORKER_BUDGET');
    const value = Number(raw), limit = key === '--max-ticks' ? 1000 : 600;
    if (value < 1 || value > limit) throw new Error('INVALID_WORKER_BUDGET');
    if (key === '--max-ticks') maxTicks = value; else maxSeconds = value;
  }
  if (!run) throw new Error('WORKER_RUN_REQUIRED');
  return { maxTicks, maxSeconds };
}

/** Budgets are checked between atomic ticks; an in-flight page is allowed to commit or roll back. */
export async function runCorrectionWorker(
  service: { tick: (now: Date, source: 'job') => Promise<WorkerTick> },
  budget: { maxTicks: number; maxSeconds: number },
  runtime = { now: () => Date.now(), stopped: () => false },
) {
  const started = runtime.now();
  let ticks = 0, pagesProcessed = 0, schedulesStarted = 0;
  let reason: 'budget' | 'idle' | 'busy' | 'stopped' = 'budget';
  while (ticks < budget.maxTicks && runtime.now() - started < budget.maxSeconds * 1000) {
    if (runtime.stopped()) { reason = 'stopped'; break; }
    const result = await service.tick(new Date(runtime.now()), 'job');
    if (result.status === 'busy') { reason = 'busy'; break; }
    ticks++;
    pagesProcessed += result.pagesProcessed;
    schedulesStarted += result.schedulesStarted;
    if (!result.pagesProcessed && !result.schedulesStarted) { reason = 'idle'; break; }
  }
  return { reason, ticks, pagesProcessed, schedulesStarted };
}
