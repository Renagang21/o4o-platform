import { StrictMode, useEffect } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useStoreOperationScope } from '../useStoreOperationScope';
vi.mock('../useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: 'store-a' }) }));
vi.mock('../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => 'store-a' }));
vi.mock('../../lib/serviceContext', () => ({ getActiveServiceKey: () => 'kpa-society' }));
afterEach(cleanup);
it('activates before child request effects on both StrictMode mounts and rejects after real unmount', () => {
  const starts: boolean[] = []; let current = () => false;
  function Child({ isCurrent }: { isCurrent: () => boolean }) { useEffect(() => { starts.push(isCurrent()); }, [isCurrent]); return null; }
  function Parent() { const scope = useStoreOperationScope(); current = scope.isCurrent; return <Child isCurrent={scope.isCurrent} />; }
  const view = render(<StrictMode><Parent /></StrictMode>);
  expect(starts).toEqual([true,true]);
  view.unmount();expect(current()).toBe(false);
});
