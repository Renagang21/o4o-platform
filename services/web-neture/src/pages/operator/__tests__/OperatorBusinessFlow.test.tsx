import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OperatorSemiFranchisePage from '../../../../../../packages/operator-core-ui/src/modules/pharmacy-management/OperatorSemiFranchisePage';
import { neturePharmacyOperatorApi as api, type SemiFranchise } from '../../../../../../packages/operator-core-ui/src/modules/pharmacy-management/api';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const businesses = [
  { key: 'pharmacy', name: '약국 사업', status: 'active', community_key: null },
  { key: 'other', name: '다른 사업', status: 'active', community_key: 'other-forum' },
] as SemiFranchise[];
it.each([false, true])('서비스별 게시판 주소를 사용하며 약국 사업으로 범위를 제한한다 (약국 소비처=%s)', async pharmacy => {
  vi.spyOn(api, 'listAssignedSemiFranchises').mockResolvedValue(businesses);
  vi.spyOn(api, 'listSfMemberships').mockResolvedValue([]);
  render(<MemoryRouter><OperatorSemiFranchisePage businessKey={pharmacy ? 'pharmacy' : undefined}
    forumHref={pharmacy ? () => '/community' : undefined} /></MemoryRouter>);
  expect((await screen.findByRole('link', { name: '참여자 게시판' })).getAttribute('href')).toBe(pharmacy ? '/community' : '/communities/business%3Apharmacy/forum');
  expect(screen.getByRole('heading', { name: '담당 약국 협력사업' })).toBeTruthy();
  expect(screen.queryByRole('option', { name: /다른 사업/ }) !== null).toBe(!pharmacy);
});
