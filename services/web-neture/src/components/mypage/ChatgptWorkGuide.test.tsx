import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ChatgptWorkGuide from "./ChatgptWorkGuide";

beforeEach(() => {
  vi.stubGlobal("navigator", {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("copies a review-first invoice request without saving or requiring an O4O keyword", async () => {
  render(<ChatgptWorkGuide />);
  fireEvent.click(screen.getByText("ChatGPT에서 O4O 작업하기"));
  fireEvent.click(
    screen.getByRole("button", { name: "거래명세서 확인 예시 복사" }),
  );
  await screen.findByRole("status");
  const value = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0];
  expect(value).toContain("확인 필요");
  expect(value).toContain("아직 저장하지 말고");
  expect(screen.getByText(/필수 명령어는 아니며/)).toBeTruthy();
  expect(screen.getByText(/거래장 원장 반영은 다릅니다/)).toBeTruthy();
});
it("keeps the request visible and offers manual copy when clipboard access fails", async () => {
  vi.mocked(navigator.clipboard.writeText).mockRejectedValue(
    new Error("denied"),
  );
  render(<ChatgptWorkGuide />);
  fireEvent.click(screen.getByText("ChatGPT에서 O4O 작업하기"));
  fireEvent.click(
    screen.getByRole("button", { name: "O4O 자료 읽기 예시 복사" }),
  );
  await screen.findByText(/화면에 보이는 예시 문장을 직접 선택/);
  expect(
    screen.getByText(
      "O4O 내 매장 자료함에서 안내문을 찾아 읽고, 직원이 보기 쉽게 정리해 줘.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/예시를 복사했습니다/)).toBeNull();
});
it("does not let a late clipboard response replace the latest request feedback", async () => {
  let finish!: () => void;
  vi.mocked(navigator.clipboard.writeText).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  render(<ChatgptWorkGuide />);
  fireEvent.click(screen.getByText("ChatGPT에서 O4O 작업하기"));
  fireEvent.click(
    screen.getByRole("button", { name: "O4O 자료 읽기 예시 복사" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "확인한 결과 보관 예시 복사" }),
  );
  await screen.findByText(/확인한 결과 보관 예시를 복사했습니다/);
  finish();
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain(
      "확인한 결과 보관",
    ),
  );
});
