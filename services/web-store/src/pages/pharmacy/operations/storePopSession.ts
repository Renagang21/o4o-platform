import type { PopV2Api } from '@o4o/store-ui-core';

/** Keep the existing POP model; a failed save must not export an older document. */
export function createStorePopSession(base: PopV2Api, isCurrent: () => boolean): PopV2Api {
  let writing = false;
  const failedSaves = new Set<string>();
  const assertCurrent = () => {
    if (!isCurrent()) throw new Error('매장이 변경되었습니다. 현재 매장에서 다시 열어 주세요.');
  };
  const read = async <T>(task: () => Promise<T>): Promise<T> => {
    assertCurrent(); const result = await task(); assertCurrent(); return result;
  };
  const write = async <T>(task: () => Promise<T>, saveId?: string): Promise<T> => {
    assertCurrent();
    if (writing) throw new Error('POP 저장·출력이 진행 중입니다.');
    writing = true;
    if (saveId) failedSaves.add(saveId);
    try {
      const result = await read(task);
      if (saveId) failedSaves.delete(saveId);
      return result;
    } finally { writing = false; }
  };
  return {
    list: status => read(() => base.list(status)),
    get: id => read(() => base.get(id)),
    create: input => write(() => base.create(input)),
    update: (id, input) => write(() => base.update(id, input), id),
    duplicate: id => write(() => base.duplicate(id)),
    setArchived: (id, archived) => write(() => base.setArchived(id, archived)),
    render: (id, format) => {
      if (failedSaves.has(id)) return Promise.reject(new Error('변경 내용을 저장하지 못해 출력하지 않았습니다. 저장 후 다시 출력해 주세요.'));
      return write(() => base.render(id, format));
    },
    listContentSources: () => read(() => base.listContentSources()),
    resolveContentSource: (origin, id) => read(() => base.resolveContentSource(origin, id)),
    resolveProductSource: (id, kind) => read(() => base.resolveProductSource(id, kind)),
    listProductOptions: base.listProductOptions ? () => read(() => base.listProductOptions!()) : undefined,
    listQrCodes: () => read(() => base.listQrCodes()),
  };
}
