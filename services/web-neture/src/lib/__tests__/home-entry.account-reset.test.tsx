import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../apiClient", () => ({ api: { get } }));
import { useHomeEntry } from "../home-entry";
afterEach(cleanup);
beforeEach(() => {
  get.mockReset();
});
it("a new account failure settles in a retryable error instead of leaving the previous account loading", async () => {
  get.mockRejectedValue(new Error("unavailable"));
  const { result, rerender } = renderHook(({ id }) => useHomeEntry(true, id), {
    initialProps: { id: "first" },
  });
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.loading).toBe(false);
  rerender({ id: "second" });
  await waitFor(() => {
    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });
  expect(result.current.data).toBeNull();
});
