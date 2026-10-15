import { fetchLocalProducts, createLocalProduct, updateLocalProduct, deleteLocalProduct, type LocalProduct, type LocalProductInput } from '../../../api/localProducts';

/** Older consumers await the newest read rather than overwriting the shared view. */
export function latestRead<A, T>(fetcher: (input: A) => Promise<T>) {
  let latest: Promise<T>;
  return async (input: A): Promise<T> => {
    let pending = latest = fetcher(input);
    for (;;) {
      try { const result = await pending; if (pending === latest) return result; }
      catch (error) { if (pending === latest) throw error; }
      pending = latest;
    }
  };
}
function validateProduct(product: LocalProduct, id?: string) {
  if (!product || typeof product.id !== 'string' || !product.id || (id && product.id !== id) || typeof product.name !== 'string')
    throw new Error('제품 저장 결과를 확인하지 못했습니다. 목록을 확인한 뒤 다시 시도해 주세요.');
  return product;
}
export function createLocalProductAdapter(current: () => boolean, busy: (value: boolean) => void) {
  let writing = false;
  const assertOwner = () => { if (!current()) throw new Error('선택한 매장이 변경되었습니다. 다시 열어 주세요.'); };
  const mutate = async <T,>(operation: () => Promise<T>): Promise<T> => {
    assertOwner(); if (writing) throw new Error('다른 제품 작업이 진행 중입니다.');
    writing = true; busy(true);
    try { const result = await operation(); assertOwner(); return result; }
    catch { throw new Error('제품 처리 결과를 확인하지 못했습니다. 목록을 확인한 뒤 다시 시도해 주세요.'); }
    finally { writing = false; if (current()) busy(false); }
  };
  return {
    fetchLocalProducts: latestRead(async (params: Parameters<typeof fetchLocalProducts>[0]) => {
      assertOwner();
      try {
        const result = await fetchLocalProducts(params); assertOwner();
        if (!Array.isArray(result?.items) || !Number.isSafeInteger(result.total) || result.total < 0) throw new Error('Invalid products');
        result.items.forEach(item => validateProduct(item));
        return result;
      } catch { throw new Error('직접 등록 제품을 불러오지 못했습니다. 다시 시도해 주세요.'); }
    }),
    createLocalProduct: (input: LocalProductInput) => mutate(async () => validateProduct(await createLocalProduct(input))),
    updateLocalProduct: (id: string, input: LocalProductInput) => mutate(async () => validateProduct(await updateLocalProduct(id, input), id)),
    deleteLocalProduct: (id: string) => mutate(() => deleteLocalProduct(id)),
  };
}
