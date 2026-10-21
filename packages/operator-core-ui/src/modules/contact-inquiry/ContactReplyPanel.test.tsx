import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ContactReplyPanel } from "./ContactReplyPanel";
import type { ContactInquiryApi } from "./types";
afterEach(cleanup);
const client = (status = "sent") =>
  ({
    getReplies: vi.fn(async () => []),
    sendReply: vi.fn(async () => ({ id: "reply", status })),
  }) as unknown as ContactInquiryApi;
it("shows failed delivery and leaves it available for explicit retry", async () => {
  const api = client("failed");
  render(<ContactReplyPanel api={api} serviceKey="supplier" contactId="one" />);
  fireEvent.change(screen.getByLabelText("이메일 답변 내용"), {
    target: { value: "합성 답변" },
  });
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "답변 보내기" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "답변 보내기" }));
  await waitFor(() => expect(api.sendReply).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("답변을 발송했습니다.")).toBeNull();
});
it("blocks resending when the provider result is uncertain", async () => {
  const api = client("sending");
  render(<ContactReplyPanel api={api} serviceKey="supplier" contactId="one" />);
  fireEvent.change(screen.getByLabelText("이메일 답변 내용"), {
    target: { value: "합성 답변" },
  });
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "답변 보내기" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "답변 보내기" }));
  await waitFor(() => expect(api.sendReply).toHaveBeenCalledTimes(1));
  await screen.findByRole("alert");
  expect(
    (screen.getByRole("button", { name: "답변 보내기" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});

it("keeps the draft blocked until history is refreshed after a competing operator reply", async () => {
  const api = client();
  vi.mocked(api.sendReply!).mockRejectedValueOnce({
    response: { data: { error: { code: "REPLY_IN_PROGRESS" } } },
  });
  render(<ContactReplyPanel api={api} serviceKey="supplier" contactId="one" />);
  fireEvent.change(screen.getByLabelText("이메일 답변 내용"), {
    target: { value: "작성 중인 답변" },
  });
  const send = screen.getByRole("button", {
    name: "답변 보내기",
  }) as HTMLButtonElement;
  await waitFor(() => expect(send.disabled).toBe(false));
  fireEvent.click(send);
  await screen.findByText(
    "다른 답변의 발송 결과를 확인 중입니다. 답변 이력을 다시 확인해 주세요.",
  );
  expect(send.disabled).toBe(true);
  expect(
    (screen.getByLabelText("이메일 답변 내용") as HTMLTextAreaElement).value,
  ).toBe("작성 중인 답변");
  fireEvent.click(screen.getByRole("button", { name: "답변 이력 다시 확인" }));
  await waitFor(() => expect(send.disabled).toBe(false));
  expect(api.sendReply).toHaveBeenCalledTimes(1);
});
