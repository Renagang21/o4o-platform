import { describe, expect, it } from 'vitest';
import { PHARMACY_COLLABORATORS } from '@o4o/types';
import { createCooperationRegistry, findCooperationExtension, type CooperationExtension } from './core';
import { COOPERATION_EXTENSIONS } from './extensions';
import { cooperationDestination } from './models';

describe('cooperation core and business extensions', () => {
  it('keeps all four public identities aligned with operator assignment without granting roles', () => {
    expect(Object.keys(COOPERATION_EXTENSIONS).sort()).toEqual(Object.keys(PHARMACY_COLLABORATORS).sort());
    for (const [key, extension] of Object.entries(COOPERATION_EXTENSIONS)) {
      expect(new URL(extension.model.origin).hostname).toBe(PHARMACY_COLLABORATORS[key as keyof typeof PHARMACY_COLLABORATORS].domain);
      expect(extension.model.sessionServiceKey).toBe('neture');
      expect(extension).not.toHaveProperty('roles');
    }
    expect(COOPERATION_EXTENSIONS.pharmcoop.membershipSubject).toBe('cooperative-person');
    expect(COOPERATION_EXTENSIONS.pharmacy.membershipSubject).toBe('pharmacy-organization');
  });

  it('does not resolve prototype properties or accept duplicate business registrations', () => {
    expect(findCooperationExtension(COOPERATION_EXTENSIONS, 'constructor')).toBeUndefined();
    expect(findCooperationExtension(COOPERATION_EXTENSIONS, '__proto__')).toBeUndefined();
    expect(() => createCooperationRegistry([COOPERATION_EXTENSIONS.pharmacy, COOPERATION_EXTENSIONS.pharmacy])).toThrow('duplicate');
  });

  it.each(['http://example.org', 'https://example.org/path', 'https://user:pass@example.org'])(
    'rejects a noncanonical origin %s', origin => {
      const extension = COOPERATION_EXTENSIONS.pharmacy;
      expect(() => createCooperationRegistry([{ ...extension, model: { ...extension.model, origin } }])).toThrow('HTTPS origin');
    },
  );

  it.each(['//other.example/path', 'https://other.example/path', '/\\other.example/path'])(
    'rejects an external navigation path %s', communityPath => {
      const extension = COOPERATION_EXTENSIONS.pharmacy;
      expect(() => createCooperationRegistry([{ ...extension, model: { ...extension.model, communityPath } }])).toThrow('within their origin');
    },
  );

  it('isolates registered editorial data from later mutation of an extension input', () => {
    const source: CooperationExtension = {
      ...COOPERATION_EXTENSIONS.carepharm,
      model: { ...COOPERATION_EXTENSIONS.carepharm.model },
      materials: { ...COOPERATION_EXTENSIONS.carepharm.materials!, tags: ['original'] },
    };
    const registry = createCooperationRegistry([source]);
    (source.materials!.tags as string[]).push('changed');
    source.model = { ...source.model, origin: 'https://other.example' };
    expect(registry.carepharm.materials!.tags).toEqual(['original']);
    expect(registry.carepharm.model.origin).toBe('https://carepharm.neture.co.kr');
    expect(COOPERATION_EXTENSIONS.megapharm.materials).toBeUndefined();
  });

  it('uses the actual MegaPharm host rather than the Pharmacy fallback or an unsupported handoff', () => {
    expect(cooperationDestination('megapharm', 'community')).toEqual({
      serviceKey: 'neture', origin: 'https://megapharm.neture.co.kr', returnPath: '/community', navigation: 'public',
    });
  });

  it('requires choosing a cooperative rather than treating a personal membership as a pharmacy organization', () => {
    expect(cooperationDestination('pharmcoop', 'community')).toMatchObject({
      origin: 'https://pharmcoop.neture.co.kr', returnPath: '/cooperatives', navigation: 'public', preserveForumPath: false,
    });
  });
});
