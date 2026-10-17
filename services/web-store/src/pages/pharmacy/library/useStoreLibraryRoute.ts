import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { storeWorkspaceBase } from '../../../components/store/StoreWorkflowNavigation';
import { useLibraryScope } from './useLibraryScope';

/** A return link belongs to this store and the existing library route only. */
export function useStoreLibraryRoute() {
  const location = useLocation();
  const { scope: key } = useLibraryScope();
  const base = storeWorkspaceBase(location.pathname);
  const fallback = `${base}/library/contents`;
  const libraryRoots = [fallback, `${base}/workspace/studio`];
  const isLibraryPath = (path: string) => libraryRoots.some(root => path === root || path.startsWith(`${root}?`));
  const state = location.state as { libraryReturn?: string; libraryScope?: string } | null;
  const previous = state?.libraryReturn;
  const libraryPath = state?.libraryScope === key && typeof previous === 'string' &&
    isLibraryPath(previous) ? previous : fallback;
  const params = new URLSearchParams(location.search);
  ['create', 'pType', 'pId', 'pName', 'pStore'].forEach(param => params.delete(param));
  const returnPath = libraryRoots.includes(location.pathname) ? `${location.pathname}${params.size ? `?${params}` : ''}` : libraryPath;
  const returnState = useMemo(() => ({ libraryReturn: returnPath, libraryScope: key }), [returnPath, key]);
  return { base, libraryPath, returnState };
}
