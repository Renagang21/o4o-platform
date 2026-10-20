import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { StoreAiPlacementProvider, StoreAiSlot } from "../StoreAiPlacement";
import { StoreAiAssistant } from "../StoreAiAssistant";
const ask = vi.hoisted(() => vi.fn());
vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "owner" }, isAuthenticated: true }),
}));
vi.mock("../../../contexts/StoreContext", () => ({
  useUnifiedStore: () => ({
    organizationId: "A",
    effectiveServiceKey: "kpa-society",
    status: "ready",
  }),
}));
vi.mock("../../../api/storeAi", async (original) => ({
  ...(await original<object>()),
  askStoreAi: ask,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function Fixture() {
  const [dialog, setDialog] = useState(false);
  return (
    <StoreAiPlacementProvider>
      <section aria-label="목록">
        <h1>매장 컨텐츠</h1>
        <StoreAiSlot />
        <button onClick={() => setDialog(true)}>작성</button>
      </section>
      {dialog && (
        <div role="dialog" aria-label="작성">
          <h2>새 안내</h2>
          <StoreAiSlot priority={2} label="안내 작성" />
          <button onClick={() => setDialog(false)}>작성 닫기</button>
        </div>
      )}
      <StoreAiAssistant area="studio" basePath="/store" items={[]} />
    </StoreAiPlacementProvider>
  );
}
it("keeps one input and unsent draft when its surface moves into and out of an editor", () => {
  render(
    <MemoryRouter>
      <Fixture />
    </MemoryRouter>,
  );
  const input = screen.getByLabelText(
    "지금 하고 싶은 일 또는 이어서 답할 내용",
  );
  expect(input.getAttribute("rows")).toBe("1");
  fireEvent.change(input, { target: { value: "계속 작성할 내용" } });
  fireEvent.click(screen.getByRole("button", { name: "작성" }));
  const dialog = screen.getByRole("dialog");
  expect(
    within(dialog).getByRole("button", { name: /내 매장 AI · 안내 작성/ }),
  ).toBeTruthy();
  expect(
    (within(dialog).getByRole("textbox") as HTMLTextAreaElement).value,
  ).toBe("계속 작성할 내용");
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "작성 닫기" }));
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
    "계속 작성할 내용",
  );
  expect(ask).not.toHaveBeenCalled();
});
it("keeps a pending request and later typing across surface changes without issuing another paid call", async () => {
  let resolve!: (value: object) => void;
  ask.mockReturnValue(
    new Promise((yes) => {
      resolve = yes;
    }),
  );
  render(
    <MemoryRouter>
      <Fixture />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "첫 요청" },
  });
  fireEvent.click(screen.getByRole("button", { name: "보내기" }));
  fireEvent.click(screen.getByRole("button", { name: "작성" }));
  fireEvent.change(within(screen.getByRole("dialog")).getByRole("textbox"), {
    target: { value: "다음 입력" },
  });
  fireEvent.click(screen.getByRole("button", { name: "작성 닫기" }));
  await act(async () => resolve({ success: true, answer: "검토할 결과" }));
  expect(screen.getByRole("log").textContent).toContain("검토할 결과");
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
    "다음 입력",
  );
  expect(ask).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
  expect(screen.queryByRole("region", { name: "AI 대화와 옵션" })).toBeNull();
});
