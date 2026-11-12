import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MaterialPreparationPanel from "./MaterialPreparationPanel";
const api = vi.hoisted(() => ({ list: vi.fn(), request: vi.fn() }));
vi.mock("@/api/product-material-preparation.api", () => ({
  materialPreparationApi: api,
}));
const page = {
  language: "ko",
  scanned: 1,
  nextCursor: null,
  items: [
    {
      id: "master",
      name: "합성 공통 제품",
      barcode: "123",
      storeCount: 3,
      consultation: "missing",
      standardDescription: "ready",
    },
  ],
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.list.mockResolvedValue(page);
  api.request.mockResolvedValue({ requestText: "선택 자료 조사 요청문" });
});
const open = () =>
  render(
    <MemoryRouter>
      <MaterialPreparationPanel />
    </MemoryRouter>,
  );
it("requires selection and fetches a separate purpose-specific request without approving or generating", async () => {
  open();
  await screen.findByText("합성 공통 제품");
  expect(
    screen.queryByRole("button", { name: "상담자료 조사 요청문 받기" }),
  ).toBeNull();
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  fireEvent.click(
    screen.getByRole("button", { name: "상담자료 조사 요청문 받기" }),
  );
  await waitFor(() =>
    expect(api.request).toHaveBeenCalledWith({
      ids: ["master"],
      language: "ko",
      purpose: "CONSULTATION",
    }),
  );
  await screen.findByDisplayValue("선택 자료 조사 요청문");
});
it("clears stale selection and request text on a language change", async () => {
  open();
  await screen.findByText("합성 공통 제품");
  fireEvent.click(screen.getAllByRole("checkbox")[1]);
  api.list.mockResolvedValue({ ...page, language: "en" });
  fireEvent.change(screen.getByRole("combobox", { name: "자료 언어" }), {
    target: { value: "en" },
  });
  await waitFor(() =>
    expect(api.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ language: "en" }),
    ),
  );
  expect(
    screen.queryByRole("button", { name: "상담자료 조사 요청문 받기" }),
  ).toBeNull();
});
it("keeps continuation visible when a sparse scan returns no preparation candidates", async () => {
  api.list.mockResolvedValue({
    ...page,
    items: [],
    scanned: 250,
    nextCursor: "next",
  });
  open();
  await screen.findByText(/다음 범위를 확인/);
  expect(screen.getByRole("button", { name: "다음 범위" })).not.toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "다음 범위" }));
  await waitFor(() =>
    expect(api.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "next" }),
    ),
  );
});
it("shows a failed query rather than reporting ready material or a zero completion rate", async () => {
  api.list.mockRejectedValue(new Error("unavailable"));
  open();
  await screen.findByRole("alert");
  expect(screen.queryByText("합성 공통 제품")).toBeNull();
});
