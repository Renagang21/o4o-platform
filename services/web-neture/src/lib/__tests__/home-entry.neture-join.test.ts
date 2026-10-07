/**
 * WO-O4O-NETURE-REGISTER-AUTHENTICATED-LOOP-FIX-V1
 *
 * 로그인 사용자에게 「가입 가능한 서비스 → Neture」 를 보이지 않는다.
 *   `/register` 는 비로그인 전용(= Google 로그인 모달)이라 로그인 사용자가 누르면 모달이 다시 열렸다.
 *   `service_memberships('neture')` 는 자가 가입 화면이 없고(운영자 지정 · 공급자 승인),
 *   카탈로그 `joinEnabled` 는 그대로 true 다 — 홈이 "실제 가입 화면이 있는 서비스만" 보인다.
 * 회귀: 약국 · 리테일 가입 · 공급자 신청 · 내 서비스 · Neture 신청 상태 안내 유지.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { buildHomeEntryModel, type HomeEntryData } from '../home-entry';
import type { User } from '../../contexts/AuthContext';

type Svc = HomeEntryData['services'][number];

const svc = (key: string, domain: string, joinEnabled: boolean, status?: string): Svc =>
  ({ key, name: key, nameKo: key, domain, basePath: '', description: '', joinEnabled, membership: status ? { status } : null }) as Svc;

const user: User = { id: 'u1', email: 'u1@example.test', name: '회원', roles: ['user'] };

const data = (services: Svc[]): HomeEntryData => ({
  services,
  stores: [],
  branches: [],
  serviceStates: { supplier: { status: 'none', source: 'none' } },
});

describe('가입 가능한 서비스 — Neture 비노출', () => {
  it('Neture membership 이 없고 joinEnabled=true 여도 Neture 가입 항목이 없다 (/register 로 보내지 않는다)', () => {
    const m = buildHomeEntryModel(
      user,
      data([
        svc('neture', 'neture.co.kr', true),
        svc('kpa-society', 'pharmacy.neture.co.kr', true),
        svc('k-cosmetics', 'retail.neture.co.kr', false),
      ]),
    );
    const ids = m.joinable.map((j) => j.id);
    expect(ids).not.toContain('join:neture');
    expect(JSON.stringify(m.joinable)).not.toContain('"to":"/register"');
  });

  it('회귀 — 약국 가입 · 공급자 신청은 그대로다 (리테일은 운영 종료로 가입 안내 없음)', () => {
    const m = buildHomeEntryModel(
      user,
      data([
        svc('neture', 'neture.co.kr', true),
        svc('kpa-society', 'pharmacy.neture.co.kr', true),
        svc('k-cosmetics', 'retail.neture.co.kr', false),
      ]),
    );
    const byId = Object.fromEntries(m.joinable.map((j) => [j.id, j.action]));
    expect(byId['join:kpa-society']).toEqual({ kind: 'public', href: 'https://pharmacy.neture.co.kr/register' });
    expect(byId['join:k-cosmetics']).toBeUndefined();
    expect(byId['join:neture-supplier']).toEqual({ kind: 'internal', to: '/supplier' });
  });

  it('회귀 — 내 서비스(active) 는 그대로 handoff / Neture 는 현재 화면', () => {
    const m = buildHomeEntryModel(
      user,
      data([svc('neture', 'neture.co.kr', true, 'active'), svc('kpa-society', 'pharmacy.neture.co.kr', true, 'active')]),
    );
    const byId = Object.fromEntries(m.myServices.map((s) => [s.id, s.action]));
    expect(byId['svc:kpa-society']).toEqual({ kind: 'handoff', serviceKey: 'kpa-society', returnPath: '/' });
    expect(byId['svc:neture']).toEqual({ kind: 'internal', to: '/mypage' });
  });

  it('회귀 — Neture 신청 중 상태 안내는 그대로다 (/register/pending)', () => {
    const m = buildHomeEntryModel(user, data([svc('neture', 'neture.co.kr', true, 'pending')]));
    const s = m.statusItems.find((x) => x.id === 'status:neture');
    expect(s?.guide).toEqual({ label: '신청 상태 보기', href: '/register/pending' });
  });
});
