import type { ScreenSetBuilderApi } from "@o4o/tablet-screen-set-editor";

/** Keep the existing editor/API contract and reuse a created header after block-save failure. */
export function createScreenSetSession(
  base: ScreenSetBuilderApi,
  current: () => boolean,
): ScreenSetBuilderApi {
  let created: Awaited<ReturnType<ScreenSetBuilderApi["create"]>> | null = null;
  let writing = false;
  const assertCurrent = () => {
    if (!current())
      throw new Error("화면 편집 대상이 변경되었습니다. 다시 열어 주세요.");
  };
  const read = async <T>(operation: () => Promise<T>) => {
    assertCurrent();
    const result = await operation();
    assertCurrent();
    return result;
  };
  const write = async <T>(operation: () => Promise<T>) => {
    assertCurrent();
    if (writing) throw new Error("화면 저장이 진행 중입니다.");
    writing = true;
    try {
      return await read(operation);
    } finally {
      writing = false;
    }
  };
  return {
    create: (input) =>
      write(async () => {
        if (created) return base.update(created.id, input);
        created = await base.create(input);
        return created;
      }),
    update: (id, input) => write(() => base.update(id, input)),
    saveBlocks: (id, blocks) => write(() => base.saveBlocks(id, blocks)),
    preview: (input) => read(() => base.preview(input)),
    searchO4oDescriptions: (input) =>
      read(() => base.searchO4oDescriptions(input)),
    searchStoreContents: (input) => read(() => base.searchStoreContents(input)),
  };
}
