import type { DataSource } from 'typeorm';
import { PHARMACY_COLLABORATORS } from '@o4o/types';
import { getService, getServiceOrigin } from '../config/service-catalog.js';
import { STORE_WORKSPACE_ORIGIN } from '../config/store-workspace.js';

export type DirectoryGroup = 'services' | 'spaces' | 'other';
export type DirectoryState = 'configured' | 'active' | 'closed' | 'missing' | 'unverified' | 'federation' | 'planned';
export interface PlatformDirectoryEntry {
  id: string;
  name: string;
  description: string;
  group: DirectoryGroup;
  kind: string;
  url: string;
  state: DirectoryState;
}

/** Admin display projection only. It never provisions identities, roles or business rows. */
export async function readPlatformServiceDirectory(db: Pick<DataSource, 'query'>): Promise<PlatformDirectoryEntry[]> {
  // Only platform-level businesses. Individual cooperatives, members and operators are out of scope.
  const rows: Array<{ key: string; status: string }> = await db.query(
    'SELECT key, status FROM semi_franchises WHERE key = ANY($1::text[])',
    [['pharmacy', 'carepharm', 'megapharm']],
  );
  const businesses = new Map(rows.map(row => [row.key, row.status]));
  const catalog = (key: string, overrides: Partial<PlatformDirectoryEntry> = {}): PlatformDirectoryEntry => {
    const service = getService(key);
    const url = getServiceOrigin(key);
    if (!service || !url) throw new Error('Directory service configuration missing');
    return {
      id: key, name: service.nameKo ?? service.name, description: service.description,
      group: 'services', kind: '독립 서비스', url, state: 'configured', ...overrides,
    };
  };
  const representative = getServiceOrigin('neture');
  if (!representative) throw new Error('Representative origin missing');
  const entries: PlatformDirectoryEntry[] = [
    catalog('kpa-society', {
      id: 'pharmacy', name: 'O4O 약국 경영지원', kind: '약국 협력사업',
      description: '약국 경영지원 사업과 참여 약국을 위한 서비스',
    }),
    ...(['carepharm', 'megapharm'] as const).map(key => ({
      id: key, name: PHARMACY_COLLABORATORS[key].label,
      description: key === 'carepharm' ? '만성질환관리 협력사업과 참여 약국 지원' : '창고형 약국 협력사업과 참여 약국 지원',
      group: 'services' as const, kind: '약국 협력사업',
      url: `https://${PHARMACY_COLLABORATORS[key].domain}`, state: 'configured' as const,
    })),
    {
      id: 'pharmcoop', name: PHARMACY_COLLABORATORS.pharmcoop.label,
      description: '협동조합 연합회 서비스. 개별 조합의 가입·활동은 해당 서비스에서 관리합니다.',
      group: 'services', kind: '협동조합 연합회', url: `https://${PHARMACY_COLLABORATORS.pharmcoop.domain}`,
      state: 'federation',
    },
    ...['supplier', 'community', 'kpa-branch', 'lecture', 'funding'].map(key => catalog(key)),
    catalog('neture', {
      name: 'O4O 대표 홈', description: '전체 서비스 탐색과 공통 계정·My Home 진입',
      group: 'spaces', kind: '대표 진입',
    }),
    {
      id: 'store', name: '내 매장', description: '약국 조직에 소속된 경영자와 직원의 공통 업무 공간',
      group: 'spaces', kind: '매장 업무 공간', url: STORE_WORKSPACE_ORIGIN, state: 'configured',
    },
    {
      id: 'platform-admin', name: '전체 관리자', description: '플랫폼 전반 설정과 전체 관리자·서비스 운영 권한 관리',
      group: 'spaces', kind: '플랫폼 관리', url: 'https://admin.neture.co.kr', state: 'configured',
    },
    catalog('cafe24-b2b', {
      group: 'other', kind: '외부 연동', url: new URL('/cafe24', representative).href,
    }),
    {
      id: 'hospital', name: '병원·약품 파일 도구', description: '병원·약품 관련 파일을 정리하는 도구',
      group: 'other', kind: '도구', url: new URL('/hospital', representative).href, state: 'configured',
    },
    {
      id: 'partner', name: 'O4O Partner', description: '준비 중인 서비스의 안내 페이지',
      group: 'other', kind: '준비 중', url: new URL('/services/partner', representative).href, state: 'planned',
    },
  ];
  return entries.map(entry => {
    if (!['pharmacy', 'carepharm', 'megapharm'].includes(entry.id)) return entry;
    const status = businesses.get(entry.id);
    const state: DirectoryState = status === undefined ? 'missing'
      : status === 'active' || status === 'closed' ? status : 'unverified';
    return { ...entry, state };
  });
}
