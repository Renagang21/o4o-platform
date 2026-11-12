import { createHash } from 'node:crypto';
import { z } from 'zod';
import { NeturePharmacyError } from '../constants.js';
export const consultationReuseDigest = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex');

export function consultationReuseKey(input: Record<string, unknown>, actor: string, org: string, data: unknown) {
  if (input.reuseSession === undefined) return undefined;
  const session = z.string().uuid().safeParse(input.reuseSession);
  if (!session.success) throw new NeturePharmacyError(400, 'INVALID_CONSULTATION_SESSION', '상담 화면을 다시 열어 주세요.');
  return consultationReuseDigest({ actor, org, session: session.data,
    mode: input.mode, station: input.stationId, epoch: input.epoch, data });
}

/** Private process-local results only. No questions/reference text in keys, no DB,
 * logs or cross-actor reuse. TTL starts at completion. Failures are never retained.
 * Cache only after source/permission and output validation in the caller.
 */
export class ConsultationReuse<T> {
  private readonly entries = new Map<string, { expires: number; value: T; bytes: number; timer: ReturnType<typeof setTimeout> }>();
  private readonly pending = new Map<string, Promise<T>>();
  constructor(private readonly now = Date.now, private readonly ttl = 60_000,
    private readonly capacity = 64, private readonly byteLimit = 1_000_000) {}
  async execute(key: string | undefined, produce: () => Promise<T>, authorize: () => Promise<boolean>) {
    const check = async () => { if (!await authorize()) throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', '현재 상담 권한을 다시 확인해 주세요.'); };
    if (!key) return produce();
    await check();
    for (const [id, entry] of this.entries) if (entry.expires <= this.now()) { clearTimeout(entry.timer); this.entries.delete(id); }
    const existing = this.entries.get(key);
    if (existing) { await check(); return structuredClone(existing.value); }
    let promise = this.pending.get(key);
    if (!promise) {
      // If pending capacity is exhausted, still execute without retaining/coalescing.
      if (this.pending.size >= this.capacity) return produce();
      promise = (async () => {
        const value = await produce(); await check();
        const copy = structuredClone(value), bytes = Buffer.byteLength(JSON.stringify(copy));
        if (bytes <= this.byteLimit) {
          let used = [...this.entries.values()].reduce((n,e) => n + e.bytes, 0);
          while (this.entries.size && (this.entries.size >= this.capacity || used + bytes > this.byteLimit)) {
            const first = this.entries.keys().next().value!; used -= this.entries.get(first)!.bytes; clearTimeout(this.entries.get(first)!.timer); this.entries.delete(first);
          }
          const timer = setTimeout(() => { if (this.entries.get(key)?.timer === timer) this.entries.delete(key); }, this.ttl); timer.unref?.();
          this.entries.set(key, { value: copy, bytes, expires: this.now() + this.ttl, timer });
        }
        return copy;
      })();
      this.pending.set(key, promise);
      void promise.finally(() => { if (this.pending.get(key) === promise) this.pending.delete(key); }).catch(() => undefined);
    }
    const result = await promise; await check(); return structuredClone(result);
  }
}
