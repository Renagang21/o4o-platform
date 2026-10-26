import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PublishedAssetItem } from "../api/assetSnapshot";
import { usePublishedAsset } from "./usePublishedAsset";

const asset = {
  id: "snapshot",
  title: "public content",
} as unknown as PublishedAssetItem;

describe("public/print asset loading compatibility", () => {
  it("does not issue a request with a missing organization or snapshot", () => {
    const load = vi.fn();
    const { result } = renderHook(() =>
      usePublishedAsset(load, "snapshot", null),
    );
    expect(load).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      loading: false,
      error: "필수 파라미터가 누락되었습니다",
      asset: null,
    });
  });
  it("passes both identifiers and exposes the published response", async () => {
    const load = vi.fn().mockResolvedValue({ success: true, data: asset });
    const { result } = renderHook(() =>
      usePublishedAsset(load, "snapshot", "org"),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(load).toHaveBeenCalledWith("org", "snapshot");
    expect(result.current).toEqual({ loading: false, error: null, asset });
  });
  it.each([false, true])(
    "preserves the failure message for a rejected request=%s",
    async (rejected) => {
      const load = rejected
        ? vi.fn().mockRejectedValue(new Error("network"))
        : vi.fn().mockResolvedValue({ success: false });
      const { result } = renderHook(() =>
        usePublishedAsset(load, "snapshot", "org"),
      );
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe(
        rejected ? "콘텐츠를 불러올 수 없습니다" : "콘텐츠를 찾을 수 없습니다",
      );
      expect(result.current.asset).toBeNull();
    },
  );
  it.each([false, true])(
    "retains the view-specific loading reset flag=%s",
    async (reset) => {
      let resolveNext!: (value: {
        success: boolean;
        data: PublishedAssetItem;
      }) => void;
      const load = vi
        .fn()
        .mockResolvedValueOnce({ success: true, data: asset })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveNext = resolve;
            }),
        );
      const { result, rerender } = renderHook(
        ({ id }) => usePublishedAsset(load, id, "org", reset),
        { initialProps: { id: "first" } },
      );
      await waitFor(() => expect(result.current.loading).toBe(false));
      rerender({ id: "second" });
      expect(result.current.loading).toBe(reset);
      await act(async () => resolveNext({ success: true, data: asset }));
      expect(result.current.loading).toBe(false);
      expect(load).toHaveBeenLastCalledWith("org", "second");
    },
  );
});
