import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { storeWorkspaceBase } from '../../../components/store/StoreWorkflowNavigation';
import { useLibraryScope } from './useLibraryScope';
import { readProductGuidanceReturn } from '../productGuidance/productGuidanceRoute';

/** Keep library links and optional product-origin return links inside the current store/service. */
export function useStoreLibraryRoute() {
  const location = useLocation();
  const { scope: key } = useLibraryScope();
  const base = storeWorkspaceBase(location.pathname);
  const fallback = `${base}/library/contents`;
  const libraryRoots = [fallback, `${base}/workspace/studio`];
  const isLibraryPath = (path: string) => libraryRoots.some(root => path === root || path.startsWith(`${root}?`));
  const state = location.state as { libraryReturn?: string; libraryScope?: string } | null;
  const productReturn = readProductGuidanceReturn(location.state, key, base);
  const previous = state?.libraryReturn;
  const libraryPath = state?.libraryScope === key && typeof previous === 'string' &&
    isLibraryPath(previous) ? previous : fallback;
  const params = new URLSearchParams(location.search);
  ['create', 'pType', 'pId', 'pName', 'pStore'].forEach(param => params.delete(param));
  const returnPath = libraryRoots.includes(location.pathname) ? `${location.pathname}${params.size ? `?${params}` : ''}` : libraryPath;
  const productPath = productReturn?.path, selectedKey = productReturn?.selectedKey;
  const returnState = useMemo(() => ({
    libraryReturn: returnPath, libraryScope: key,
    ...(productPath && selectedKey ? { productReturn: { path: productPath, scope: key, selectedKey } } : {}),
  }), [returnPath, key, productPath, selectedKey]);
  return { base, libraryPath, returnState, productReturn, backPath: productReturn?.path ?? libraryPath };
}
