import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import {
  applyCurrentScreenSet,
  clearCurrentScreenSet,
  type Tablet,
} from "../../../api/tabletDisplays";
import type { TabletOperationToast } from "../tablet/TabletOperationPanels";

/** Both application entry points use the same state update and undo contract. */
export function useTabletScreenApplication(
  tablets: Tablet[],
  setTablets: Dispatch<SetStateAction<Tablet[]>>,
  screenSetIndex: Record<string, { name: string }>,
  setToast: Dispatch<SetStateAction<TabletOperationToast | null>>,
) {
  const busy = useRef(new Set<string>());
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
      update(tabletId, newId);
      setToast({
        type: "success",
        message: `“${cornerName}” 화면을 ‘${newName}’로 바꿨어요.`,
        action: {
          label: "되돌리기",
          onClick: async () => {
            if (busy.current.has(tabletId)) return;
            busy.current.add(tabletId);
            try {
              if (prevId) await applyCurrentScreenSet(tabletId, prevId);
              else await clearCurrentScreenSet(tabletId);
              update(tabletId, prevId);
              setToast({
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
    [update, setToast],
  );
  const handleApplyToTablet = useCallback(
    async (screenSetId: string, tabletId: string) => {
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
        setToast({
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
    [tablets, screenSetIndex, handleSwapApplied, setToast],
  );
  return { handleSwapApplied, handleApplyToTablet };
}
