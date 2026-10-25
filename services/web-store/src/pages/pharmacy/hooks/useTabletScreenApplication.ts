import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import {
  applyCurrentScreenSet,
  clearCurrentScreenSet,
  fetchTablets,
  type Tablet,
} from "../../../api/tabletDisplays";
import type { TabletOperationToast } from "../tablet/TabletOperationPanels";

/** Both application entry points use the same state update and undo contract. */
export function useTabletScreenApplication(
  tablets: Tablet[],
  setTablets: Dispatch<SetStateAction<Tablet[]>>,
  screenSetIndex: Record<string, { name: string }>,
  setToast: Dispatch<SetStateAction<TabletOperationToast | null>>,
  isCurrent: () => boolean,
) {
  const busy = useRef(new Set<string>());
  const revisions = useRef(new Map<string, number>());
  const update = useCallback(
    (tabletId: string, screenSetId: string | null) => {
      setTablets((prev) =>
        prev.map((t) =>
          t.id === tabletId ? { ...t, currentScreenSetId: screenSetId } : t,
        ),
      );
    },
    [setTablets],
  );
  const handleSwapApplied = useCallback(
    (
      tabletId: string,
      newId: string,
      prevId: string | null,
      cornerName: string,
      newName: string,
    ) => {
      if (!isCurrent()) return;
      const revision = (revisions.current.get(tabletId) ?? 0) + 1;
      revisions.current.set(tabletId, revision);
      update(tabletId, newId);
      setToast({
        type: "success",
        message: `“${cornerName}” 화면을 ‘${newName}’로 바꿨어요.`,
        action: {
          label: "되돌리기",
          onClick: async () => {
            if (!isCurrent() || busy.current.has(tabletId)) return;
            if (revisions.current.get(tabletId) !== revision) {
              setToast({ type: 'error', message: '이후 화면 변경이 있어 이전 되돌리기를 사용할 수 없습니다. 현재 화면을 다시 확인해 주세요.' });
              return;
            }
            busy.current.add(tabletId);
            try {
              const latest = await fetchTablets();
              if (!isCurrent()) return;
              if (latest.find(item => item.id === tabletId)?.currentScreenSetId !== newId)
                throw new Error('현재 저장된 화면이 변경되었습니다. 위치에서 현재 화면을 확인한 뒤 다시 변경해 주세요.');
              if (prevId) await applyCurrentScreenSet(tabletId, prevId);
              else await clearCurrentScreenSet(tabletId);
              if (!isCurrent()) return;
              revisions.current.set(tabletId, revision + 1);
              update(tabletId, prevId);
              if (isCurrent()) setToast({
                type: "success",
                message: "이전 화면으로 되돌렸어요.",
              });
            } catch (error) {
              setToast({
                type: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "되돌리지 못했습니다.",
              });
            } finally {
              busy.current.delete(tabletId);
            }
          },
        },
      });
    },
    [update, setToast, isCurrent],
  );
  const handleApplyToTablet = useCallback(
    async (screenSetId: string, tabletId: string) => {
      if (!isCurrent()) throw new Error('매장 문맥이 변경되었습니다. 현재 매장에서 다시 선택해 주세요.');
      if (busy.current.has(tabletId))
        throw new Error(
          "이 태블릿의 변경을 처리 중입니다. 잠시 후 다시 시도해 주세요.",
        );
      const target = tablets.find((t) => t.id === tabletId);
      const prevId = target?.currentScreenSetId ?? null;
      busy.current.add(tabletId);
      try {
        await applyCurrentScreenSet(tabletId, screenSetId);
        handleSwapApplied(
          tabletId,
          screenSetId,
          prevId,
          target?.location?.trim() || target?.name || "태블릿",
          screenSetIndex[screenSetId]?.name || "선택한 콘텐츠",
        );
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (isCurrent()) setToast({
          type: "error",
          message:
            code === "SCREEN_SET_NOT_ACTIVE"
              ? "이 콘텐츠는 지금 적용할 수 없는 상태입니다. 콘텐츠를 열어 저장한 뒤 다시 시도해 주세요."
              : error instanceof Error
                ? error.message
                : "태블릿에 적용하지 못했습니다.",
        });
        throw error;
      } finally {
        busy.current.delete(tabletId);
      }
    },
    [tablets, screenSetIndex, handleSwapApplied, setToast, isCurrent],
  );
  return { handleSwapApplied, handleApplyToTablet };
}
