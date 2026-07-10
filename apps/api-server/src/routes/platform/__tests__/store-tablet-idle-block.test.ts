/**
 * WO-O4O-KPA-TABLET-IDLE-BLOCK-INTEGRATION-V1
 * idle_media block config 검증 + dual-read resolver 단위 테스트.
 */
import {
  parseIdleMediaConfig,
  resolveIdleMediaItems,
  IDLE_MEDIA_SOURCES,
  type NormalizedIdleMedia,
} from '../store-tablet-idle-block.js';

describe('parseIdleMediaConfig', () => {
  it('accepts legacy_idle_playlist with optional durationMs', () => {
    const r = parseIdleMediaConfig({ source: 'legacy_idle_playlist', durationMs: 30000 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ source: 'legacy_idle_playlist', durationMs: 30000 });
  });

  it('accepts operator_common without items', () => {
    const r = parseIdleMediaConfig({ source: 'operator_common' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.source).toBe('operator_common');
  });

  it('accepts custom_media with valid items', () => {
    const r = parseIdleMediaConfig({
      source: 'custom_media',
      items: [{ mediaType: 'youtube', url: 'https://y/1', durationMs: 5000 }, { mediaType: 'image', url: ' https://img ' }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.items).toHaveLength(2);
      expect(r.value.items![1].url).toBe('https://img'); // trimmed
    }
  });

  it('rejects missing/invalid source', () => {
    expect(parseIdleMediaConfig({}).ok).toBe(false);
    expect(parseIdleMediaConfig({ source: 'nope' }).ok).toBe(false);
    expect(parseIdleMediaConfig(null).ok).toBe(false);
    expect(parseIdleMediaConfig([]).ok).toBe(false);
  });

  it('rejects out-of-range durationMs', () => {
    expect(parseIdleMediaConfig({ source: 'legacy_idle_playlist', durationMs: 1 }).ok).toBe(false);
    expect(parseIdleMediaConfig({ source: 'legacy_idle_playlist', durationMs: 99_999_999 }).ok).toBe(false);
    expect(parseIdleMediaConfig({ source: 'legacy_idle_playlist', durationMs: 'x' }).ok).toBe(false);
  });

  it('rejects custom_media missing items / bad item', () => {
    expect(parseIdleMediaConfig({ source: 'custom_media' }).ok).toBe(false);
    expect(parseIdleMediaConfig({ source: 'custom_media', items: [] }).ok).toBe(false);
    expect(parseIdleMediaConfig({ source: 'custom_media', items: [{ mediaType: 'gif', url: 'x' }] }).ok).toBe(false);
    expect(parseIdleMediaConfig({ source: 'custom_media', items: [{ mediaType: 'image', url: '' }] }).ok).toBe(false);
  });

  it('exposes exactly 3 sources', () => {
    expect([...IDLE_MEDIA_SOURCES]).toEqual(['legacy_idle_playlist', 'operator_common', 'custom_media']);
  });
});

describe('resolveIdleMediaItems (pure dual-read)', () => {
  const legacy = [{ mediaType: 'image' as const, url: 'l1' }];
  const operator = [{ mediaType: 'youtube' as const, url: 'op1', durationMs: 20000 }];

  it('legacy_idle_playlist reads injected legacy items', () => {
    const n: NormalizedIdleMedia = { source: 'legacy_idle_playlist' };
    expect(resolveIdleMediaItems(n, { legacyIdlePlaylist: legacy })).toEqual(legacy);
  });

  it('operator_common reads injected operator items', () => {
    const n: NormalizedIdleMedia = { source: 'operator_common' };
    expect(resolveIdleMediaItems(n, { operatorCommon: operator })).toEqual(operator);
  });

  it('custom_media uses normalized items', () => {
    const items = [{ mediaType: 'video' as const, url: 'c1' }];
    const n: NormalizedIdleMedia = { source: 'custom_media', items };
    expect(resolveIdleMediaItems(n, {})).toEqual(items);
  });

  it('block-level durationMs fills only items without their own duration', () => {
    const n: NormalizedIdleMedia = { source: 'operator_common', durationMs: 9000 };
    const out = resolveIdleMediaItems(n, { operatorCommon: [{ mediaType: 'image', url: 'a' }, { mediaType: 'image', url: 'b', durationMs: 3000 }] });
    expect(out[0].durationMs).toBe(9000);
    expect(out[1].durationMs).toBe(3000);
  });

  it('missing source data returns empty array (fallback safe)', () => {
    expect(resolveIdleMediaItems({ source: 'legacy_idle_playlist' }, {})).toEqual([]);
  });
});
