import { expect, it, vi } from 'vitest';
import type { PopV2Api, PopV2DocumentInput } from '@o4o/store-ui-core';
import { createStorePopSession } from '../storePopSession';
const input = {} as PopV2DocumentInput;
it('a failed update cannot export the previous document; successful retry restores output', async () => {
  const base = { update: vi.fn().mockRejectedValueOnce(Error('synthetic')).mockResolvedValue({ id: 'one' }), render: vi.fn().mockResolvedValue({ fileUrl: 'fixture' }) };
  const api = createStorePopSession(base as unknown as PopV2Api, () => true);
  await expect(api.update('one', input)).rejects.toThrow();
  await expect(api.render('one', 'pdf')).rejects.toThrow('저장하지 못해 출력하지 않았습니다'); expect(base.render).not.toHaveBeenCalled();
  await api.update('one', input); await api.render('one', 'pdf'); expect(base.render).toHaveBeenCalledOnce();
});
it('serializes duplicate creates and blocks output during a save', async () => {
  let resolve!: (value: unknown) => void;
  const base = { create: vi.fn().mockReturnValue(new Promise(done => { resolve = done; })), render: vi.fn() };
  const api = createStorePopSession(base as unknown as PopV2Api, () => true);
  const first = api.create(input);
  await expect(api.create(input)).rejects.toThrow('진행'); await expect(api.render('one', 'pdf')).rejects.toThrow();
  resolve({ id: 'one' }); await first; expect(base.create).toHaveBeenCalledOnce(); expect(base.render).not.toHaveBeenCalled();
});
it('a delayed output cannot open in another store and no later request uses that store', async () => {
  let current = true, resolve!: (value: unknown) => void;
  const base = { render: vi.fn().mockReturnValue(new Promise(done => { resolve = done; })), create: vi.fn() };
  const api = createStorePopSession(base as unknown as PopV2Api, () => current);
  const result = expect(api.render('one', 'png')).rejects.toThrow('매장이 변경'); current = false;
  resolve({ fileUrl: 'old-output' }); await result;
  await expect(api.create(input)).rejects.toThrow('매장이 변경'); expect(base.create).not.toHaveBeenCalled();
});

it('a failed document does not prevent output of another saved document', async () => {
  const base = { update: vi.fn().mockRejectedValue(Error('synthetic')), render: vi.fn().mockResolvedValue({ fileUrl: 'other' }) };
  const api = createStorePopSession(base as unknown as PopV2Api, () => true);
  await expect(api.update('failed', input)).rejects.toThrow();
  await api.render('other', 'pdf'); expect(base.render).toHaveBeenCalledWith('other', 'pdf');
});
