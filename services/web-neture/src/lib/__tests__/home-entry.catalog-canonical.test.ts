/**
 * WO-O4O-SERVICE-CATALOG-CANONICAL-DOMAIN-AND-PH-JOIN-CLEANUP-V1
 *
 * 대표 홈 「가입 가능한 서비스」 는 서버 카탈로그(`GET /auth/services`)의 domain · joinEnabled 를 그대로 쓴다.
 * 카탈로그를 canonical 로 정렬한 뒤의 응답 모양으로:
 *   - 약국 · 리테일 가입 안내가 로그인 전 진입과 같은 호스트(pharmacy / retail.neture.co.kr)를 가리키고
 *   - Pharmacy-Hub(joinEnabled=false)는 신규 가입 안내에 나타나지 않으며
 *   - 이미 Pharmacy-Hub 회원 row 가 있는 사람의 상태 안내는 그대로임을 고정한다.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { buildHomeEntryModel, type HomeEntryData } from '../home-entry';
import type { User } from '../../contexts/AuthContext';

type Svc = HomeEntryData['services'][number];

const svc = (key: string, domain: string, joinEnabled: boolean, status?: string): Svc =>
  ({
    key,
    name: key,
    nameKo: key,
    domain,
    basePath: '',
    description: '',
    joinEnabled,
    membership: status ? { status } : null,
  }) as Svc;

const user: User = { id: 'u1', email: 'u1@example.test', name: '회원', roles: ['user'] };

const data = (services: Svc[]): HomeEntryData => ({
  services,
  stores: [],
  branches: [],
  serviceStates: { supplier: { status: 'none', source: 'none' } },
});

// 카탈로그 정렬 후 `/auth/services` 가 돌려주는 값과 같은 모양
const CATALOG = (phStatus?: string) => [
  svc('neture', 'neture.co.kr', true, 'active'),
  svc('kpa-society', 'pharmacy.neture.co.kr', true),
  svc('k-cosmetics', 'retail.neture.co.kr', false), // 운영 종료 — WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1
  svc('pharmacy-hub', 'pharmacyhub.co.kr', false, phStatus),
];

describe('가입 가능한 서비스 — canonical 호스트 · Pharmacy-Hub 비노출', () => {
  it('약국 가입 안내는 canonical 호스트를 가리키고, 운영 종료된 리테일(K-Cosmetics)은 가입 안내가 없다', () => {
    const m = buildHomeEntryModel(user, data(CATALOG()));
    const href = (id: string) => {
      const a = m.joinable.find((j) => j.id === id)?.action;
      return a && a.kind === 'public' ? a.href : undefined;
    };
    expect(href('join:kpa-society')).toBe('https://pharmacy.neture.co.kr/register');
    expect(m.joinable.some((j) => j.id === 'join:k-cosmetics')).toBe(false);
  });

  it('Pharmacy-Hub 는 신규 가입 안내에 나타나지 않는다', () => {
    const m = buildHomeEntryModel(user, data(CATALOG()));
    expect(m.joinable.map((j) => j.id)).not.toContain('join:pharmacy-hub');
  });

  it('옛 호스트는 가입 안내 어디에도 없다', () => {
    const m = buildHomeEntryModel(user, data(CATALOG()));
    const text = JSON.stringify(m.joinable);
    for (const legacy of ['kpa-society.co.kr', 'k-cosmetics.site', 'pharmacyhub.co.kr']) {
      expect(text).not.toContain(legacy);
    }
  });

  it('기존 Pharmacy-Hub 신청자의 상태 안내는 그대로 남는다', () => {
    const m = buildHomeEntryModel(user, data(CATALOG('pending')));
    expect(m.statusItems.map((s) => s.id)).toContain('status:pharmacy-hub');
    expect(m.joinable.map((j) => j.id)).not.toContain('join:pharmacy-hub');
  });
});
