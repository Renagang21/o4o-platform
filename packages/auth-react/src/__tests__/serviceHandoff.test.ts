import { describe, expect, it, vi } from 'vitest';
import { requestServiceHandoff } from '../serviceHandoff.js';
describe('service handoff account continuity and destination boundary', () => {
  it('moves a business space using its own service without assigning membership', async () => {
    const href = 'https://pharmacy.neture.co.kr/handoff?token=one-use';
    const api = { post: vi.fn().mockResolvedValue({ data: { data: { targetUrl: href } } }) };
    expect(await requestServiceHandoff(api, { serviceKey: 'kpa-society', origin: 'https://pharmacy.neture.co.kr', returnPath: '/businesses/pharmacy/forum' })).toBe(href);
    expect(api.post).toHaveBeenCalledWith('/auth/handoff', { targetServiceKey: 'kpa-society', returnPath: '/businesses/pharmacy/forum' });
  });
  it.each(['https://attacker.example/handoff', 'http://pharmacy.neture.co.kr/handoff', 'https://pharmacy.neture.co.kr/login', undefined])('rejects unintended destination %s', async href => {
    const api = { post: vi.fn().mockResolvedValue({ data: { data: { targetUrl: href } } }) };
    await expect(requestServiceHandoff(api, { serviceKey: 'kpa-society', origin: 'https://pharmacy.neture.co.kr', returnPath: '/businesses/pharmacy/forum' })).rejects.toThrow();
  });
  it('uses the canonical store workspace transport', async () => {
    const api = { post: vi.fn().mockResolvedValue({ data: { data: { targetUrl: 'https://store.neture.co.kr/handoff' } } }) };
    await requestServiceHandoff(api, { workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: '/store' });
    expect(api.post).toHaveBeenCalledWith('/auth/handoff', { targetWorkspace: 'store', returnPath: '/store' });
  });
});
